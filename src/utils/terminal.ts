import { spawn } from "child_process";

export type TerminalType =
  | "apple_terminal"
  | "iterm2"
  | "ghostty"
  | "warp"
  | "vscode"
  | "unknown";

export function detectCurrentTerminal(): TerminalType {
  const termProgram = process.env.TERM_PROGRAM || "";
  const itermSession = process.env.ITERM_SESSION_ID;
  const ghosttyDir = process.env.GHOSTTY_RESOURCES_DIR;

  if (itermSession) return "iterm2";
  if (ghosttyDir) return "ghostty";
  if (termProgram === "Apple_Terminal") return "apple_terminal";
  if (termProgram === "iTerm.app") return "iterm2";
  if (termProgram === "WarpTerminal") return "warp";
  if (termProgram === "vscode") return "vscode";

  return "unknown";
}

/**
 * Opens a new tab in the current terminal and runs a command.
 * Falls back to opening a new terminal window if tabs aren't supported.
 */
export function openInNewTab(
  command: string,
  workingDir: string
): { success: boolean; fallback: boolean } {
  const terminal = detectCurrentTerminal();
  const escapedDir = workingDir.replace(/'/g, "'\\''");
  const escapedCmd = command.replace(/'/g, "'\\''");
  const fullCommand = `cd '${escapedDir}' && ${escapedCmd}`;

  switch (terminal) {
    case "iterm2": {
      // iTerm2 has native AppleScript support for creating tabs
      const script = `
        tell application "iTerm2"
          tell current window
            create tab with default profile
            tell current session
              write text "${fullCommand.replace(/"/g, '\\"')}"
            end tell
          end tell
        end tell
      `;
      spawn("osascript", ["-e", script], {
        stdio: "ignore",
        detached: true,
      }).unref();
      return { success: true, fallback: false };
    }

    case "apple_terminal": {
      // Terminal.app needs keystroke simulation for new tab
      const script = `
        tell application "Terminal"
          activate
          tell application "System Events"
            keystroke "t" using {command down}
          end tell
          delay 0.3
          do script "${fullCommand.replace(/"/g, '\\"')}" in front window
        end tell
      `;
      spawn("osascript", ["-e", script], {
        stdio: "ignore",
        detached: true,
      }).unref();
      return { success: true, fallback: false };
    }

    case "ghostty":
    case "warp":
    case "vscode":
    case "unknown":
    default: {
      // Fall back to opening a new terminal window
      // Try to use the detected terminal or default to Terminal.app
      const terminalApp =
        terminal === "ghostty"
          ? "Ghostty"
          : terminal === "warp"
            ? "Warp"
            : "Terminal";

      spawn("open", ["-a", terminalApp, workingDir], {
        stdio: "ignore",
        detached: true,
      }).unref();
      return { success: true, fallback: true };
    }
  }
}

/**
 * Determines if a command is a CLI tool that needs a terminal,
 * or a terminal/app opener that handles its own window.
 */
export function isCliTool(command: string): boolean {
  // Commands that open their own windows don't need wrapping
  const selfOpeningPatterns = [
    /^open\s+-a\s+/i, // open -a AppName
    /^open\s+/i, // open (generic)
  ];

  return !selfOpeningPatterns.some((pattern) => pattern.test(command.trim()));
}

/**
 * Opens a shell in the alternate screen buffer.
 * When user exits shell, returns to the original screen.
 */
export function openEmbeddedShell(workingDir: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // Enable alternate screen buffer
    process.stdout.write('\x1b[?1049h');

    // Clear the alternate screen and move cursor to top-left
    process.stdout.write('\x1b[2J\x1b[H');

    // Print welcome message
    process.stdout.write('\x1b[1;36m'); // Cyan bold
    process.stdout.write('╔════════════════════════════════════════════════╗\n');
    process.stdout.write('║     Embedded Terminal - worktree-cli          ║\n');
    process.stdout.write('╚════════════════════════════════════════════════╝\x1b[0m\n\n');
    process.stdout.write(`Working directory: \x1b[36m${workingDir}\x1b[0m\n`);
    process.stdout.write('\x1b[2mType "exit" or press Ctrl+D to return\x1b[0m\n\n');

    // Get the user's shell
    const shell = process.env.SHELL || '/bin/bash';

    // Spawn shell with inherited stdio (direct terminal access)
    const proc = spawn(shell, [], {
      cwd: workingDir,
      stdio: 'inherit',
      env: process.env,
    });

    proc.on('exit', (code) => {
      // Restore original screen buffer
      process.stdout.write('\x1b[?1049l');
      resolve();
    });

    proc.on('error', (err) => {
      // Restore screen even on error
      process.stdout.write('\x1b[?1049l');
      reject(err);
    });
  });
}

/**
 * Executes a command in the alternate screen buffer.
 * Shows output, waits for user input, then returns.
 */
export async function executeInEmbeddedTerminal(
  command: string,
  workingDir: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    // Enable alternate screen
    process.stdout.write('\x1b[?1049h');

    // Clear and position cursor
    process.stdout.write('\x1b[2J\x1b[H');

    // Header
    process.stdout.write('\x1b[1;36m'); // Cyan bold
    process.stdout.write('╔════════════════════════════════════════════════╗\n');
    process.stdout.write('║     Executing Command - worktree-cli          ║\n');
    process.stdout.write('╚════════════════════════════════════════════════╝\x1b[0m\n\n');
    process.stdout.write(`Command: \x1b[33m${command}\x1b[0m\n`);
    process.stdout.write(`Directory: \x1b[36m${workingDir}\x1b[0m\n`);
    process.stdout.write('─'.repeat(50) + '\n\n');

    const proc = spawn('/bin/sh', ['-c', command], {
      cwd: workingDir,
      stdio: 'inherit',
      env: process.env,
    });

    proc.on('exit', (code) => {
      // Show completion message
      process.stdout.write('\n' + '─'.repeat(50) + '\n');
      if (code === 0) {
        process.stdout.write('\x1b[32m✓ Command completed successfully\x1b[0m\n\n');
      } else {
        process.stdout.write(`\x1b[31m✗ Command exited with code ${code}\x1b[0m\n\n`);
      }

      process.stdout.write('\x1b[2mPress any key to return to worktree-cli...\x1b[0m');

      // Enable raw mode to capture single keypress
      process.stdin.setRawMode(true);
      process.stdin.resume();

      const handler = () => {
        process.stdin.off('data', handler);
        process.stdin.setRawMode(false);
        process.stdin.pause();

        // Restore original screen
        process.stdout.write('\x1b[?1049l');

        resolve();
      };

      process.stdin.once('data', handler);
    });

    proc.on('error', (err) => {
      // Restore screen on error
      process.stdout.write('\x1b[?1049l');
      reject(err);
    });
  });
}

/**
 * Executes a post-create command appropriately.
 * - Terminal openers (open -a Terminal) run directly
 * - CLI tools (claude, code) open in a new terminal tab
 */
export function executePostCreateCommand(
  command: string,
  workingDir: string
): void {
  if (isCliTool(command)) {
    // CLI tool - needs to run in a new terminal tab
    openInNewTab(command, workingDir);
  } else {
    // Terminal/app opener - run directly
    spawn(command, {
      shell: true,
      stdio: "ignore",
      detached: true,
      cwd: workingDir,
    }).unref();
  }
}
