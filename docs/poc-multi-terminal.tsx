#!/usr/bin/env bun
/**
 * Proof of Concept: Multi-Terminal Tab Management with Ink
 *
 * Demonstrates browser-like tab management for multiple embedded terminals.
 * This uses Bun.Terminal API with Ink for the UI.
 *
 * Run with: bun run docs/poc-multi-terminal.tsx
 *
 * Controls:
 *  - Ctrl+1, Ctrl+2, Ctrl+3: Switch between tabs
 *  - Ctrl+T: Create new tab
 *  - Ctrl+W: Close current tab
 *  - Ctrl+Q: Exit application
 */

import React, { useState, useEffect, useRef } from 'react';
import { render, Box, Text, useInput, useStdout } from 'ink';

interface TerminalTab {
  id: string;
  label: string;
  workingDir: string;
  buffer: string[];
  process: any;
  terminal: any;
  isActive: boolean;
  createdAt: number;
}

function MultiTerminalApp() {
  const [terminals, setTerminals] = useState<TerminalTab[]>([]);
  const [activeTabIndex, setActiveTabIndex] = useState(0);
  const { stdout } = useStdout();
  const terminalsRef = useRef<TerminalTab[]>([]);

  // Sync ref with state
  useEffect(() => {
    terminalsRef.current = terminals;
  }, [terminals]);

  // Create initial terminal on mount
  useEffect(() => {
    createTerminal(process.cwd(), 'Tab 1');

    // Cleanup on unmount
    return () => {
      terminalsRef.current.forEach(term => {
        try {
          term.terminal?.close();
          term.process?.kill();
        } catch (e) {
          // Ignore cleanup errors
        }
      });
    };
  }, []);

  // Update active status when activeTabIndex changes
  useEffect(() => {
    setTerminals(prev =>
      prev.map((term, index) => ({
        ...term,
        isActive: index === activeTabIndex,
      }))
    );
  }, [activeTabIndex]);

  const createTerminal = (workingDir: string, label?: string) => {
    const termId = Date.now().toString();
    const termLabel = label || `Tab ${terminals.length + 1}`;

    // Calculate terminal size (account for UI chrome)
    const cols = (stdout.columns || 80) - 2; // Account for border
    const rows = (stdout.rows || 24) - 6; // Account for tab bar, border, status

    try {
      // Spawn bash with PTY
      const proc = Bun.spawn(['bash', '--norc', '--noprofile'], {
        cwd: workingDir,
        env: process.env,
        stdin: 'pipe',
        stdout: 'pipe',
        stderr: 'pipe',
      });

      const newTerminal: TerminalTab = {
        id: termId,
        label: termLabel,
        workingDir,
        buffer: [`Welcome to ${termLabel}`, `Working directory: ${workingDir}`, ''],
        process: proc,
        terminal: proc.stdin,
        isActive: false,
        createdAt: Date.now(),
      };

      // Read stdout
      (async () => {
        const reader = proc.stdout.getReader();
        const decoder = new TextDecoder();

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const text = decoder.decode(value);
            const lines = text.split('\n');

            setTerminals(prev => {
              const termIndex = prev.findIndex(t => t.id === termId);
              if (termIndex === -1) return prev;

              const updated = [...prev];
              updated[termIndex] = {
                ...updated[termIndex],
                buffer: [...updated[termIndex].buffer, ...lines].slice(-1000), // Keep last 1000 lines
              };
              return updated;
            });
          }
        } catch (e) {
          // Stream closed
        }
      })();

      // Read stderr
      (async () => {
        const reader = proc.stderr.getReader();
        const decoder = new TextDecoder();

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const text = decoder.decode(value);
            const lines = text.split('\n');

            setTerminals(prev => {
              const termIndex = prev.findIndex(t => t.id === termId);
              if (termIndex === -1) return prev;

              const updated = [...prev];
              updated[termIndex] = {
                ...updated[termIndex],
                buffer: [
                  ...updated[termIndex].buffer,
                  ...lines.map(l => `[stderr] ${l}`),
                ].slice(-1000),
              };
              return updated;
            });
          }
        } catch (e) {
          // Stream closed
        }
      })();

      setTerminals(prev => [...prev, newTerminal]);
      setActiveTabIndex(terminals.length);
    } catch (error) {
      console.error('Failed to create terminal:', error);
    }
  };

  const closeTerminal = (index: number) => {
    if (terminals.length === 1) {
      // Don't close the last terminal, exit instead
      process.exit(0);
      return;
    }

    const term = terminals[index];
    try {
      term.terminal?.close();
      term.process?.kill();
    } catch (e) {
      // Ignore errors
    }

    setTerminals(prev => prev.filter((_, i) => i !== index));

    // Adjust active tab index
    if (activeTabIndex >= terminals.length - 1) {
      setActiveTabIndex(Math.max(0, terminals.length - 2));
    }
  };

  const writeToActiveTerminal = (data: string) => {
    const activeTerm = terminals[activeTabIndex];
    if (activeTerm?.terminal) {
      try {
        activeTerm.terminal.write(data);
      } catch (e) {
        console.error('Failed to write to terminal:', e);
      }
    }
  };

  // Handle keyboard input
  useInput((input, key) => {
    // Ctrl+Q: Exit
    if (key.ctrl && input === 'q') {
      process.exit(0);
    }

    // Ctrl+T: New terminal
    if (key.ctrl && input === 't') {
      createTerminal(process.cwd());
      return;
    }

    // Ctrl+W: Close current terminal
    if (key.ctrl && input === 'w') {
      closeTerminal(activeTabIndex);
      return;
    }

    // Ctrl+1-9: Switch tabs
    if (key.ctrl && input >= '1' && input <= '9') {
      const tabIndex = parseInt(input) - 1;
      if (tabIndex < terminals.length) {
        setActiveTabIndex(tabIndex);
      }
      return;
    }

    // Forward all other input to active terminal
    if (key.return) {
      writeToActiveTerminal('\n');
    } else if (key.backspace || key.delete) {
      writeToActiveTerminal('\x7f');
    } else if (key.upArrow) {
      writeToActiveTerminal('\x1b[A');
    } else if (key.downArrow) {
      writeToActiveTerminal('\x1b[B');
    } else if (key.leftArrow) {
      writeToActiveTerminal('\x1b[D');
    } else if (key.rightArrow) {
      writeToActiveTerminal('\x1b[C');
    } else if (key.tab) {
      writeToActiveTerminal('\t');
    } else if (input && !key.ctrl && !key.meta) {
      writeToActiveTerminal(input);
    }
  });

  if (terminals.length === 0) {
    return (
      <Box>
        <Text>Loading...</Text>
      </Box>
    );
  }

  const activeTerm = terminals[activeTabIndex];
  const visibleLines = activeTerm?.buffer.slice(-20) || [];

  return (
    <Box flexDirection="column">
      {/* Title */}
      <Box marginBottom={1}>
        <Text bold color="cyan">
          Multi-Terminal POC - Browser-like Tab Management
        </Text>
      </Box>

      {/* Tab bar */}
      <Box marginBottom={1}>
        {terminals.map((term, index) => (
          <Box key={term.id} marginRight={1}>
            <Text
              bold={index === activeTabIndex}
              color={index === activeTabIndex ? 'cyan' : 'gray'}
              dimColor={index !== activeTabIndex}
            >
              {index === activeTabIndex ? '● ' : '○ '}
              {term.label}
            </Text>
          </Box>
        ))}
        {terminals.length < 9 && (
          <Text dimColor> [Ctrl+T: New]</Text>
        )}
      </Box>

      {/* Terminal output */}
      <Box
        borderStyle="round"
        borderColor={activeTerm?.isActive ? 'cyan' : 'gray'}
        flexDirection="column"
        paddingX={1}
        minHeight={20}
      >
        <Box marginBottom={1}>
          <Text dimColor>
            📂 {activeTerm?.workingDir}
          </Text>
        </Box>

        {visibleLines.map((line, i) => (
          <Text key={`${activeTerm?.id}-${i}`}>{line || ' '}</Text>
        ))}
      </Box>

      {/* Status bar */}
      <Box marginTop={1}>
        <Text dimColor>
          [Ctrl+1-{terminals.length}] Switch tabs | [Ctrl+T] New tab | [Ctrl+W] Close tab | [Ctrl+Q] Exit
        </Text>
      </Box>

      {/* Stats */}
      <Box>
        <Text dimColor>
          Active: {activeTabIndex + 1}/{terminals.length} | Buffer: {activeTerm?.buffer.length || 0} lines
        </Text>
      </Box>
    </Box>
  );
}

// Enable raw mode for terminal interaction
process.stdin.setRawMode(true);
process.stdin.resume();

// Restore on exit
process.on('exit', () => {
  process.stdin.setRawMode(false);
});

process.on('SIGINT', () => {
  process.stdin.setRawMode(false);
  process.exit(0);
});

// Render the app
const { waitUntilExit } = render(<MultiTerminalApp />);

waitUntilExit().then(() => {
  process.stdin.setRawMode(false);
  process.exit(0);
});
