import React from "react";
import { Box, Text } from "ink";

interface HeaderProps {
  repoName: string;
  version: string;
  installPath: string;
}

const LOGO_WORKTREE = [
  "██╗    ██╗ ██████╗ ██████╗ ██╗  ██╗████████╗██████╗ ███████╗███████╗",
  "██║    ██║██╔═══██╗██╔══██╗██║ ██╔╝╚══██╔══╝██╔══██╗██╔════╝██╔════╝",
  "██║ █╗ ██║██║   ██║██████╔╝█████╔╝    ██║   ██████╔╝█████╗  █████╗  ",
  "██║███╗██║██║   ██║██╔══██╗██╔═██╗    ██║   ██╔══██╗██╔══╝  ██╔══╝  ",
  "╚███╔███╔╝╚██████╔╝██║  ██║██║  ██╗   ██║   ██║  ██║███████╗███████╗",
  " ╚══╝╚══╝  ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═╝   ╚═╝   ╚═╝  ╚═╝╚══════╝╚══════╝",
];

const LOGO_CLI = [
  "   ██████╗██╗     ██╗",
  "  ██╔════╝██║     ██║",
  "  ██║     ██║     ██║",
  "  ██║     ██║     ██║",
  "  ╚██████╗███████╗██║",
  "   ╚═════╝╚══════╝╚═╝",
];

export function Header({ repoName, version, installPath }: HeaderProps) {
  return (
    <Box flexDirection="column" marginBottom={1}>
      {LOGO_WORKTREE.map((line, i) => (
        <Box key={`logo-line-${i}`}>
          <Text color="cyan">{line}</Text>
          <Text>{LOGO_CLI[i]}</Text>
        </Box>
      ))}
      <Box marginTop={1}>
        <Text dimColor>v{version}</Text>
        <Text dimColor> · </Text>
        <Text dimColor>{installPath}</Text>
      </Box>
      <Text dimColor>Repository: {repoName}</Text>
    </Box>
  );
}
