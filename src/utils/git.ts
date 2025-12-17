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
  const result = await $`git branch -a --format=%(refname:short)%09%(HEAD)`.text();
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
  commit?: string;
}

export async function createWorktree(options: CreateWorktreeOptions): Promise<void> {
  const { path, branch, newBranch, commit } = options;

  if (newBranch) {
    await $`git worktree add -b ${newBranch} ${path} ${commit || "HEAD"}`;
  } else if (branch) {
    await $`git worktree add ${path} ${branch}`;
  } else if (commit) {
    await $`git worktree add --detach ${path} ${commit}`;
  } else {
    throw new Error("Must specify branch, newBranch, or commit");
  }
}

export async function removeWorktree(path: string, force = false): Promise<void> {
  if (force) {
    await $`git worktree remove --force ${path}`;
  } else {
    await $`git worktree remove ${path}`;
  }
}

export async function pruneWorktrees(): Promise<void> {
  await $`git worktree prune`;
}
