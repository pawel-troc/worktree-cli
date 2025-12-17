import React from "react";
import { Box, Text } from "ink";
import type { Worktree } from "../utils/git.ts";

interface WorktreeListProps {
  worktrees: Worktree[];
  selectedIndex: number;
  loading: boolean;
}

export function WorktreeList({
  worktrees,
  selectedIndex,
  loading,
}: WorktreeListProps) {
  if (loading) {
    return (
      <Box>
        <Text dimColor>Loading worktrees...</Text>
      </Box>
    );
  }

  if (worktrees.length === 0) {
    return (
      <Box>
        <Text dimColor>No worktrees found. Press [c] to create one.</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text bold underline>
          Worktrees ({worktrees.length})
        </Text>
      </Box>
      {worktrees.map((wt, index) => {
        const isSelected = index === selectedIndex;
        const branchDisplay = wt.branch || (wt.isDetached ? "(detached)" : "");

        return (
          <Box key={wt.path}>
            <Text color={isSelected ? "cyan" : undefined}>
              {isSelected ? "> " : "  "}
            </Text>
            <Text
              bold={isSelected}
              color={isSelected ? "cyan" : wt.isBare ? "yellow" : undefined}
            >
              {branchDisplay || wt.head.substring(0, 7)}
            </Text>
            <Text dimColor> - </Text>
            <Text dimColor={!isSelected}>{wt.path}</Text>
            {wt.isLocked && (
              <Text color="red"> [locked{wt.lockReason ? `: ${wt.lockReason}` : ""}]</Text>
            )}
            {wt.isBare && <Text color="yellow"> [bare]</Text>}
          </Box>
        );
      })}
    </Box>
  );
}
