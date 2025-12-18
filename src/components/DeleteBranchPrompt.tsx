import React from "react";
import { Box, Text, useInput } from "ink";

interface DeleteBranchPromptProps {
  branchName: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function DeleteBranchPrompt({
  branchName,
  onConfirm,
  onCancel,
}: DeleteBranchPromptProps) {
  useInput((input, key) => {
    if (input === "y" || input === "Y") {
      onConfirm();
    } else if (input === "n" || input === "N" || key.escape) {
      onCancel();
    }
  });

  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text bold color="yellow">
          Delete Branch
        </Text>
      </Box>
      <Box flexDirection="column" marginBottom={1}>
        <Text>Worktree deleted. Delete the branch as well?</Text>
        <Box marginTop={1}>
          <Text dimColor>Branch: </Text>
          <Text bold>{branchName}</Text>
        </Box>
      </Box>
    </Box>
  );
}
