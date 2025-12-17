import React from "react";
import { Box, Text } from "ink";

export type View = "list" | "create" | "delete";

interface StatusBarProps {
  view: View;
  error?: string | null;
}

export function StatusBar({ view, error }: StatusBarProps) {
  const shortcuts: Record<View, string> = {
    list: "[c] Create  [d] Delete  [r] Refresh  [q] Quit",
    create: "[Enter] Confirm  [Esc] Cancel  [Tab] Next field",
    delete: "[y] Confirm  [n/Esc] Cancel",
  };

  return (
    <Box flexDirection="column" marginTop={1}>
      {error && (
        <Box>
          <Text color="red">Error: {error}</Text>
        </Box>
      )}
      <Box>
        <Text dimColor>{shortcuts[view]}</Text>
      </Box>
    </Box>
  );
}
