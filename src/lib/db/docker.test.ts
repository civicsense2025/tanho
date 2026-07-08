import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const REPO_ROOT = process.cwd();

function readFile(rel: string): string {
  const abs = resolve(REPO_ROOT, rel);
  if (!existsSync(abs)) {
    throw new Error(`Expected file not found: ${rel}`);
  }
  return readFileSync(abs, "utf8");
}

describe("Dockerfile", () => {
  const dockerfile = readFile("Dockerfile");

  it("uses multi-stage build (deps, builder, runner)", () => {
    expect(dockerfile).toMatch(/FROM node:22-alpine AS deps/);
    expect(dockerfile).toMatch(/FROM node:22-alpine AS builder/);
    expect(dockerfile).toMatch(/FROM node:22-alpine AS runner/);
  });

  it("copies drizzle migrations into the production image", () => {
    expect(dockerfile).toMatch(/COPY.*drizzle.*\.\/drizzle/);
  });

  it("creates and owns the /app/data directory for SQLite + uploads", () => {
    expect(dockerfile).toMatch(/mkdir.*data\/uploads/);
    expect(dockerfile).toMatch(/chown.*nextjs:nodejs.*\/app\/data/);
  });

  it("exposes port 3000 and starts next", () => {
    expect(dockerfile).toMatch(/EXPOSE 3000/);
    expect(dockerfile).toMatch(/next.*start/);
  });

  it("runs as non-root user (nextjs)", () => {
    expect(dockerfile).toMatch(/USER nextjs/);
  });

  it("disables Next.js telemetry", () => {
    expect(dockerfile).toMatch(/NEXT_TELEMETRY_DISABLED=1/);
  });
});

describe("docker-compose.yml", () => {
  const compose = readFile("docker-compose.yml");

  it("defines an app service and a caddy reverse proxy", () => {
    expect(compose).toMatch(/app:/);
    expect(compose).toMatch(/caddy:/);
    expect(compose).toMatch(/caddy:2-alpine/);
  });

  it("mounts ./data to /app/data for persistent SQLite + uploads", () => {
    expect(compose).toMatch(/\.\/data:\/app\/data/);
  });

  it("uses SQLite by default (DATABASE_URL=file:/app/data/site.db)", () => {
    expect(compose).toMatch(/DATABASE_URL=file:\/app\/data\/site\.db/);
  });

  it("requires APP_ENCRYPTION_KEY from environment", () => {
    expect(compose).toMatch(/APP_ENCRYPTION_KEY/);
  });

  it("caddy listens on ports 80 and 443", () => {
    expect(compose).toMatch(/"80:80"/);
    expect(compose).toMatch(/"443:443"/);
  });

  it("caddy proxies from the domain to app:3000", () => {
    expect(compose).toMatch(/reverse-proxy/);
    expect(compose).toMatch(/app:3000/);
  });

  it("caddy has persistent volumes for certs + config", () => {
    expect(compose).toMatch(/caddy_data/);
    expect(compose).toMatch(/caddy_config/);
  });

  it("app depends on nothing external and restarts unless stopped", () => {
    expect(compose).toMatch(/restart: unless-stopped/);
  });
});
