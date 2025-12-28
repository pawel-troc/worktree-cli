import { spawn, type ChildProcess } from "child_process";
import { promisify } from "util";
import { exec } from "child_process";

const execAsync = promisify(exec);

export interface TmuxSession {
  name: string;
  path: string;
  command: string;
}

/**
 * Check if tmux is installed and available
 */
export async function isTmuxAvailable(): Promise<boolean> {
  try {
    await execAsync("which tmux");
    return true;
  } catch {
    return false;
  }
}

/**
 * Create a unique session name for a worktree
 */
export function createSessionName(worktreePath: string): string {
  // Use the last part of the path as session name, sanitized
  const parts = worktreePath.split("/");
  const lastPart = parts[parts.length - 1] || "worktree";
  return `wt-${lastPart}`.replace(/[^a-zA-Z0-9-_]/g, "-");
}

/**
 * Check if a tmux session exists
 */
export async function sessionExists(sessionName: string): Promise<boolean> {
  try {
    await execAsync(`tmux has-session -t "${sessionName}" 2>/dev/null`);
    return true;
  } catch {
    return false;
  }
}

/**
 * Create a new tmux session for a worktree
 */
export async function createSession(
  sessionName: string,
  worktreePath: string,
  command: string
): Promise<void> {
  // Kill existing session if it exists
  if (await sessionExists(sessionName)) {
    await execAsync(`tmux kill-session -t "${sessionName}"`);
  }

  // Create new detached session
  await execAsync(
    `tmux new-session -d -s "${sessionName}" -c "${worktreePath}"`
  );

  // Send the command to the session
  if (command) {
    await execAsync(`tmux send-keys -t "${sessionName}" "${command}" Enter`);
  }
}

/**
 * List all active worktree tmux sessions
 */
export async function listSessions(): Promise<string[]> {
  try {
    const { stdout } = await execAsync("tmux list-sessions -F '#{session_name}' 2>/dev/null");
    return stdout
      .trim()
      .split("\n")
      .filter((name: string) => name.startsWith("wt-"));
  } catch {
    return [];
  }
}

/**
 * Attach to a tmux session in the current terminal
 * This will take over the entire terminal
 */
export function attachToSession(sessionName: string): ChildProcess {
  return spawn("tmux", ["attach-session", "-t", sessionName], {
    stdio: "inherit",
  });
}

/**
 * Kill a tmux session
 */
export async function killSession(sessionName: string): Promise<void> {
  try {
    await execAsync(`tmux kill-session -t "${sessionName}"`);
  } catch {
    // Ignore errors if session doesn't exist
  }
}

/**
 * Send keys to a tmux session
 */
export async function sendKeys(
  sessionName: string,
  keys: string
): Promise<void> {
  await execAsync(`tmux send-keys -t "${sessionName}" "${keys}"`);
}

/**
 * Get the number of panes in a session
 */
export async function getPaneCount(sessionName: string): Promise<number> {
  try {
    const { stdout } = await execAsync(
      `tmux list-panes -t "${sessionName}" | wc -l`
    );
    return parseInt(stdout.trim(), 10);
  } catch {
    return 0;
  }
}
