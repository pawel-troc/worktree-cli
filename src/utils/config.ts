import { homedir } from "os";
import { join } from "path";
import { createHash } from "crypto";
import { getRepoName } from "./git.ts";

const CONFIG_DIR = join(homedir(), ".worktree-cli");

function getRepoId(repoRoot: string): string {
  const name = repoRoot.split("/").pop() || "unknown";
  const hash = createHash("md5").update(repoRoot).digest("hex").slice(0, 8);
  return `${name}-${hash}`;
}

function getRepoConfigDir(repoRoot: string): string {
  return join(CONFIG_DIR, "repos", getRepoId(repoRoot));
}

function getRepoConfigFile(repoRoot: string): string {
  return join(getRepoConfigDir(repoRoot), "config.json");
}

export interface Config {
  defaultWorktreePath: string;
  postCreateCommand: string;
  filesToCopy: string[];
  enforceBranchConvention: boolean;
  branchPrefixes: string[];
  useEmbeddedTerminal: boolean;
}

const DEFAULT_CONFIG: Config = {
  defaultWorktreePath: "~/.worktree-cli/worktrees/{repo}/{branch}",
  postCreateCommand: "open -a Terminal {path}",
  filesToCopy: [".env*"],
  enforceBranchConvention: false,
  branchPrefixes: ["feature", "bugfix"],
  useEmbeddedTerminal: true, // Default to embedded terminal
};

export async function ensureConfigDir(repoRoot: string): Promise<void> {
  const fs = await import("fs/promises");
  await fs.mkdir(CONFIG_DIR, { recursive: true });
  await fs.mkdir(join(CONFIG_DIR, "worktrees"), { recursive: true });
  await fs.mkdir(getRepoConfigDir(repoRoot), { recursive: true });
}

export async function loadConfig(repoRoot: string): Promise<Config> {
  try {
    const fs = await import("fs/promises");
    const configFile = getRepoConfigFile(repoRoot);
    const content = await fs.readFile(configFile, "utf-8");
    return { ...DEFAULT_CONFIG, ...JSON.parse(content) };
  } catch {
    return DEFAULT_CONFIG;
  }
}

export async function saveConfig(config: Config, repoRoot: string): Promise<void> {
  await ensureConfigDir(repoRoot);
  const fs = await import("fs/promises");
  const configFile = getRepoConfigFile(repoRoot);
  await fs.writeFile(configFile, JSON.stringify(config, null, 2));
}

export async function isFirstRun(repoRoot: string): Promise<boolean> {
  try {
    const fs = await import("fs/promises");
    const configFile = getRepoConfigFile(repoRoot);
    await fs.access(configFile);
    return false;
  } catch {
    return true;
  }
}

export function getDefaultConfig(): Config {
  return { ...DEFAULT_CONFIG };
}

export async function expandWorktreePath(
  template: string,
  branch: string
): Promise<string> {
  const repoName = await getRepoName();

  let path = template
    .replace("{repo}", repoName)
    .replace("{branch}", branch.replace(/\//g, "-"));

  if (path.startsWith("~")) {
    path = join(homedir(), path.slice(1));
  }

  return path;
}

export async function getWorktreePath(branch: string, repoRoot: string): Promise<string> {
  const config = await loadConfig(repoRoot);
  return expandWorktreePath(config.defaultWorktreePath, branch);
}

export function expandCommand(command: string, worktreePath: string): string {
  return command.replace("{path}", worktreePath);
}
