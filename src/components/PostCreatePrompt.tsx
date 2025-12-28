import React, { useState } from "react";
import { Box, Text, useInput } from "ink";

interface PostCreatePromptProps {
  worktreePath: string;
  command: string;
  onSwitch: () => void;
  onStay: () => void;
  onTmux: () => void;
}

export function PostCreatePrompt({
  worktreePath,
  command,
  onSwitch,
  onStay,
  onTmux,
}: PostCreatePromptProps) {
  const [selected, setSelected] = useState<"switch" | "stay" | "tmux">("switch");

  useInput((input, key) => {
    if (key.upArrow) {
      setSelected((s) => {
        if (s === "switch") return "tmux";
        if (s === "tmux") return "stay";
        return "switch";
      });
    } else if (key.downArrow) {
      setSelected((s) => {
        if (s === "switch") return "stay";
        if (s === "stay") return "tmux";
        return "switch";
      });
    } else if (key.return) {
      if (selected === "switch") {
        onSwitch();
      } else if (selected === "tmux") {
        onTmux();
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
        <Text>What would you like to do?</Text>
        <Box marginTop={1} flexDirection="column">
          <Box>
            <Text color={selected === "switch" ? "cyan" : undefined}>
              {selected === "switch" ? "> " : "  "}
              Switch - run in new terminal: <Text dimColor>{command}</Text>
            </Text>
          </Box>
          <Box>
            <Text color={selected === "tmux" ? "cyan" : undefined}>
              {selected === "tmux" ? "> " : "  "}
              Tmux Mode - hybrid multi-worktree interface{" "}
              <Text bold color="yellow">
                [POC]
              </Text>
            </Text>
          </Box>
          <Box>
            <Text color={selected === "stay" ? "cyan" : undefined}>
              {selected === "stay" ? "> " : "  "}
              Stay - return to list
            </Text>
          </Box>
        </Box>
      </Box>

    </Box>
  );
}
