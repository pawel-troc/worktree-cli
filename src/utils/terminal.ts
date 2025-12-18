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
