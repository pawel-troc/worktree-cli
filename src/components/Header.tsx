import React from "react";
import { Box, Text } from "ink";

interface HeaderProps {
  repoName: string;
}

export function Header({ repoName }: HeaderProps) {
  return (
    <Box flexDirection="column" marginBottom={1}>
      <Box>
        <Text bold color="cyan">
          wt
        </Text>
        <Text dimColor> - Git Worktree Manager</Text>
      </Box>
      <Text dimColor>Repository: {repoName}</Text>
    </Box>
  );
}
