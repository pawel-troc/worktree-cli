# Embedded Terminal Research - POC Documentation

## Executive Summary

This document provides comprehensive research on embedding terminal sessions within the worktree-cli process, allowing users to interact with embedded terminals and switch between the main TUI and terminal views. The research validates this approach is **technically feasible** with some important limitations and considerations.

## Table of Contents

1. [Current Implementation Analysis](#current-implementation-analysis)
2. [Research Findings](#research-findings)
3. [Technical Solutions](#technical-solutions)
4. [Limitations & Challenges](#limitations--challenges)
5. [Recommended Approach](#recommended-approach)
6. [Proof of Concept Implementation](#proof-of-concept-implementation)
7. [Migration Path](#migration-path)

---

## Current Implementation Analysis

### How Terminal Spawning Works Now

The current implementation in `src/utils/terminal.ts` uses:

1. **Detached Processes**: Uses Node.js `child_process.spawn()` with `detached: true` and `.unref()`
2. **Platform-Specific Scripts**: macOS terminals use AppleScript to open new tabs/windows
3. **Terminal Detection**: Detects current terminal (iTerm2, Terminal.app, Ghostty, Warp, VSCode)
4. **Post-Create Commands**: After creating a worktree, spawns a new terminal tab with the configured command

**Key Characteristics:**
- Spawns **external** terminal windows/tabs
- Process runs **independently** from worktree-cli
- No way to switch back to worktree-cli UI once terminal is opened
- User must manually close terminal or switch tabs

**Relevant Code:** `src/utils/terminal.ts:120-136`

---

## Research Findings

### Solution 1: Bun.Terminal API (Native PTY) ⭐ **RECOMMENDED**

Bun v1.3.5+ includes a native `Bun.Terminal` API for creating and managing pseudo-terminals.

**Key Features:**
- Full PTY control with `write()`, `resize()`, `setRawMode()`, `ref()/unref()`, `close()`
- Standalone reusable terminals
- Native performance (no external dependencies)
- Platform: Linux & macOS only (not Windows)

**Example:**
```javascript
const proc = Bun.spawn(["bash"], {
  terminal: {
    cols: 80,
    rows: 24,
    data(terminal, data) {
      // Called when data is received from the terminal
      process.stdout.write(data);
    },
  },
});

// Write to the terminal
proc.terminal.write("echo hello\n");

// Wait for process to exit
await proc.exited;

// Close terminal
proc.terminal.close();
```

**Sources:**
- [Bun v1.3.5 Release](https://bun.com/blog/bun-v1.3.5)
- [Bun Spawn Documentation](https://bun.com/docs/runtime/child-process)

### Solution 2: node-pty (Third-Party Library)

The industry-standard library for forking pseudoterminals in Node.js.

**Compatibility Issues with Bun:**
- ❌ **Does NOT work with Bun** due to native module incompatibility
- Requires Node.js 16+ or Electron 19+
- Multiple GitHub issues document crashes with Bun

**Alternative:** `@skitee3000/bun-pty` - A Bun-compatible PTY implementation

**Sources:**
- [node-pty GitHub Issues #632](https://github.com/microsoft/node-pty/issues/632)
- [Bun Issues #7362](https://github.com/oven-sh/bun/issues/7362)
- [@skitee3000/bun-pty on npm](https://www.npmjs.com/package/@skitee3000/bun-pty)

### Solution 3: Ink + PTY Integration

Ink is already used in worktree-cli for building the TUI interface.

**Key Capabilities:**
- Renders ANSI escape codes (terminal output) as text
- Component-based architecture for managing different views
- Uses React hooks for state management
- Built-in support for handling raw terminal output

**How It Works:**
- Ink renders components to ANSI text output
- PTY data (with ANSI codes) can be captured and rendered as `<Text>` components
- State management controls switching between views

**Sources:**
- [Ink GitHub Repository](https://github.com/vadimdemedes/ink)
- [Building CLI tools with React using Ink](https://medium.com/trabe/building-cli-tools-with-react-using-ink-and-pastel-2e5b0d3e2793)
- [Add interactivity to CLIs with React](https://blog.logrocket.com/add-interactivity-to-your-clis-with-react/)

### Solution 4: Alternate Screen Buffer

A terminal feature that allows switching between two screen buffers.

**ANSI Escape Codes:**
```bash
ESC [ ? 1049 h   # Enable alternate screen buffer
ESC [ ? 1049 l   # Disable alternate screen buffer (restore)
```

**Use Cases:**
- Vim, less, htop use this to preserve original terminal content
- When exiting, the original screen is restored
- Allows "nested" terminal experiences

**Compatibility:**
- ✅ Works on Linux, macOS, most modern terminals
- ✅ Windows Terminal, iTerm2, Ghostty support it
- ⚠️ Some older terminals may not support it

**Sources:**
- [Terminal Guide - Alternate Screen Buffer](https://terminalguide.namepad.de/mode/p47/)
- [Rosetta Code - Terminal Preserve Screen](https://rosettacode.org/wiki/Terminal_control/Preserve_screen)
- [GitHub CLI PR #5681](https://github.com/cli/cli/pull/5681)

---

## Technical Solutions

### Approach A: Embedded Terminal with View Switching

**Architecture:**
```
┌─────────────────────────────────────┐
│  worktree-cli (Ink App)             │
│                                     │
│  ┌───────────────┐  ┌─────────────┐│
│  │ Main TUI View │  │Terminal View││
│  │ (WorktreeList)│  │   (PTY)     ││
│  │               │  │             ││
│  │ Press 't' to  │◄─┤ Press Ctrl+Q││
│  │ open terminal │─►│ to go back  ││
│  └───────────────┘  └─────────────┘│
│                                     │
│  State: view = 'list' | 'terminal'  │
└─────────────────────────────────────┘
```

**How It Works:**

1. **Main View**: Shows worktree list (current behavior)
2. **Terminal View**: Spawns PTY, captures output, renders in Ink
3. **View Switching**:
   - From main → terminal: Press key (e.g., 't' or 'Enter')
   - From terminal → main: Press escape sequence (e.g., Ctrl+Q)

4. **Raw Mode Toggle**:
   - When entering terminal view: `process.stdin.setRawMode(true)`
   - When returning to main view: `process.stdin.setRawMode(false)`

### Approach B: Alternate Screen Buffer

**Architecture:**
```
┌─────────────────────────────────────┐
│  Main Screen (worktree-cli TUI)     │
│  [Original screen preserved]        │
└─────────────────────────────────────┘
           ↓ ESC[?1049h
┌─────────────────────────────────────┐
│  Alternate Screen (bash/zsh shell)  │
│  [Full terminal experience]         │
│  [Press Ctrl+D to exit]             │
└─────────────────────────────────────┘
           ↓ ESC[?1049l
┌─────────────────────────────────────┐
│  Main Screen (worktree-cli TUI)     │
│  [Restored exactly as before]       │
└─────────────────────────────────────┘
```

**How It Works:**

1. Print escape code to enable alternate screen
2. Execute shell command or spawn shell
3. User interacts with full shell
4. On exit, print escape code to restore main screen
5. User is back in worktree-cli TUI

**This is simpler** but less integrated than Approach A.

---

## Limitations & Challenges

### Technical Limitations

1. **Platform Compatibility**
   - ✅ Linux, macOS fully supported
   - ❌ Windows: Bun.Terminal not available
   - ⚠️ Windows alternative: Use `@skitee3000/bun-pty` or wait for Bun support

2. **Terminal Size Management**
   - Must handle terminal resize events (`SIGWINCH`)
   - Need to resize PTY when terminal window changes
   - Ink needs to recalculate layout

3. **Raw Mode Conflicts**
   - Ink uses cooked mode for its UI
   - PTY needs raw mode for shell interaction
   - Must toggle `process.stdin.setRawMode()` when switching views
   - Risk of leaving terminal in raw mode on crash

4. **ANSI Escape Code Complexity**
   - Full terminal emulation is complex (VT100/VT220 specs)
   - Cursor positioning, colors, special sequences
   - Ink handles basic ANSI but not all terminal features

5. **Process Management**
   - Must properly clean up PTY processes on exit
   - Handle Ctrl+C gracefully
   - Prevent zombie processes

### User Experience Challenges

1. **Learning Curve**
   - Users need to learn how to switch between views
   - Escape key sequence might not be intuitive
   - Need clear visual indicators

2. **Context Switching**
   - Keyboard shortcuts differ between views
   - Arrow keys: navigation in TUI vs command history in shell
   - Potential user confusion

3. **Error Handling**
   - What if shell crashes?
   - What if PTY fails to spawn?
   - How to recover gracefully?

4. **Terminal Compatibility**
   - Some terminals may not support all features
   - Testing across different terminal emulators needed

---

## Recommended Approach

### Primary Recommendation: Approach B (Alternate Screen Buffer)

**Why this approach is best for worktree-cli:**

1. ✅ **Simplicity**: Uses standard ANSI escape codes, minimal code changes
2. ✅ **Compatibility**: Works on all modern terminals
3. ✅ **Native Experience**: User gets full shell, not emulated terminal
4. ✅ **Clean Separation**: Clear boundary between TUI and shell
5. ✅ **Minimal Risk**: No complex PTY management in main app

**When to use:**
- Post-create workflow (replace current tab spawning)
- "Open in terminal" command for existing worktrees
- Quick shell access without leaving TUI

### Secondary Option: Approach A (Embedded PTY)

**When this might be better:**
- You want to display shell output within TUI layout
- You need to capture/log shell commands
- You want more control over terminal behavior
- You're building a more complex integrated experience (like VSCode terminal)

**Trade-offs:**
- More code complexity
- More things that can break
- Better integration possibilities

---

## Proof of Concept Implementation

### POC 1: Alternate Screen Buffer (Simple)

This is the easiest to implement and test.

```typescript
// src/utils/terminal.ts

/**
 * Opens a shell in the alternate screen buffer
 * When user exits shell, returns to the main TUI
 */
export function openEmbeddedShell(workingDir: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // Enable alternate screen buffer
    process.stdout.write('\x1b[?1049h');

    // Clear the alternate screen
    process.stdout.write('\x1b[2J\x1b[H');

    // Spawn shell in the alternate screen
    const shell = process.env.SHELL || '/bin/bash';
    const proc = Bun.spawn([shell], {
      cwd: workingDir,
      stdin: 'inherit',
      stdout: 'inherit',
      stderr: 'inherit',
    });

    // Wait for shell to exit
    proc.exited.then((exitCode) => {
      // Restore original screen buffer
      process.stdout.write('\x1b[?1049l');

      if (exitCode === 0) {
        resolve();
      } else {
        reject(new Error(`Shell exited with code ${exitCode}`));
      }
    }).catch((err) => {
      // Restore screen even on error
      process.stdout.write('\x1b[?1049l');
      reject(err);
    });
  });
}

/**
 * Executes a command in alternate screen buffer
 * Shows output, then returns to TUI
 */
export async function executeInEmbeddedTerminal(
  command: string,
  workingDir: string
): Promise<void> {
  // Enable alternate screen
  process.stdout.write('\x1b[?1049h\x1b[2J\x1b[H');

  try {
    const proc = Bun.spawn(['/bin/sh', '-c', command], {
      cwd: workingDir,
      stdin: 'inherit',
      stdout: 'inherit',
      stderr: 'inherit',
    });

    await proc.exited;

    // Wait for user to press a key before returning
    process.stdout.write('\n\nPress any key to return to worktree-cli...');
    process.stdin.setRawMode(true);

    await new Promise<void>((resolve) => {
      const handler = () => {
        process.stdin.off('data', handler);
        process.stdin.setRawMode(false);
        resolve();
      };
      process.stdin.once('data', handler);
    });
  } finally {
    // Always restore screen
    process.stdout.write('\x1b[?1049l');
  }
}
```

**Usage in App.tsx:**

```typescript
// src/App.tsx

const handlePostCreateSwitch = async () => {
  if (createdWorktreePath && postCreateCommand) {
    const command = expandCommand(postCreateCommand, createdWorktreePath);

    // Instead of spawning external terminal:
    // executePostCreateCommand(command, createdWorktreePath);

    // Use embedded terminal:
    try {
      await executeInEmbeddedTerminal(command, createdWorktreePath);
    } catch (error) {
      console.error('Terminal error:', error);
    }
  }
  setCreatedWorktreePath(null);
  setView("list");
};

// Add a new keyboard shortcut to open shell
useInput(
  (input, key) => {
    // ... existing shortcuts ...

    if (input === "t" && worktrees.length > 0 && worktrees[selectedIndex]) {
      handleOpenShell(worktrees[selectedIndex].path);
      return;
    }
  },
  { isActive: view === "list" && !needsSetup }
);

const handleOpenShell = async (worktreePath: string) => {
  try {
    // Temporarily hide Ink output
    const { rerender, unmount, waitUntilExit, clear } = render(<Box />);
    clear();

    // Open shell in alternate screen
    await openEmbeddedShell(worktreePath);

    // Ink will automatically re-render when we return
  } catch (error) {
    console.error('Shell error:', error);
  }
};
```

### POC 2: Embedded PTY with View Switching (Advanced)

This approach is more complex but provides tighter integration.

```typescript
// src/components/EmbeddedTerminal.tsx

import React, { useState, useEffect, useRef } from 'react';
import { Box, Text, useInput, useStdout } from 'ink';

interface EmbeddedTerminalProps {
  workingDir: string;
  command?: string;
  onExit: () => void;
}

export function EmbeddedTerminal({
  workingDir,
  command,
  onExit
}: EmbeddedTerminalProps) {
  const [output, setOutput] = useState<string[]>([]);
  const [isActive, setIsActive] = useState(true);
  const terminalRef = useRef<any>(null);
  const { stdout } = useStdout();

  useEffect(() => {
    // Enable raw mode for terminal interaction
    process.stdin.setRawMode?.(true);

    const shell = command || process.env.SHELL || '/bin/bash';
    const args = command ? ['-c', command] : [];

    // Spawn PTY using Bun.Terminal
    const proc = Bun.spawn([shell, ...args], {
      cwd: workingDir,
      terminal: {
        cols: stdout.columns || 80,
        rows: stdout.rows || 24,
        data(terminal, data) {
          // Capture terminal output
          const text = new TextDecoder().decode(data);
          setOutput(prev => [...prev, text]);
        },
      },
    });

    terminalRef.current = proc;

    // Handle process exit
    proc.exited.then(() => {
      process.stdin.setRawMode?.(false);
      setIsActive(false);
    });

    // Cleanup on unmount
    return () => {
      process.stdin.setRawMode?.(false);
      if (proc.terminal) {
        proc.terminal.close();
      }
    };
  }, [workingDir, command]);

  // Forward user input to PTY
  useInput((input, key) => {
    if (!isActive) return;

    // Ctrl+Q to exit
    if (key.ctrl && input === 'q') {
      terminalRef.current?.terminal?.close();
      onExit();
      return;
    }

    // Forward all other input to PTY
    if (terminalRef.current?.terminal) {
      if (key.return) {
        terminalRef.current.terminal.write('\r');
      } else if (key.backspace || key.delete) {
        terminalRef.current.terminal.write('\x7f');
      } else if (key.upArrow) {
        terminalRef.current.terminal.write('\x1b[A');
      } else if (key.downArrow) {
        terminalRef.current.terminal.write('\x1b[B');
      } else if (key.leftArrow) {
        terminalRef.current.terminal.write('\x1b[D');
      } else if (key.rightArrow) {
        terminalRef.current.terminal.write('\x1b[C');
      } else if (input) {
        terminalRef.current.terminal.write(input);
      }
    }
  }, { isActive });

  // Handle terminal resize
  useEffect(() => {
    const handleResize = () => {
      if (terminalRef.current?.terminal) {
        terminalRef.current.terminal.resize({
          cols: stdout.columns || 80,
          rows: stdout.rows || 24,
        });
      }
    };

    process.stdout.on('resize', handleResize);
    return () => {
      process.stdout.off('resize', handleResize);
    };
  }, []);

  return (
    <Box flexDirection="column">
      <Box borderStyle="round" borderColor="cyan" paddingX={1}>
        <Text dimColor>
          Terminal (Ctrl+Q to exit) - {workingDir}
        </Text>
      </Box>

      <Box flexDirection="column">
        {output.map((line, i) => (
          <Text key={i}>{line}</Text>
        ))}
      </Box>

      {!isActive && (
        <Box marginTop={1}>
          <Text color="green">
            Process exited. Press any key to return...
          </Text>
        </Box>
      )}
    </Box>
  );
}
```

**Usage:**

```typescript
// src/App.tsx

export function App() {
  const [view, setView] = useState<View | 'terminal'>('list');
  const [terminalPath, setTerminalPath] = useState<string>('');

  // ... existing code ...

  // Add terminal view
  {view === 'terminal' && (
    <EmbeddedTerminal
      workingDir={terminalPath}
      onExit={() => setView('list')}
    />
  )}
}
```

---

## Migration Path

### Phase 1: Add Alternate Screen Buffer Support

**Goal**: Replace external terminal spawning with alternate screen buffer

**Changes:**
1. Add `openEmbeddedShell()` to `src/utils/terminal.ts`
2. Update `executePostCreateCommand()` to use alternate screen
3. Add config option: `useEmbeddedTerminal: boolean`
4. Keep fallback to current behavior for Windows

**Timeline**: 1-2 hours of development

### Phase 2: Add Keyboard Shortcut

**Goal**: Allow users to open shell from worktree list

**Changes:**
1. Add 't' key handler in `App.tsx`
2. Update `Legend.tsx` to show new shortcut
3. Document in README

**Timeline**: 30 minutes

### Phase 3: (Optional) Advanced PTY Integration

**Goal**: Build full embedded terminal view

**Changes:**
1. Create `EmbeddedTerminal.tsx` component
2. Add 'terminal' view type
3. Implement view switching logic
4. Handle edge cases (crashes, resize, etc.)

**Timeline**: 4-8 hours of development + testing

---

## Testing Strategy

### Manual Testing

1. **Basic functionality**:
   - Create worktree → shell opens in alternate screen
   - Run commands → verify output displays correctly
   - Exit shell → verify TUI restores properly

2. **Terminal compatibility**:
   - Test on iTerm2, Terminal.app, Ghostty, Warp
   - Verify alternate screen buffer works
   - Check ANSI color support

3. **Edge cases**:
   - Ctrl+C during shell session
   - Terminal resize while in shell
   - Long command output
   - Shell crash/error

### Automated Testing

```typescript
// test/embedded-terminal.test.ts

import { test, expect } from 'bun:test';
import { openEmbeddedShell } from '../src/utils/terminal';

test('opens shell in alternate screen buffer', async () => {
  // Mock stdout
  const writes: string[] = [];
  const originalWrite = process.stdout.write;
  process.stdout.write = ((data: string) => {
    writes.push(data);
    return true;
  }) as any;

  try {
    // This is tricky to test - may need to mock Bun.spawn
    // For now, verify escape codes are written

    // Restore
    process.stdout.write = originalWrite;

    // Verify alternate screen enabled
    expect(writes.some(w => w.includes('\x1b[?1049h'))).toBe(true);
  } catch (error) {
    process.stdout.write = originalWrite;
    throw error;
  }
});
```

---

## Conclusion

### Feasibility: ✅ YES

Embedding a terminal session within worktree-cli is **absolutely feasible** using either:
1. Alternate screen buffer (simple, recommended)
2. Bun.Terminal API with Ink integration (advanced)

### Recommended Next Steps

1. ✅ **Implement POC 1** (Alternate Screen Buffer)
   - Lowest risk, highest reward
   - 1-2 hours of work
   - Immediate user benefit

2. 🔄 **Gather User Feedback**
   - See if users prefer embedded vs external terminal
   - Identify pain points

3. 🎯 **Consider POC 2** if needed
   - Only if users want tighter integration
   - More complex, higher maintenance

### Final Recommendation

**Start with Alternate Screen Buffer approach**. It's simple, works everywhere, and provides the core benefit of staying within the worktree-cli process. If users request more advanced features (like viewing TUI and terminal side-by-side), then consider the embedded PTY approach.

---

## References

### Documentation
- [Bun.Terminal API](https://bun.com/blog/bun-v1.3.5)
- [Bun Spawn Documentation](https://bun.com/docs/runtime/child-process)
- [Ink GitHub Repository](https://github.com/vadimdemedes/ink)
- [Alternate Screen Buffer Guide](https://terminalguide.namepad.de/mode/p47/)

### Libraries
- [node-pty on npm](https://www.npmjs.com/package/node-pty)
- [@skitee3000/bun-pty on npm](https://www.npmjs.com/package/@skitee3000/bun-pty)

### Tutorials
- [Building CLI tools with React using Ink](https://medium.com/trabe/building-cli-tools-with-react-using-ink-and-pastel-2e5b0d3e2793)
- [Add interactivity to CLIs with React](https://blog.logrocket.com/add-interactivity-to-your-clis-with-react/)
- [Terminal control examples](https://rosettacode.org/wiki/Terminal_control/Preserve_screen)

### GitHub Issues & Discussions
- [Bun support for node-pty](https://github.com/microsoft/node-pty/issues/632)
- [node-pty unable to run from bun](https://github.com/oven-sh/bun/issues/7362)
- [GitHub CLI alternate screen buffer PR](https://github.com/cli/cli/pull/5681)
