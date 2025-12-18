import { homedir } from "os";
import { join } from "path";
import { getRepoName } from "./git.ts";

const CONFIG_DIR = join(homedir(), ".worktree-cli");
const CONFIG_FILE = join(CONFIG_DIR, "config.json");

export interface Config {
  defaultWorktreePath: string;
  postCreateCommand: string;
  filesToCopy: string[];
}

const DEFAULT_CONFIG: Config = {
  defaultWorktreePath: "~/.worktree-cli/worktrees/{repo}/{branch}",
  postCreateCommand: "open -a Terminal {path}",
  filesToCopy: [".env*"],
};

export async function ensureConfigDir(): Promise<void> {
  const fs = await import("fs/promises");
  await fs.mkdir(CONFIG_DIR, { recursive: true });
  await fs.mkdir(join(CONFIG_DIR, "worktrees"), { recursive: true });
}

export async function loadConfig(): Promise<Config> {
  try {
    const fs = await import("fs/promises");
    const content = await fs.readFile(CONFIG_FILE, "utf-8");
    return { ...DEFAULT_CONFIG, ...JSON.parse(content) };
  } catch {
    return DEFAULT_CONFIG;
  }
}

export async function saveConfig(config: Config): Promise<void> {
  await ensureConfigDir();
  const fs = await import("fs/promises");
  await fs.writeFile(CONFIG_FILE, JSON.stringify(config, null, 2));
}

export async function isFirstRun(): Promise<boolean> {
  try {
    const fs = await import("fs/promises");
    await fs.access(CONFIG_FILE);
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

export async function getWorktreePath(branch: string): Promise<string> {
  const config = await loadConfig();
  return expandWorktreePath(config.defaultWorktreePath, branch);
}

export function expandCommand(command: string, worktreePath: string): string {
  return command.replace("{path}", worktreePath);
}
