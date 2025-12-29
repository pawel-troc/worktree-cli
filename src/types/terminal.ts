export interface TerminalTab {
  id: string;                   // Unique ID
  label: string;                // Display name (shown in tab)
  workingDir: string;           // Worktree path
  buffer: string[];             // Output lines (last 1000)
  process: any;                 // Subprocess
  stdin: any;                   // Process stdin for writing
  isActive: boolean;            // Currently visible
  createdAt: number;            // Timestamp
  lastActiveAt: number;         // Last time user switched to it
}

export interface MultiTerminalState {
  tabs: TerminalTab[];
  activeTabIndex: number;
}
