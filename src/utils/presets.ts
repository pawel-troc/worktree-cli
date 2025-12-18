export interface CommandPreset {
  id: string;
  label: string;
  command: string;
  appName: string;
  termProgram: string; // Value of TERM_PROGRAM env var for this terminal
}

export const COMMAND_PRESETS: CommandPreset[] = [
  {
    id: "terminal",
    label: "Terminal.app",
    command: "open -a Terminal {path}",
    appName: "Terminal",
    termProgram: "Apple_Terminal",
  },
  {
    id: "iterm2",
    label: "iTerm2",
    command: "open -a iTerm {path}",
    appName: "iTerm",
    termProgram: "iTerm.app",
  },
  {
    id: "ghostty",
    label: "Ghostty",
    command: "open -a Ghostty {path}",
    appName: "Ghostty",
    termProgram: "ghostty",
  },
  {
    id: "warp",
    label: "Warp",
    command: "open -a Warp {path}",
    appName: "Warp",
    termProgram: "WarpTerminal",
  },
];

async function isAppInstalled(appName: string): Promise<boolean> {
  const fs = await import("fs/promises");

  // Check multiple locations for macOS apps
  const paths = [
    `/Applications/${appName}.app`,
    `/System/Applications/${appName}.app`,
    `/System/Applications/Utilities/${appName}.app`,
  ];

  for (const path of paths) {
    try {
      await fs.access(path);
      return true;
    } catch {
      // Path doesn't exist, continue checking
    }
  }
  return false;
}

/**
 * Detect the user's current terminal based on TERM_PROGRAM environment variable
 */
export function detectDefaultTerminal(): CommandPreset | undefined {
  const termProgram = process.env.TERM_PROGRAM;
  if (!termProgram) return undefined;
  return COMMAND_PRESETS.find((preset) => preset.termProgram === termProgram);
}

/**
 * Get available terminal presets, sorted with the default terminal first
 */
export async function getAvailablePresets(): Promise<{
  presets: CommandPreset[];
  defaultPreset: CommandPreset | undefined;
}> {
  const defaultPreset = detectDefaultTerminal();

  const results = await Promise.all(
    COMMAND_PRESETS.map(async (preset) => {
      const isAvailable = await isAppInstalled(preset.appName);
      return { preset, isAvailable };
    })
  );

  const available = results.filter((r) => r.isAvailable).map((r) => r.preset);

  // Sort: default terminal first, then the rest in original order
  if (defaultPreset && available.some((p) => p.id === defaultPreset.id)) {
    const sorted = [
      defaultPreset,
      ...available.filter((p) => p.id !== defaultPreset.id),
    ];
    return { presets: sorted, defaultPreset };
  }

  return { presets: available, defaultPreset: undefined };
}

export function getPresetByCommand(command: string): CommandPreset | undefined {
  return COMMAND_PRESETS.find((preset) => preset.command === command);
}
