import React, { useState, useEffect } from "react";
import { Box, Text, useInput, useApp } from "ink";
import {
  createSession,
  createSessionName,
  listSessions,
  attachToSession,
  killSession,
  isTmuxAvailable,
} from "../utils/tmux.ts";

export interface WorktreeSession {
  path: string;
  command: string;
  sessionName: string;
}

interface TmuxViewProps {
  initialSession?: WorktreeSession;
  onExit: () => void;
}

export function TmuxView({ initialSession, onExit }: TmuxViewProps) {
  const { exit } = useApp();
  const [sessions, setSessions] = useState<WorktreeSession[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [tmuxAvailable, setTmuxAvailable] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isAttaching, setIsAttaching] = useState(false);

  // Check tmux availability on mount
  useEffect(() => {
    isTmuxAvailable().then((available) => {
      setTmuxAvailable(available);
      if (!available) {
        setError("tmux is not installed. Please install tmux to use this feature.");
      }
    });
  }, []);

  // Initialize with the initial session
  useEffect(() => {
    if (initialSession && tmuxAvailable) {
      const initSession = async () => {
        try {
          await createSession(
            initialSession.sessionName,
            initialSession.path,
            initialSession.command
          );
          setSessions([initialSession]);
        } catch (err) {
          setError(`Failed to create tmux session: ${err}`);
        }
      };
      initSession();
    }
  }, [initialSession, tmuxAvailable]);

  // Refresh sessions list periodically
  useEffect(() => {
    if (!tmuxAvailable) return;

    const refreshSessions = async () => {
      const activeSessions = await listSessions();
      // Filter to only show sessions we're tracking
      setSessions((prev) =>
        prev.filter((s) => activeSessions.includes(s.sessionName))
      );
    };

    const interval = setInterval(refreshSessions, 2000);
    return () => clearInterval(interval);
  }, [tmuxAvailable]);

  useInput(
    (input, key) => {
      if (isAttaching) return; // Disable input while attaching

      if (input === "q") {
        handleExit();
        return;
      }

      if (input === "a" && sessions.length > 0) {
        handleAttach();
        return;
      }

      if (input === "x" && sessions.length > 0) {
        handleKillSession();
        return;
      }

      if (key.upArrow) {
        setSelectedIndex((i) => (i > 0 ? i - 1 : sessions.length - 1));
      }

      if (key.downArrow) {
        setSelectedIndex((i) => (i < sessions.length - 1 ? i + 1 : 0));
      }

      if (key.leftArrow) {
        setSelectedIndex((i) => (i > 0 ? i - 1 : sessions.length - 1));
      }

      if (key.rightArrow) {
        setSelectedIndex((i) => (i < sessions.length - 1 ? i + 1 : 0));
      }
    },
    { isActive: !isAttaching }
  );

  const handleAttach = () => {
    const session = sessions[selectedIndex];
    if (!session) return;

    setIsAttaching(true);

    // Exit the Ink app temporarily to give control to tmux
    exit();

    // Attach to the tmux session
    const proc = attachToSession(session.sessionName);

    proc.on("exit", () => {
      // When user detaches from tmux, we can't restart the Ink app
      // So we just exit completely
      process.exit(0);
    });
  };

  const handleKillSession = async () => {
    const session = sessions[selectedIndex];
    if (!session) return;

    try {
      await killSession(session.sessionName);
      setSessions((prev) => prev.filter((_, i) => i !== selectedIndex));
      setSelectedIndex((i) => Math.max(0, i - 1));
    } catch (err) {
      setError(`Failed to kill session: ${err}`);
    }
  };

  const handleExit = async () => {
    // Kill all sessions before exiting
    for (const session of sessions) {
      try {
        await killSession(session.sessionName);
      } catch {
        // Ignore errors
      }
    }
    onExit();
  };

  if (tmuxAvailable === null) {
    return (
      <Box>
        <Text dimColor>Checking tmux availability...</Text>
      </Box>
    );
  }

  if (!tmuxAvailable) {
    return (
      <Box flexDirection="column">
        <Text color="red" bold>
          tmux not available
        </Text>
        <Text>{error}</Text>
        <Box marginTop={1}>
          <Text dimColor>Press [q] to exit</Text>
        </Box>
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      {/* Header */}
      <Box marginBottom={1}>
        <Text bold color="cyan">
          ⚡ Hybrid Tmux Mode
        </Text>
        <Text dimColor> - Multi-Worktree Management</Text>
      </Box>

      {/* Tab Bar */}
      <Box marginBottom={1} flexDirection="column">
        <Text bold>Active Sessions:</Text>
        <Box flexDirection="row" marginTop={1}>
          {sessions.length === 0 ? (
            <Text dimColor>No active sessions</Text>
          ) : (
            sessions.map((session, i) => {
              const isSelected = i === selectedIndex;
              const tabStyle = isSelected
                ? { color: "cyan", bold: true }
                : { dimColor: true };

              return (
                <Box key={session.sessionName} marginRight={1}>
                  <Text {...tabStyle}>
                    {isSelected ? "▶ " : "  "}
                    [{i + 1}] {session.sessionName}
                  </Text>
                </Box>
              );
            })
          )}
        </Box>
      </Box>

      {/* Session Details */}
      {sessions.length > 0 && sessions[selectedIndex] && (
        <Box flexDirection="column" marginBottom={1} paddingLeft={2}>
          <Text>
            <Text dimColor>Path: </Text>
            <Text color="green">{sessions[selectedIndex].path}</Text>
          </Text>
          <Text>
            <Text dimColor>Command: </Text>
            <Text color="yellow">{sessions[selectedIndex].command}</Text>
          </Text>
        </Box>
      )}

      {/* Info Box */}
      <Box
        flexDirection="column"
        borderStyle="round"
        borderColor="gray"
        paddingX={1}
        marginBottom={1}
      >
        <Text color="cyan" bold>
          💡 How it works:
        </Text>
        <Text dimColor>
          • Press [a] to attach to the selected session
        </Text>
        <Text dimColor>
          • Inside tmux, press [Ctrl+B, D] to detach and return here
        </Text>
        <Text dimColor>
          • Use arrow keys to navigate between sessions
        </Text>
        <Text dimColor>
          • Press [x] to kill the selected session
        </Text>
      </Box>

      {/* Error Display */}
      {error && (
        <Box marginBottom={1}>
          <Text color="red">{error}</Text>
        </Box>
      )}

      {/* Legend */}
      <Box flexDirection="column" borderStyle="single" borderColor="gray" paddingX={1}>
        <Text>
          <Text dimColor>[←/→]</Text> Switch tabs{" "}
          <Text dimColor>[a]</Text> Attach{" "}
          <Text dimColor>[x]</Text> Kill session{" "}
          <Text dimColor>[q]</Text> Exit
        </Text>
      </Box>
    </Box>
  );
}
