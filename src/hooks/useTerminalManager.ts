import { useState, useRef, useEffect } from 'react';
import type { TerminalInstance, TerminalManagerState } from '../types/terminal.ts';
import { spawn } from 'child_process';

export function useTerminalManager() {
  const [state, setState] = useState<TerminalManagerState>({
    terminals: [],
    activeIndex: 0,
    isInTerminalMode: false,
  });

  const processesRef = useRef<any[]>([]);

  // Create a new terminal instance
  const createTerminal = (workingDir: string, label?: string): TerminalInstance => {
    const id = `term-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const termLabel = label || workingDir.split('/').pop() || 'terminal';

    // Spawn process with inherited stdio for direct terminal access
    // We'll use alternate screen buffer, so stdio inheritance works
    const proc = spawn(process.env.SHELL || '/bin/bash', [], {
      cwd: workingDir,
      stdio: ['pipe', 'pipe', 'pipe'],
      env: process.env,
    });

    const terminal: TerminalInstance = {
      id,
      label: termLabel,
      workingDir,
      buffer: [
        `\x1b[1;36mTerminal: ${termLabel}\x1b[0m`,
        `\x1b[2mWorking directory: ${workingDir}\x1b[0m`,
        '',
      ],
      process: proc,
      stdin: proc.stdin,
      isActive: false,
      createdAt: Date.now(),
      lastActiveAt: Date.now(),
    };

    // Read stdout and buffer it
    if (proc.stdout) {
      proc.stdout.on('data', (data: Buffer) => {
        const text = data.toString();
        const lines = text.split('\n');

        setState((prev) => {
          const termIndex = prev.terminals.findIndex((t) => t.id === id);
          if (termIndex === -1) return prev;

          const updated = [...prev.terminals];
          const currentBuffer = updated[termIndex].buffer;

          // Add new lines and keep last 1000 lines
          updated[termIndex] = {
            ...updated[termIndex],
            buffer: [...currentBuffer, ...lines].slice(-1000),
          };

          return { ...prev, terminals: updated };
        });
      });
    }

    // Read stderr and buffer it
    if (proc.stderr) {
      proc.stderr.on('data', (data: Buffer) => {
        const text = data.toString();
        const lines = text.split('\n').map((line) => `\x1b[31m${line}\x1b[0m`); // Red for stderr

        setState((prev) => {
          const termIndex = prev.terminals.findIndex((t) => t.id === id);
          if (termIndex === -1) return prev;

          const updated = [...prev.terminals];
          const currentBuffer = updated[termIndex].buffer;

          updated[termIndex] = {
            ...updated[termIndex],
            buffer: [...currentBuffer, ...lines].slice(-1000),
          };

          return { ...prev, terminals: updated };
        });
      });
    }

    // Handle process exit
    proc.on('exit', (code) => {
      setState((prev) => {
        const termIndex = prev.terminals.findIndex((t) => t.id === id);
        if (termIndex === -1) return prev;

        const updated = [...prev.terminals];
        updated[termIndex] = {
          ...updated[termIndex],
          buffer: [
            ...updated[termIndex].buffer,
            '',
            code === 0
              ? '\x1b[32mProcess exited successfully\x1b[0m'
              : `\x1b[31mProcess exited with code ${code}\x1b[0m`,
          ],
        };

        return { ...prev, terminals: updated };
      });
    });

    processesRef.current.push(proc);
    return terminal;
  };

  // Get or create terminal for a working directory
  const getOrCreateTerminal = (workingDir: string, label?: string): number => {
    const existing = state.terminals.findIndex((t) => t.workingDir === workingDir);

    if (existing !== -1) {
      return existing;
    }

    // Create new terminal
    const terminal = createTerminal(workingDir, label);

    setState((prev) => ({
      ...prev,
      terminals: [...prev.terminals, terminal],
    }));

    return state.terminals.length;
  };

  // Switch to next terminal
  const nextTerminal = () => {
    setState((prev) => {
      if (prev.terminals.length <= 1) return prev;

      const nextIndex = (prev.activeIndex + 1) % prev.terminals.length;

      const updated = prev.terminals.map((t, i) => ({
        ...t,
        isActive: i === nextIndex,
        lastActiveAt: i === nextIndex ? Date.now() : t.lastActiveAt,
      }));

      return {
        ...prev,
        terminals: updated,
        activeIndex: nextIndex,
      };
    });
  };

  // Switch to previous terminal
  const previousTerminal = () => {
    setState((prev) => {
      if (prev.terminals.length <= 1) return prev;

      const prevIndex = prev.activeIndex === 0 ? prev.terminals.length - 1 : prev.activeIndex - 1;

      const updated = prev.terminals.map((t, i) => ({
        ...t,
        isActive: i === prevIndex,
        lastActiveAt: i === prevIndex ? Date.now() : t.lastActiveAt,
      }));

      return {
        ...prev,
        terminals: updated,
        activeIndex: prevIndex,
      };
    });
  };

  // Enter terminal mode
  const enterTerminalMode = (workingDir: string, label?: string) => {
    const index = getOrCreateTerminal(workingDir, label);

    setState((prev) => {
      const updatedIndex = index >= prev.terminals.length ? prev.terminals.length : index;

      return {
        ...prev,
        activeIndex: updatedIndex,
        isInTerminalMode: true,
        terminals: prev.terminals.map((t, i) => ({
          ...t,
          isActive: i === updatedIndex,
          lastActiveAt: i === updatedIndex ? Date.now() : t.lastActiveAt,
        })),
      };
    });
  };

  // Exit terminal mode
  const exitTerminalMode = () => {
    setState((prev) => ({ ...prev, isInTerminalMode: false }));
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      processesRef.current.forEach((proc) => {
        try {
          proc.kill();
        } catch (e) {
          // Ignore errors during cleanup
        }
      });
    };
  }, []);

  // Write to active terminal
  const writeToActive = (data: string) => {
    const active = state.terminals[state.activeIndex];
    if (active?.stdin && !active.stdin.destroyed) {
      try {
        active.stdin.write(data);
      } catch (e) {
        console.error('Failed to write to terminal:', e);
      }
    }
  };

  return {
    ...state,
    nextTerminal,
    previousTerminal,
    enterTerminalMode,
    exitTerminalMode,
    writeToActive,
  };
}
