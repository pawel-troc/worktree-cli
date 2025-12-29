import React from 'react';
import { Box, Text } from 'ink';
import type { TerminalTab } from '../types/terminal.ts';

interface TerminalTabBarProps {
  tabs: TerminalTab[];
  activeTabIndex: number;
}

export function TerminalTabBar({ tabs, activeTabIndex }: TerminalTabBarProps) {
  if (tabs.length === 0) return null;

  return (
    <Box flexDirection="column">
      {/* Title */}
      <Box marginBottom={1}>
        <Text bold color="cyan">
          Multi-Terminal Mode
        </Text>
        <Text dimColor> ({tabs.length} {tabs.length === 1 ? 'tab' : 'tabs'})</Text>
      </Box>

      {/* Tabs */}
      <Box marginBottom={1}>
        {tabs.map((tab, index) => {
          const isActive = index === activeTabIndex;
          const shortcutNum = index < 9 ? index + 1 : null;

          return (
            <Box key={tab.id} marginRight={1}>
              <Text
                bold={isActive}
                color={isActive ? 'cyan' : 'gray'}
                dimColor={!isActive}
              >
                {isActive ? '●' : '○'} {shortcutNum ? `[${shortcutNum}] ` : ''}{tab.label}
              </Text>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}
