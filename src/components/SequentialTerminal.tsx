import React, { useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import { useTerminalManager } from '../hooks/useTerminalManager.ts';

interface SequentialTerminalProps {
  initialWorkingDir: string;
  initialLabel?: string;
  onExit: () => void;
}

export function SequentialTerminal({
  initialWorkingDir,
  initialLabel,
  onExit,
}: SequentialTerminalProps) {
  const { terminals, activeIndex, nextTerminal, previousTerminal, enterTerminalMode, writeToActive } =
    useTerminalManager();

  // Enter terminal mode on mount
  useEffect(() => {
    enterTerminalMode(initialWorkingDir, initialLabel);

    // Enable alternate screen buffer
    process.stdout.write('\x1b[?1049h');
    // Clear screen
    process.stdout.write('\x1b[2J\x1b[H');

    // Enable raw mode for direct input
    if (process.stdin.setRawMode) {
      process.stdin.setRawMode(true);
    }

    return () => {
      // Restore screen on unmount
      process.stdout.write('\x1b[?1049l');

      if (process.stdin.setRawMode) {
        process.stdin.setRawMode(false);
      }
    };
  }, []);

  // Re-render when switching terminals
  useEffect(() => {
    if (terminals.length > 0) {
      // Clear and redraw
      process.stdout.write('\x1b[2J\x1b[H');
    }
  }, [activeIndex]);

  useInput((input, key) => {
    // Ctrl+Q: Exit terminal mode
    if (key.ctrl && input === 'q') {
      onExit();
      return;
    }

    // Ctrl+N: Next terminal
    if (key.ctrl && input === 'n') {
      if (terminals.length > 1) {
        nextTerminal();
      }
      return;
    }

    // Ctrl+P: Previous terminal
    if (key.ctrl && input === 'p') {
      if (terminals.length > 1) {
        previousTerminal();
      }
      return;
    }

    // Forward all other input to active terminal
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

  const activeTerminal = terminals[activeIndex];

  if (!activeTerminal) {
    return (
      <Box flexDirection="column">
        <Text color="yellow">Initializing terminal...</Text>
      </Box>
    );
  }

  // Show last 20 lines of buffer
  const visibleLines = activeTerminal.buffer.slice(-20);

  return (
    <Box flexDirection="column">
      {/* Header with terminal info */}
      <Box marginBottom={1}>
        <Box marginRight={2}>
          <Text bold color="cyan">
            {activeTerminal.label}
          </Text>
        </Box>
        {terminals.length > 1 && (
          <Box>
            <Text dimColor>
              ({activeIndex + 1}/{terminals.length})
            </Text>
          </Box>
        )}
      </Box>

      {/* Working directory */}
      <Box marginBottom={1}>
        <Text dimColor>📂 {activeTerminal.workingDir}</Text>
      </Box>

      {/* Terminal indicator bar (show all terminals) */}
      {terminals.length > 1 && (
        <Box marginBottom={1}>
          {terminals.map((term, i) => (
            <Box key={term.id} marginRight={1}>
              <Text color={i === activeIndex ? 'cyan' : 'gray'} dimColor={i !== activeIndex}>
                {i === activeIndex ? '●' : '○'} {term.label}
              </Text>
            </Box>
          ))}
        </Box>
      )}

      {/* Separator */}
      <Box marginBottom={1}>
        <Text dimColor>{'─'.repeat(50)}</Text>
      </Box>

      {/* Terminal output */}
      <Box flexDirection="column">
        {visibleLines.map((line, i) => (
          <Text key={`${activeTerminal.id}-${i}`}>{line || ' '}</Text>
        ))}
      </Box>

      {/* Status bar */}
      <Box marginTop={1}>
        <Text dimColor>
          {terminals.length > 1 && '[Ctrl+N: Next] [Ctrl+P: Previous] '}
          [Ctrl+Q: Exit]
        </Text>
      </Box>
    </Box>
  );
}
