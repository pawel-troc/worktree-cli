import React from "react";
import { Box, Text } from "ink";
import { Legend } from "./Legend.tsx";

export type View = "list" | "create" | "delete" | "settings" | "postCreate";

interface StatusBarProps {
  view: View;
  error?: string | null;
}

export function StatusBar({ view, error }: StatusBarProps) {
  const shortcuts: Record<View, string> = {
    list: "[c] Create • [d] Delete • [o] Open • [r] Refresh • [s] Settings • [q] Quit",
    create: "[Enter] Confirm • [Esc] Cancel • [↑↓] Select",
    delete: "[Enter] Confirm • [Esc] Cancel • [↑↓] Select",
    settings: "", // Settings component handles its own legend
    postCreate: "[Enter] Confirm • [↑↓] Select • [Esc] Stay",
  };

  const shortcutText = shortcuts[view];

  return (
    <Box flexDirection="column" marginTop={1}>
      {error && (
        <Box>
          <Text color="red">Error: {error}</Text>
        </Box>
      )}
      {shortcutText && (
        <Box>
          <Legend text={shortcutText} />
        </Box>
      )}
    </Box>
  );
}
