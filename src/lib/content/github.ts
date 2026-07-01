const API_BASE = "https://api.github.com";

interface GithubConfig {
  token: string;
  repo: string; // "owner/name"
  branch: string;
}

function getConfig(): GithubConfig {
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO;
  const branch = process.env.GITHUB_BRANCH || "main";
  if (!token || !repo) throw new Error("GITHUB_TOKEN and GITHUB_REPO must be set to write content in production");
  return { token, repo, branch };
}

async function githubRequest(path: string, init: RequestInit): Promise<Response> {
  const { token } = getConfig();
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      ...init.headers,
    },
  });
  return res;
}

async function getFileSha(path: string): Promise<string | undefined> {
  const { repo, branch } = getConfig();
  const res = await githubRequest(`/repos/${repo}/contents/${path}?ref=${branch}`, { method: "GET" });
  if (res.status === 404) return undefined;
  if (!res.ok) throw new Error(`GitHub getFileSha failed for ${path}: ${res.status} ${await res.text()}`);
  const data = (await res.json()) as { sha: string };
  return data.sha;
}

/** Creates or updates a file in the configured repo/branch via the Contents API. */
export async function writeFileToGithub(path: string, content: string, message: string): Promise<void> {
  const { repo, branch } = getConfig();
  const sha = await getFileSha(path);
  const res = await githubRequest(`/repos/${repo}/contents/${path}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message,
      content: Buffer.from(content, "utf-8").toString("base64"),
      branch,
      ...(sha ? { sha } : {}),
    }),
  });
  if (!res.ok) throw new Error(`GitHub write failed for ${path}: ${res.status} ${await res.text()}`);
}

export async function readFileFromGithub(path: string): Promise<string | undefined> {
  const { repo, branch } = getConfig();
  const res = await githubRequest(`/repos/${repo}/contents/${path}?ref=${branch}`, { method: "GET" });
  if (res.status === 404) return undefined;
  if (!res.ok) throw new Error(`GitHub read failed for ${path}: ${res.status} ${await res.text()}`);
  const data = (await res.json()) as { content: string; encoding: string };
  return Buffer.from(data.content, data.encoding as BufferEncoding).toString("utf-8");
}

export async function deleteFileFromGithub(path: string, message: string): Promise<void> {
  const sha = await getFileSha(path);
  if (!sha) return;
  const { repo, branch } = getConfig();
  const res = await githubRequest(`/repos/${repo}/contents/${path}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, sha, branch }),
  });
  if (!res.ok) throw new Error(`GitHub delete failed for ${path}: ${res.status} ${await res.text()}`);
}

export async function triggerDeployHook(): Promise<void> {
  const url = process.env.VERCEL_DEPLOY_HOOK_URL;
  if (!url) return;
  const res = await fetch(url, { method: "POST" });
  if (!res.ok) throw new Error(`Deploy hook trigger failed: ${res.status}`);
}
