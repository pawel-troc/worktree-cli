import React, { useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import { useMultiTerminal } from '../hooks/useMultiTerminal.ts';
import { TerminalTabBar } from './TerminalTabBar.tsx';

interface MultiTerminalProps {
  initialWorkingDir: string;
  initialLabel?: string;
  onExit: () => void;
  onRequestNewTab?: (callback: (workingDir: string, label: string) => void) => void;
}

export function MultiTerminal({
  initialWorkingDir,
  initialLabel,
  onExit,
  onRequestNewTab,
}: MultiTerminalProps) {
  const { tabs, activeTabIndex, addTab, switchToTab, closeTab, writeToActive } = useMultiTerminal(
    initialWorkingDir,
    initialLabel
  );

  // Setup alternate screen buffer
  useEffect(() => {
    // Enable alternate screen
    process.stdout.write('\x1b[?1049h');
    // Clear screen
    process.stdout.write('\x1b[2J\x1b[H');

    // Enable raw mode
    if (process.stdin.setRawMode) {
      process.stdin.setRawMode(true);
    }

    return () => {
      // Restore on unmount
      process.stdout.write('\x1b[?1049l');

      if (process.stdin.setRawMode) {
        process.stdin.setRawMode(false);
      }
    };
  }, []);

  // Re-render when switching tabs
  useEffect(() => {
    if (tabs.length > 0) {
      process.stdout.write('\x1b[2J\x1b[H');
    }
  }, [activeTabIndex]);

  // Expose addTab to parent
  useEffect(() => {
    if (onRequestNewTab) {
      onRequestNewTab((workingDir: string, label: string) => {
        addTab(workingDir, label);
      });
    }
  }, [onRequestNewTab, addTab]);

  useInput((input, key) => {
    // Ctrl+Q: Exit terminal mode
    if (key.ctrl && input === 'q') {
      onExit();
      return;
    }

    // Ctrl+T: New tab (request from parent)
    if (key.ctrl && input === 't') {
      // For now, just show a message
      // In real implementation, parent would handle this
      return;
    }

    // Ctrl+W: Close current tab
    if (key.ctrl && input === 'w') {
      if (tabs.length > 1) {
        closeTab(activeTabIndex);
      }
      return;
    }

    // Ctrl+1-9: Switch to tab N
    if (key.ctrl && input >= '1' && input <= '9') {
      const tabIndex = parseInt(input) - 1;
      if (tabIndex < tabs.length) {
        switchToTab(tabIndex);
      }
      return;
    }

    // Forward input to active terminal
    if (key.return) {
      writeToActive('\n');
    } else if (key.backspace || key.delete) {
      writeToActive('\x7f');
    } else if (key.upArrow) {
      writeToActive('\x1b[A');
    } else if (key.downArrow) {
      writeToActive('\x1b[B');
    } else if (key.leftArrow) {
      writeToActive('\x1b[D');
    } else if (key.rightArrow) {
      writeToActive('\x1b[C');
    } else if (key.tab) {
      writeToActive('\t');
    } else if (input && !key.ctrl && !key.meta) {
      writeToActive(input);
    }
  });

  const activeTab = tabs[activeTabIndex];

  if (!activeTab) {
    return (
      <Box flexDirection="column">
        <Text color="yellow">Initializing terminal...</Text>
      </Box>
    );
  }

  // Show last 20 lines
  const visibleLines = activeTab.buffer.slice(-20);

  return (
    <Box flexDirection="column">
      {/* Tab bar */}
      <TerminalTabBar tabs={tabs} activeTabIndex={activeTabIndex} />

      {/* Active terminal working directory */}
      <Box marginBottom={1}>
        <Text dimColor>📂 {activeTab.workingDir}</Text>
      </Box>

      {/* Separator */}
      <Box marginBottom={1}>
        <Text dimColor>{'─'.repeat(50)}</Text>
      </Box>

      {/* Terminal output */}
      <Box flexDirection="column">
        {visibleLines.map((line, i) => (
          <Text key={`${activeTab.id}-${i}`}>{line || ' '}</Text>
        ))}
      </Box>

      {/* Status bar */}
      <Box marginTop={1}>
        <Text dimColor>
          [Ctrl+1-{Math.min(tabs.length, 9)}] Switch tabs
          {tabs.length < 9 && ' | [Ctrl+T] New tab'}
          {tabs.length > 1 && ' | [Ctrl+W] Close tab'}
          {' | [Ctrl+Q] Exit'}
        </Text>
      </Box>

      {/* Stats */}
      <Box>
        <Text dimColor>
          Tab {activeTabIndex + 1}/{tabs.length} | Buffer: {activeTab.buffer.length} lines
        </Text>
      </Box>
    </Box>
  );
}
