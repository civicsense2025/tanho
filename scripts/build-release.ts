/**
 * build-release.ts — builds, signs, and publishes a platform release to the Lamina Hub.
 *
 * This is the vendor-side (template repo) half of the update-delivery contract. The
 * customer-side halves are `lamina` (verifies + 3-way merges) and the hub
 * (stores + gates downloads). This script is invoked by `.github/workflows/release.yml`
 * on a version tag, but it also runs locally for testing (see USAGE below).
 *
 * WHAT IT DOES
 *   1. Resolves the version (from --version, the git tag, or package.json) and the
 *      release commit (baseCommit = the exact SHA being packaged).
 *   2. Packages the repo's *tracked* files (`git archive`, so .gitignore is honored
 *      and node_modules/.next/secrets never ship) into a ZIP with files at the root.
 *   3. Bakes `.lamina/version.json` = { version, baseCommit, releasedAt } INTO
 *      the ZIP. The CLI's trust core reads this signed file to block downgrade/rollback
 *      and to assert the delivered version matches what the hub claimed. A release
 *      missing it is rejected by the CLI (verify-version.ts) — so this step is mandatory.
 *   4. Computes SHA-256 (hex) and an Ed25519 signature over the FINAL ZIP bytes (i.e.
 *      after version.json is baked in). Signing must mirror the CLI's verifier exactly:
 *      the CLI does `crypto.verify(null, zipBytes, spkiPublicKey, sig)`, so we sign the
 *      same bytes with the matching private key. Sign LAST, over the bytes that ship.
 *   5. Publishes to the hub in two steps (the exact contract the hub expects):
 *        POST /api/releases/assets   multipart field "asset"  -> { assetKey }
 *        POST /api/releases          JSON metadata + assetKey  -> { version, releasedAt }
 *      Both require `Authorization: Bearer $HUB_ADMIN_TOKEN`.
 *
 * SECURITY
 *   - The private key (ED25519_PRIVATE_KEY) exists ONLY in CI secrets. Never commit it.
 *   - A fully compromised hub still cannot forge a release: it lacks this private key,
 *     so the CLI's signature check fails and the update is refused.
 *   - This script sends the built artifact to the hub; it never sends customer data
 *     (there is none — this is the pristine template).
 *
 * USAGE
 *   # Dry run — build + sign locally, write the ZIP to ./dist-release/, skip publish:
 *   npx tsx scripts/build-release.ts --version 0.2.0 --dry-run
 *
 *   # Full publish (what CI does):
 *   HUB_URL=https://hub.lamina.com \
 *   HUB_ADMIN_TOKEN=... \
 *   ED25519_PRIVATE_KEY="$(cat lamina-priv.pem)" \
 *   npx tsx scripts/build-release.ts --version 0.2.0
 *
 * ENV
 *   HUB_URL              Hub base URL (default https://hub.lamina.com).
 *   HUB_ADMIN_TOKEN      Bearer token authorizing release publishing (required unless --dry-run).
 *   ED25519_PRIVATE_KEY  PEM (or base64 DER, PKCS#8) Ed25519 private key (required unless --unsigned).
 *   ED25519_PRIVATE_KEY_DER_B64  Alternative to the above: base64-encoded PKCS#8 DER.
 */

import { createHash, createPrivateKey, sign as cryptoSign, type KeyObject } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const ASSET_UPLOAD_MAX_MS = 120_000; // mirror the hub route's maxDuration (assets/route.ts)

interface Args {
  version?: string;
  baseCommit?: string;
  dryRun: boolean;
  unsigned: boolean;
}

function parseArgs(argv: string[]): Args {
  const a: Args = { dryRun: false, unsigned: false };
  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--dry-run") a.dryRun = true;
    else if (arg === "--unsigned") a.unsigned = true;
    else if (arg === "--version") a.version = argv[++i];
    else if (arg === "--base-commit") a.baseCommit = argv[++i];
    else if (arg.startsWith("--version=")) a.version = arg.slice("--version=".length);
    else if (arg.startsWith("--base-commit=")) a.baseCommit = arg.slice("--base-commit=".length);
  }
  return a;
}

function git(...args: string[]): string {
  return execFileSync("git", args, { encoding: "utf-8" }).trim();
}

function die(msg: string): never {
  console.error(`\n✗ ${msg}`);
  process.exit(1);
}

/** version, without a leading "v". Priority: --version > GITHUB_REF tag > package.json. */
function resolveVersion(a: Args): string {
  if (a.version) return a.version.replace(/^v/, "");
  const ref = process.env.GITHUB_REF ?? "";
  const m = ref.match(/^refs\/tags\/v?(.+)$/);
  if (m) return m[1];
  const pkg = JSON.parse(readFileSync(resolve("package.json"), "utf-8")) as { version?: string };
  if (pkg.version) return pkg.version;
  die("Could not resolve a version. Pass --version, push a v* tag, or set package.json version.");
}

/** Loads the Ed25519 private key from PEM or base64-DER (PKCS#8). */
function loadPrivateKey(): KeyObject {
  const pem = process.env.ED25519_PRIVATE_KEY;
  if (pem && pem.includes("BEGIN")) {
    return createPrivateKey({ key: pem, format: "pem" });
  }
  const derB64 = process.env.ED25519_PRIVATE_KEY_DER_B64 ?? (pem && !pem.includes("BEGIN") ? pem : undefined);
  if (derB64) {
    return createPrivateKey({ key: Buffer.from(derB64, "base64"), format: "der", type: "pkcs8" });
  }
  die("No signing key. Set ED25519_PRIVATE_KEY (PEM) or ED25519_PRIVATE_KEY_DER_B64 (base64 PKCS#8 DER), or pass --unsigned for a dry run.");
}

