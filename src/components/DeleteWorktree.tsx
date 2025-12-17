import React from "react";
import { Box, Text, useInput } from "ink";
import type { Worktree } from "../utils/git.ts";

interface DeleteWorktreeProps {
  worktree: Worktree;
  onConfirm: (force: boolean) => void;
  onCancel: () => void;
}

export function DeleteWorktree({
  worktree,
  onConfirm,
  onCancel,
}: DeleteWorktreeProps) {
  useInput((input, key) => {
    if (input === "y" || input === "Y") {
      onConfirm(false);
    } else if (input === "f" || input === "F") {
      onConfirm(true);
    } else if (input === "n" || input === "N" || key.escape) {
      onCancel();
    }
  });

  const branchDisplay = worktree.branch || worktree.head.substring(0, 7);

  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text bold color="red">
          Delete Worktree
        </Text>
      </Box>
      <Box flexDirection="column" marginBottom={1}>
        <Text>Are you sure you want to delete this worktree?</Text>
        <Box marginTop={1}>
          <Text dimColor>Branch: </Text>
          <Text bold>{branchDisplay}</Text>
        </Box>
        <Box>
          <Text dimColor>Path: </Text>
          <Text>{worktree.path}</Text>
        </Box>
      </Box>
      {worktree.isLocked && (
        <Box marginBottom={1}>
          <Text color="yellow">
            Warning: This worktree is locked. Use [f] to force delete.
          </Text>
        </Box>
      )}
      <Box>
        <Text dimColor>[y] Yes  [n] No  [f] Force delete</Text>
      </Box>
    </Box>
  );
}
