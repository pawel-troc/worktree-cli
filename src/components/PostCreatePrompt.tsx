import React, { useState } from "react";
import { Box, Text, useInput } from "ink";

interface PostCreatePromptProps {
  worktreePath: string;
  command: string;
  onSwitch: () => void;
  onStay: () => void;
}

export function PostCreatePrompt({
  worktreePath,
  command,
  onSwitch,
  onStay,
}: PostCreatePromptProps) {
  const [selected, setSelected] = useState<"switch" | "stay">("switch");

  useInput((input, key) => {
    if (key.upArrow || key.downArrow) {
      setSelected((s) => (s === "switch" ? "stay" : "switch"));
    } else if (key.return) {
      if (selected === "switch") {
        onSwitch();
      } else {
        onStay();
      }
    } else if (key.escape) {
      onStay();
    }
  });

  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text bold color="green">
          Worktree created successfully!
        </Text>
      </Box>

      <Box marginBottom={1}>
        <Text>
          Path: <Text color="cyan">{worktreePath}</Text>
        </Text>
      </Box>

      <Box marginBottom={1} flexDirection="column">
        <Text>Switch to new worktree?</Text>
        <Box marginTop={1} flexDirection="column">
          <Box>
            <Text color={selected === "switch" ? "cyan" : undefined}>
              {selected === "switch" ? "> " : "  "}
              Yes, run: <Text dimColor>{command}</Text>
            </Text>
          </Box>
          <Box>
            <Text color={selected === "stay" ? "cyan" : undefined}>
              {selected === "stay" ? "> " : "  "}
              No, stay here
            </Text>
          </Box>
        </Box>
      </Box>

    </Box>
  );
}