/**
 * Builds the release ZIP with tracked files at the root, then bakes
 * .lamina/version.json into it. Returns the final ZIP bytes.
 *
 * Uses `git archive` for the tracked-file snapshot (honors .gitignore, deterministic),
 * then re-opens the archive with the platform's `sanitize-html`-free path — actually we
 * use the `zip` CLI to add the baked file, which is present on GitHub runners and macOS.
 */
function buildZip(version: string, baseCommit: string, releasedAt: string): Buffer {
  const work = mkdtempSync(join(tmpdir(), "lamina-release-"));
  const zipPath = join(work, `lamina-${version}.zip`);
  try {
    // 1. Snapshot tracked files at baseCommit, no path prefix → files land at ZIP root.
    //    `git archive` output is the base ZIP; we then add the baked version.json.
    git("archive", "--format=zip", `--output=${zipPath}`, baseCommit);

    // 2. Bake .lamina/version.json into the SAME zip so it's covered by the
    //    signature. `zip -j` would junk paths; we need the nested path, so stage it.
    const stageDir = join(work, "stage");
    mkdirSync(join(stageDir, ".lamina"), { recursive: true });
    const versionJson = JSON.stringify({ version, baseCommit, releasedAt }, null, 2) + "\n";
    writeFileSync(join(stageDir, ".lamina", "version.json"), versionJson);
    // Add to the existing archive, preserving the .lamina/ path.
    execFileSync("zip", ["-q", zipPath, join(".lamina", "version.json")], { cwd: stageDir });

    return readFileSync(zipPath);
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
}

async function publishAsset(hubUrl: string, token: string, filename: string, zip: Buffer): Promise<string> {
  const form = new FormData();
  form.append("asset", new Blob([new Uint8Array(zip)]), filename);
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ASSET_UPLOAD_MAX_MS);
  try {
    const res = await fetch(`${hubUrl}/api/releases/assets`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: form,
      signal: ctrl.signal,
    });
    if (!res.ok) die(`Asset upload failed: HTTP ${res.status} ${await res.text()}`);
    const body = (await res.json()) as { assetKey?: string };
    if (!body.assetKey) die("Asset upload succeeded but returned no assetKey.");
    return body.assetKey;
  } finally {
    clearTimeout(t);
  }
}

async function publishMetadata(
  hubUrl: string,
  token: string,
  meta: {
    version: string;
    baseCommit: string;
    assetFilename: string;
    checksum: string;
    signatureB64: string | null;
    assetKey: string;
    releasedAt: string;
  },
): Promise<void> {
  const res = await fetch(`${hubUrl}/api/releases`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(meta),
  });
  if (!res.ok) die(`Release publish failed: HTTP ${res.status} ${await res.text()}`);
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv);
  if (args.unsigned && !args.dryRun) {
    die("--unsigned may only be combined with --dry-run — publishing an unsigned release to the hub is not allowed.");
  }
  const hubUrl = (process.env.HUB_URL ?? "https://hub.lamina.com").replace(/\/$/, "");
  const version = resolveVersion(args);
  const baseCommit = args.baseCommit ?? git("rev-parse", "HEAD");
  const releasedAt = new Date().toISOString();
  const assetFilename = `lamina-${version}.zip`;

  console.log(`Building release v${version}`);
  console.log(`  baseCommit: ${baseCommit}`);
  console.log(`  hub:        ${hubUrl}`);

  const zip = buildZip(version, baseCommit, releasedAt);
  const checksum = createHash("sha256").update(zip).digest("hex");
  console.log(`  size:       ${(zip.length / 1024).toFixed(0)} KiB`);
  console.log(`  checksum:   ${checksum}`);

  let signatureB64: string | null = null;
  if (args.unsigned) {
    console.warn("  ⚠ --unsigned: skipping Ed25519 signature (the CLI will REFUSE this release unless LAMINA_DEV_UNSAFE=1).");
  } else {
    const key = loadPrivateKey();
    // Ed25519: the algorithm arg must be null (matches the CLI's verify(null, ...)).
    signatureB64 = cryptoSign(null, zip, key).toString("base64");
    console.log(`  signature:  ${signatureB64.slice(0, 24)}… (Ed25519)`);
  }

  if (args.dryRun) {
    const out = resolve("dist-release");
    mkdirSync(out, { recursive: true });
    writeFileSync(join(out, assetFilename), zip);
    writeFileSync(
      join(out, "release-metadata.json"),
      JSON.stringify({ version, baseCommit, assetFilename, checksum, signatureB64, releasedAt }, null, 2),
    );
    console.log(`\n✓ Dry run complete. Artifact + metadata written to ${out}/ (not published).`);
    return;
  }

  const token = process.env.HUB_ADMIN_TOKEN;
  if (!token) die("HUB_ADMIN_TOKEN is required to publish (or pass --dry-run).");

  console.log("Publishing → step 1/2: uploading asset…");
  const assetKey = await publishAsset(hubUrl, token, assetFilename, zip);
  console.log(`  assetKey: ${assetKey}`);

  console.log("Publishing → step 2/2: posting metadata…");
  await publishMetadata(hubUrl, token, { version, baseCommit, assetFilename, checksum, signatureB64, assetKey, releasedAt });

  console.log(`\n✓ Published v${version} to ${hubUrl}`);
}

main().catch((err) => die((err as Error).message));
