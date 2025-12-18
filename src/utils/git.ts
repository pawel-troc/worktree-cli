import { $ } from "bun";

export interface Worktree {
  path: string;
  head: string;
  branch: string | null;
  isBare: boolean;
  isDetached: boolean;
  isLocked: boolean;
  lockReason?: string;
}

export interface Branch {
  name: string;
  isCurrent: boolean;
  isRemote: boolean;
}

export async function isGitRepository(): Promise<boolean> {
  try {
    await $`git rev-parse --is-inside-work-tree`.quiet();
    return true;
  } catch {
    return false;
  }
}

export async function getRepoName(): Promise<string> {
  const result = await $`git rev-parse --show-toplevel`.text();
  const repoPath = result.trim();
  return repoPath.split("/").pop() || "unknown";
}

export async function getWorktrees(): Promise<Worktree[]> {
  const result = await $`git worktree list --porcelain`.text();
  const worktrees: Worktree[] = [];
  let current: Partial<Worktree> = {};

  for (const line of result.split("\n")) {
    if (line.startsWith("worktree ")) {
      if (current.path) {
        worktrees.push(current as Worktree);
      }
      current = {
        path: line.substring(9),
        isBare: false,
        isDetached: false,
        isLocked: false,
      };
    } else if (line.startsWith("HEAD ")) {
      current.head = line.substring(5);
    } else if (line.startsWith("branch ")) {
      current.branch = line.substring(7).replace("refs/heads/", "");
    } else if (line === "bare") {
      current.isBare = true;
    } else if (line === "detached") {
      current.isDetached = true;
    } else if (line.startsWith("locked")) {
      current.isLocked = true;
      if (line.length > 7) {
        current.lockReason = line.substring(7);
      }
    }
  }

  if (current.path) {
    worktrees.push(current as Worktree);
  }

  return worktrees;
}

export async function getBranches(): Promise<Branch[]> {
  const format = "%(refname:short)%09%(HEAD)";
  const result = await $`git branch -a --format=${format}`.text();
  const branches: Branch[] = [];

  for (const line of result.trim().split("\n")) {
    if (!line) continue;
    const [name, head] = line.split("\t");
    if (!name) continue;

    const isRemote = name.startsWith("remotes/") || name.startsWith("origin/");
    branches.push({
      name: name.replace(/^remotes\//, ""),
      isCurrent: head === "*",
      isRemote,
    });
  }

  return branches;
}

export interface CreateWorktreeOptions {
  path: string;
  branch?: string;
  newBranch?: string;
}

async function branchExists(branchName: string): Promise<boolean> {
  try {
    await $`git rev-parse --verify refs/heads/${branchName}`.quiet();
    return true;
  } catch {
    return false;
  }
}

async function createBranch(branchName: string): Promise<void> {
  try {
    await $`git branch ${branchName}`.quiet();
  } catch (e) {
    if (e instanceof Error && "stderr" in e) {
      const stderr = (e as { stderr: Buffer }).stderr.toString().trim();
      throw new Error(stderr || `Failed to create branch ${branchName}`);
    }
    throw e;
  }
}

async function deleteBranch(branchName: string): Promise<void> {
  try {
    await $`git branch -D ${branchName}`.quiet();
  } catch {
    // Ignore errors when deleting branch during rollback
  }
}

export async function createWorktree(options: CreateWorktreeOptions): Promise<string> {
  const { path, branch, newBranch } = options;

  try {
    if (newBranch) {
      // Check if branch already exists
      if (await branchExists(newBranch)) {
        throw new Error(`A branch named '${newBranch}' already exists.`);
      }

      // Create the branch first
      await createBranch(newBranch);

      // Try to create the worktree
      try {
        await $`git worktree add ${path} ${newBranch}`.quiet();
      } catch (e) {
        // Rollback: delete the branch we just created
        await deleteBranch(newBranch);
        throw e;
      }
    } else if (branch) {
      await $`git worktree add ${path} ${branch}`.quiet();
    } else {
      throw new Error("Must specify branch or newBranch");
    }
  } catch (e) {
    if (e instanceof Error && "stderr" in e) {
      const stderr = (e as { stderr: Buffer }).stderr.toString().trim();
      throw new Error(stderr || "Failed to create worktree");
    }
    throw e;
  }

  return path;
}

export async function removeWorktree(path: string, force = false): Promise<void> {
  try {
    if (force) {
      await $`git worktree remove --force ${path}`.quiet();
    } else {
      await $`git worktree remove ${path}`.quiet();
    }
  } catch (e) {
    if (e instanceof Error && "stderr" in e) {
      const stderr = (e as { stderr: Buffer }).stderr.toString().trim();
      throw new Error(stderr || "Failed to remove worktree");
    }
    throw e;
  }
}

export async function pruneWorktrees(): Promise<void> {
  await $`git worktree prune`.quiet();
}

export async function removeBranch(branchName: string): Promise<void> {
  try {
    await $`git branch -D ${branchName}`.quiet();
  } catch (e) {
    if (e instanceof Error && "stderr" in e) {
      const stderr = (e as { stderr: Buffer }).stderr.toString().trim();
      throw new Error(stderr || `Failed to delete branch ${branchName}`);
    }
    throw e;
  }
}

export async function getRepoRoot(): Promise<string> {
  const result = await $`git rev-parse --show-toplevel`.text();
  return result.trim();
}

export async function copyFilesToWorktree(
  targetDir: string,
  patterns: string[]
): Promise<string[]> {
  if (patterns.length === 0) {
    return [];
  }

  const { Glob } = await import("bun");
  const fs = await import("fs/promises");
  const path = await import("path");

  const sourceDir = await getRepoRoot();
  const copiedFiles: string[] = [];

  for (const pattern of patterns) {
    const glob = new Glob(pattern);

    for await (const file of glob.scan({ cwd: sourceDir, dot: true })) {
      const sourcePath = path.join(sourceDir, file);
      const targetPath = path.join(targetDir, file);

      try {
        // Ensure target directory exists
        const targetFileDir = path.dirname(targetPath);
        await fs.mkdir(targetFileDir, { recursive: true });

        // Copy the file
        await fs.copyFile(sourcePath, targetPath);
        copiedFiles.push(file);
      } catch {
        // Skip files that can't be copied
      }
    }
  }

  return copiedFiles;
}
