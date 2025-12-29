import { useState, useRef, useEffect } from 'react';
import type { TerminalTab, MultiTerminalState } from '../types/terminal.ts';
import { spawn } from 'child_process';

export function useMultiTerminal(initialWorkingDir?: string, initialLabel?: string) {
  const [state, setState] = useState<MultiTerminalState>({
    tabs: [],
    activeTabIndex: 0,
  });

  const processesRef = useRef<any[]>([]);

  // Create a new terminal tab
  const createTab = (workingDir: string, label?: string): TerminalTab => {
    const id = `tab-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const tabLabel = label || workingDir.split('/').pop() || 'terminal';

    // Spawn shell process
    const proc = spawn(process.env.SHELL || '/bin/bash', [], {
      cwd: workingDir,
      stdio: ['pipe', 'pipe', 'pipe'],
      env: process.env,
    });

    const tab: TerminalTab = {
      id,
      label: tabLabel,
      workingDir,
      buffer: [`Welcome to ${tabLabel}`, `Working directory: ${workingDir}`, ''],
      process: proc,
      stdin: proc.stdin,
      isActive: false,
      createdAt: Date.now(),
      lastActiveAt: Date.now(),
    };

    // Read stdout
    if (proc.stdout) {
      proc.stdout.on('data', (data: Buffer) => {
        const text = data.toString();
        const lines = text.split('\n');

        setState((prev) => {
          const tabIndex = prev.tabs.findIndex((t) => t.id === id);
          if (tabIndex === -1) return prev;

          const updated = [...prev.tabs];
          updated[tabIndex] = {
            ...updated[tabIndex],
            buffer: [...updated[tabIndex].buffer, ...lines].slice(-1000),
          };

          return { ...prev, tabs: updated };
        });
      });
    }

    // Read stderr
    if (proc.stderr) {
      proc.stderr.on('data', (data: Buffer) => {
        const text = data.toString();
        const lines = text.split('\n').map((line) => `\x1b[31m${line}\x1b[0m`);

        setState((prev) => {
          const tabIndex = prev.tabs.findIndex((t) => t.id === id);
          if (tabIndex === -1) return prev;

          const updated = [...prev.tabs];
          updated[tabIndex] = {
            ...updated[tabIndex],
            buffer: [...updated[tabIndex].buffer, ...lines].slice(-1000),
          };

          return { ...prev, tabs: updated };
        });
      });
    }

    // Handle exit
    proc.on('exit', (code) => {
      setState((prev) => {
        const tabIndex = prev.tabs.findIndex((t) => t.id === id);
        if (tabIndex === -1) return prev;

        const updated = [...prev.tabs];
        updated[tabIndex] = {
          ...updated[tabIndex],
          buffer: [
            ...updated[tabIndex].buffer,
            '',
            code === 0 ? '\x1b[32m✓ Process exited\x1b[0m' : `\x1b[31m✗ Exited with code ${code}\x1b[0m`,
          ],
        };

        return { ...prev, tabs: updated };
      });
    });

    processesRef.current.push(proc);
    return tab;
  };

  // Add a new tab
  const addTab = (workingDir: string, label?: string) => {
    const tab = createTab(workingDir, label);

    setState((prev) => {
      const newTabs = [...prev.tabs, tab];
      const newIndex = newTabs.length - 1;

      return {
        tabs: newTabs.map((t, i) => ({ ...t, isActive: i === newIndex })),
        activeTabIndex: newIndex,
      };
    });
  };

  // Switch to tab by index
  const switchToTab = (index: number) => {
    setState((prev) => {
      if (index < 0 || index >= prev.tabs.length) return prev;

      return {
        ...prev,
        tabs: prev.tabs.map((t, i) => ({
          ...t,
          isActive: i === index,
          lastActiveAt: i === index ? Date.now() : t.lastActiveAt,
        })),
        activeTabIndex: index,
      };
    });
  };

  // Close tab by index
  const closeTab = (index: number) => {
    setState((prev) => {
      if (prev.tabs.length === 1) return prev; // Don't close last tab

      const tab = prev.tabs[index];
      if (tab) {
        try {
          tab.process?.kill();
          tab.stdin?.end();
        } catch (e) {
          // Ignore errors
        }
      }

      const newTabs = prev.tabs.filter((_, i) => i !== index);
      let newActiveIndex = prev.activeTabIndex;

      if (index === prev.activeTabIndex) {
        newActiveIndex = Math.max(0, index - 1);
      } else if (index < prev.activeTabIndex) {
        newActiveIndex = prev.activeTabIndex - 1;
      }

      return {
        tabs: newTabs.map((t, i) => ({ ...t, isActive: i === newActiveIndex })),
        activeTabIndex: newActiveIndex,
      };
    });
  };

  // Write to active tab
  const writeToActive = (data: string) => {
    const activeTab = state.tabs[state.activeTabIndex];
    if (activeTab?.stdin && !activeTab.stdin.destroyed) {
      try {
        activeTab.stdin.write(data);
      } catch (e) {
        console.error('Failed to write to terminal:', e);
      }
    }
  };

  // Initialize with first tab if provided
  useEffect(() => {
    if (initialWorkingDir && state.tabs.length === 0) {
      addTab(initialWorkingDir, initialLabel);
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      processesRef.current.forEach((proc) => {
        try {
          proc.kill();
        } catch (e) {
          // Ignore
        }
      });
    };
  }, []);

  return {
    tabs: state.tabs,
    activeTabIndex: state.activeTabIndex,
    addTab,
    switchToTab,
    closeTab,
    writeToActive,
  };
}
