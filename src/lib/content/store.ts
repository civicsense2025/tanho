import { readFile, writeFile, rename, unlink, mkdir } from "fs/promises";
import path from "path";
import { assertSafeSlug } from "./slug";
import { writeFileToGithub, readFileFromGithub, deleteFileFromGithub, triggerDeployHook } from "./github";

// Statically scoped to content/ so bundlers can trace this file tree instead
// of tracing the whole project (an unscoped process.cwd() + dynamic path.join
// makes Turbopack assume any file anywhere might be read).
const CONTENT_ROOT = path.join(process.cwd(), "content");
const PROJECTS_ROOT = path.join(CONTENT_ROOT, "projects");
const PAGES_ROOT = path.join(CONTENT_ROOT, "pages");
const POSTS_ROOT = path.join(CONTENT_ROOT, "posts");

/** Vercel's serverless filesystem is read-only outside /tmp in production, so
 * writes there go through the GitHub Contents API instead of fs/promises.
 * Reads always try the local/bundled filesystem first, since content/*.mdx
 * ships with the deployment. */
function isWritableFsEnvironment(): boolean {
  return process.env.CONTENT_PROVIDER === "fs" || process.env.NODE_ENV !== "production";
}

interface ContentTarget {
  /** Absolute local path, statically scoped under content/. */
  localPath: string;
  /** Path relative to the repo root, as used by the GitHub Contents API. */
  repoPath: string;
}

function projectMdxTarget(slug: string): ContentTarget {
  assertSafeSlug(slug);
  return { localPath: path.join(PROJECTS_ROOT, `${slug}.mdx`), repoPath: `content/projects/${slug}.mdx` };
}

function projectBlocksTarget(slug: string): ContentTarget {
  assertSafeSlug(slug);
  return { localPath: path.join(PROJECTS_ROOT, `${slug}.blocks.json`), repoPath: `content/projects/${slug}.blocks.json` };
}

function pageBlocksTarget(slug: string): ContentTarget {
  assertSafeSlug(slug);
  return { localPath: path.join(PAGES_ROOT, `${slug}.json`), repoPath: `content/pages/${slug}.json` };
}

function postMdxTarget(slug: string): ContentTarget {
  assertSafeSlug(slug);
  return { localPath: path.join(POSTS_ROOT, `${slug}.mdx`), repoPath: `content/posts/${slug}.mdx` };
}

async function readLocal(localPath: string): Promise<string | undefined> {
  try {
    return await readFile(localPath, "utf-8");
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return undefined;
    throw err;
  }
}

async function writeLocal(localPath: string, content: string): Promise<void> {
  await mkdir(path.dirname(localPath), { recursive: true });
  await writeFile(localPath, content, "utf-8");
}

async function write(target: ContentTarget, content: string, commitMessage: string): Promise<void> {
  if (isWritableFsEnvironment()) {
    await writeLocal(target.localPath, content);
    return;
  }
  await writeFileToGithub(target.repoPath, content, commitMessage);
  await triggerDeployHook();
}

async function read(target: ContentTarget): Promise<string | undefined> {
  const local = await readLocal(target.localPath);
  if (local !== undefined) return local;
  if (isWritableFsEnvironment()) return undefined;
  return readFileFromGithub(target.repoPath);
}

export async function readProjectMdx(slug: string): Promise<string | undefined> {
  return read(projectMdxTarget(slug));
}

export async function writeProjectMdx(slug: string, content: string): Promise<void> {
  const target = projectMdxTarget(slug);
  await write(target, content, `content: update ${slug}.mdx`);
}

export async function renameProjectMdx(oldSlug: string, newSlug: string): Promise<void> {
  const oldTarget = projectMdxTarget(oldSlug);
  const newTarget = projectMdxTarget(newSlug);
  if (isWritableFsEnvironment()) {
    try {
      await rename(oldTarget.localPath, newTarget.localPath);
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
    }
    return;
  }
  const content = await readFileFromGithub(oldTarget.repoPath);
  if (content === undefined) return;
  await writeFileToGithub(newTarget.repoPath, content, `content: rename ${oldSlug}.mdx -> ${newSlug}.mdx`);
  await deleteFileFromGithub(oldTarget.repoPath, `content: remove ${oldSlug}.mdx (renamed to ${newSlug}.mdx)`);
  await triggerDeployHook();
}

export async function deleteProjectMdx(slug: string): Promise<void> {
  const target = projectMdxTarget(slug);
  if (isWritableFsEnvironment()) {
    try {
      await unlink(target.localPath);
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
    }
    return;
  }
  await deleteFileFromGithub(target.repoPath, `content: remove ${slug}.mdx`);
  await triggerDeployHook();
}

export async function readProjectBlocks(slug: string): Promise<string | undefined> {
  return read(projectBlocksTarget(slug));
}

export async function writeProjectBlocks(slug: string, json: string): Promise<void> {
  const target = projectBlocksTarget(slug);
  await write(target, json, `content: update ${slug}.blocks.json`);
}

export async function readPostMdx(slug: string): Promise<string | undefined> {
  return read(postMdxTarget(slug));
}

export async function writePostMdx(slug: string, content: string): Promise<void> {
  await write(postMdxTarget(slug), content, `content: update posts/${slug}.mdx`);
}

export async function renamePostMdx(oldSlug: string, newSlug: string): Promise<void> {
  const oldTarget = postMdxTarget(oldSlug);
  const newTarget = postMdxTarget(newSlug);
  if (isWritableFsEnvironment()) {
    try {
      await rename(oldTarget.localPath, newTarget.localPath);
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
    }
    return;
  }
  const content = await readFileFromGithub(oldTarget.repoPath);
  if (content === undefined) return;
  await writeFileToGithub(newTarget.repoPath, content, `content: rename posts/${oldSlug}.mdx -> ${newSlug}.mdx`);
  await deleteFileFromGithub(oldTarget.repoPath, `content: remove posts/${oldSlug}.mdx (renamed)`);
  await triggerDeployHook();
}

export async function deletePostMdx(slug: string): Promise<void> {
  const target = postMdxTarget(slug);
  if (isWritableFsEnvironment()) {
    try {
      await unlink(target.localPath);
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
    }
    return;
  }
  await deleteFileFromGithub(target.repoPath, `content: remove posts/${slug}.mdx`);
  await triggerDeployHook();
}

export async function readPageBlocks(slug: string): Promise<string | undefined> {
  return read(pageBlocksTarget(slug));
}

export async function writePageBlocks(slug: string, json: string): Promise<void> {
  const target = pageBlocksTarget(slug);
  await write(target, json, `content: update pages/${slug}.json`);
}

export { CONTENT_ROOT };
