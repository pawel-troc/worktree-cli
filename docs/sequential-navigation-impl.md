# Sequential Terminal Navigation - Implementation Guide

This guide provides everything needed to implement Branch 2: Sequential Terminal Navigation.

## Overview

**Goal**: Allow users to navigate between worktree terminals using Ctrl+N (next) and Ctrl+P (previous) while staying in terminal mode.

**Complexity**: Medium (⭐⭐)
**Time**: 4-8 hours
**Base**: Start from Branch 1 (Simple) and enhance it

---

## Architecture

```
┌─────────────────────────────────────────────┐
│  TUI (Worktree List)                        │
│  Press 'o' on worktree1 ────────┐           │
└─────────────────────────────────│───────────┘
                                  ↓
┌─────────────────────────────────────────────┐
│  Terminal Mode (Alternate Screen)           │
│                                             │
│  Active: worktree1 [visible]                │
│  /path/to/worktree1                         │
│  $ ls -la                                   │
│  $ git status                               │
│  $█                                         │
│                                             │
│  Buffered terminals (background):           │
│  - worktree2: /path/to/worktree2           │
│  - worktree3: /path/to/worktree3           │
│                                             │
│  [Ctrl+N: Next] [Ctrl+P: Prev] [Ctrl+Q: Exit]
└─────────────────────────────────────────────┘
                                  ↓ Ctrl+N
┌─────────────────────────────────────────────┐
│  Terminal Mode (Same Alternate Screen)       │
│                                             │
│  Active: worktree2 [visible]                │
│  /path/to/worktree2                         │
│  $ npm install                              │
│  $ npm test                                 │
│  $█                                         │
│                                             │
│  Buffered terminals (background):           │
│  - worktree1: /path/to/worktree1           │
│  - worktree3: /path/to/worktree3           │
│                                             │
│  [Ctrl+N: Next] [Ctrl+P: Prev] [Ctrl+Q: Exit]
└─────────────────────────────────────────────┘
```

---

## Step 1: Data Structures

### Terminal Instance

```typescript
// src/types/terminal.ts

export interface TerminalInstance {
  id: string;                   // Unique ID
  label: string;                // Display name
  workingDir: string;           // Worktree path
  buffer: string[];             // Output lines (last 1000)
  process: any;                 // Bun.spawn result
  terminal: any;                // Bun.Terminal or stdin
  isActive: boolean;            // Currently visible
  createdAt: number;            // Timestamp
  lastActiveAt: number;         // Last time user switched to it
}

export interface TerminalManagerState {
  terminals: TerminalInstance[];
  activeIndex: number;
  isInTerminalMode: boolean;
}
```

---

## Step 2: Terminal Manager Hook

Create `src/hooks/useTerminalManager.ts`:

```typescript
import { useState, useRef, useEffect } from 'react';
import type { TerminalInstance, TerminalManagerState } from '../types/terminal.ts';

export function useTerminalManager() {
  const [state, setState] = useState<TerminalManagerState>({
    terminals: [],
    activeIndex: 0,
    isInTerminalMode: false,
  });

  const processesRef = useRef<any[]>([]);

  // Create a new terminal instance
  const createTerminal = (workingDir: string, label?: string): TerminalInstance => {
    const id = `term-${Date.now()}`;
    const termLabel = label || workingDir.split('/').pop() || 'terminal';

    // Spawn process
    const proc = Bun.spawn([process.env.SHELL || '/bin/bash'], {
      cwd: workingDir,
      stdin: 'pipe',
      stdout: 'pipe',
      stderr: 'pipe',
      env: process.env,
    });

    const terminal: TerminalInstance = {
      id,
      label: termLabel,
      workingDir,
      buffer: [],
      process: proc,
      terminal: proc.stdin,
      isActive: false,
      createdAt: Date.now(),
      lastActiveAt: Date.now(),
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

          setState(prev => {
            const termIndex = prev.terminals.findIndex(t => t.id === id);
            if (termIndex === -1) return prev;

            const updated = [...prev.terminals];
            updated[termIndex] = {
              ...updated[termIndex],
              buffer: [...updated[termIndex].buffer, ...lines].slice(-1000),
            };

            return { ...prev, terminals: updated };
          });
        }
      } catch (e) {
        // Stream closed
      }
    })();

    processesRef.current.push(proc);
    return terminal;
  };

  // Add a terminal
  const addTerminal = (workingDir: string, label?: string) => {
    const terminal = createTerminal(workingDir, label);

    setState(prev => ({
      ...prev,
      terminals: [...prev.terminals, terminal],
      activeIndex: prev.terminals.length, // Make new terminal active
    }));
  };

  // Switch to next terminal
  const nextTerminal = () => {
    setState(prev => {
      if (prev.terminals.length === 0) return prev;

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
    setState(prev => {
      if (prev.terminals.length === 0) return prev;

      const prevIndex =
        prev.activeIndex === 0
          ? prev.terminals.length - 1
          : prev.activeIndex - 1;

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
    // Add terminal if not exists
    const existing = state.terminals.find(t => t.workingDir === workingDir);

    if (!existing) {
      addTerminal(workingDir, label);
    } else {
      // Switch to existing
      const index = state.terminals.findIndex(t => t.workingDir === workingDir);
      setState(prev => ({
        ...prev,
        activeIndex: index,
        terminals: prev.terminals.map((t, i) => ({
          ...t,
          isActive: i === index,
        })),
      }));
    }

    setState(prev => ({ ...prev, isInTerminalMode: true }));
  };

  // Exit terminal mode
  const exitTerminalMode = () => {
    setState(prev => ({ ...prev, isInTerminalMode: false }));
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      processesRef.current.forEach(proc => {
        try {
          proc.kill();
        } catch (e) {
          // Ignore
        }
      });
    };
  }, []);

  // Write to active terminal
  const writeToActive = (data: string) => {
    const active = state.terminals[state.activeIndex];
    if (active?.terminal) {
      try {
        active.terminal.write(data);
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
```

---

## Step 3: Sequential Terminal Component

Create `src/components/SequentialTerminal.tsx`:

```typescript
import React from 'react';
import { Box, Text, useInput } from 'ink';
import { useTerminalManager } from '../hooks/useTerminalManager.ts';

interface SequentialTerminalProps {
  onExit: () => void;
}

export function SequentialTerminal({ onExit }: SequentialTerminalProps) {
  const {
    terminals,
    activeIndex,
    nextTerminal,
    previousTerminal,
    writeToActive,
  } = useTerminalManager();

  const activeTerminal = terminals[activeIndex];

  useInput((input, key) => {
    // Ctrl+Q: Exit terminal mode
    if (key.ctrl && input === 'q') {
      onExit();
      return;
    }

    // Ctrl+N: Next terminal
    if (key.ctrl && input === 'n') {
      nextTerminal();
      return;
    }

    // Ctrl+P: Previous terminal
    if (key.ctrl && input === 'p') {
      previousTerminal();
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
    } else if (input && !key.ctrl && !key.meta) {
      writeToActive(input);
    }
  });

  if (!activeTerminal) {
    return (
      <Box>
        <Text>No active terminal</Text>
      </Box>
    );
  }

  const visibleLines = activeTerminal.buffer.slice(-20);

  return (
    <Box flexDirection="column">
      {/* Header */}
      <Box marginBottom={1}>
        <Text bold color="cyan">
          Terminal: {activeTerminal.label} ({activeIndex + 1}/{terminals.length})
        </Text>
      </Box>

      {/* Working directory */}
      <Box marginBottom={1}>
        <Text dimColor>📂 {activeTerminal.workingDir}</Text>
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
```

---

## Step 4: Integrate with App.tsx

Modify `src/App.tsx`:

```typescript
// Add import
import { SequentialTerminal } from './components/SequentialTerminal.tsx';
import { useTerminalManager } from './hooks/useTerminalManager.ts';

export function App() {
  // ... existing state ...

  // Add terminal manager
  const terminalManager = useTerminalManager();

  // Modify handleOpenWorktree
  const handleOpenWorktree = async (worktreePath: string) => {
    const config = await loadConfig(repoRoot);

    if (config.useEmbeddedTerminal) {
      // Enter sequential terminal mode
      const label = worktreePath.split('/').pop() || 'worktree';
      terminalManager.enterTerminalMode(worktreePath, label);
    } else {
      // External terminal (original)
      const command = expandCommand(postCreateCommand, worktreePath);
      executePostCreateCommand(command, worktreePath);
    }
  };

  // Add terminal mode view
  if (terminalManager.isInTerminalMode) {
    return (
      <SequentialTerminal
        onExit={() => terminalManager.exitTerminalMode()}
      />
    );
  }

  // ... rest of App component ...
}
```

---

## Step 5: Alternate Screen Integration

Wrap the sequential terminal in alternate screen buffer:

```typescript
// src/components/SequentialTerminal.tsx

export function SequentialTerminal({ onExit }: SequentialTerminalProps) {
  useEffect(() => {
    // Enable alternate screen
    process.stdout.write('\x1b[?1049h\x1b[2J\x1b[H');

    // Enable raw mode
    process.stdin.setRawMode(true);

    return () => {
      // Restore on unmount
      process.stdout.write('\x1b[?1049l');
      process.stdin.setRawMode(false);
    };
  }, []);

  // ... rest of component ...
}
```

---

## Step 6: Enhanced User Experience

### Add Terminal List Indicator

```typescript
// Show indicator of all terminals
<Box>
  {terminals.map((term, i) => (
    <Text key={term.id} dimColor={i !== activeIndex}>
      {i === activeIndex ? '●' : '○'} {term.label}{' '}
    </Text>
  ))}
</Box>
```

### Add Auto-Create on Navigate

```typescript
// In nextTerminal() - auto-create if needed
const nextTerminal = () => {
  // If only one terminal, suggest creating more
  if (state.terminals.length === 1) {
    // Show hint: "Only one terminal. Open more worktrees first"
    return;
  }

  // ... existing logic ...
};
```

---

## Step 7: Testing

### Manual Tests

1. **Basic Navigation**:
   ```bash
   wt
   # Press 'o' on worktree1
   # Terminal opens
   # Press Ctrl+N
   # Should prompt "only one terminal"
   # Press Ctrl+Q
   # Back to TUI
   # Press 'o' on worktree2
   # Now press Ctrl+N/Ctrl+P to navigate
   ```

2. **State Preservation**:
   ```bash
   # In terminal 1: ls -la
   # Press Ctrl+N (go to terminal 2)
   # In terminal 2: pwd
   # Press Ctrl+P (back to terminal 1)
   # Should see ls -la output still there
   ```

3. **Process Cleanup**:
   ```bash
   # Open several terminals
   # Press Ctrl+Q
   # Check processes: ps aux | grep bash
   # Should see no orphaned processes
   ```

---

## Potential Issues & Solutions

### Issue 1: Terminal Output Garbled

**Problem**: ANSI escape codes render incorrectly
**Solution**: Parse ANSI codes or use `strip-ansi` library

```typescript
import stripAnsi from 'strip-ansi';

const lines = stripAnsi(text).split('\n');
```

### Issue 2: Memory Leak

**Problem**: Terminal buffers grow indefinitely
**Solution**: Limit buffer size

```typescript
buffer: [...updated[termIndex].buffer, ...lines].slice(-1000),
```

### Issue 3: Process Not Cleaned Up

**Problem**: Orphaned bash processes
**Solution**: Track processes and kill on exit

```typescript
process.on('exit', () => {
  processesRef.current.forEach(p => p.kill());
});
```

---

## Optional Enhancements

### 1. Show Terminal Count in Status

```typescript
<Text dimColor>
  Terminal {activeIndex + 1} of {terminals.length}
</Text>
```

### 2. Quick Jump to Terminal

```typescript
// Ctrl+1-9: Jump to terminal N
if (key.ctrl && input >= '1' && input <= '9') {
  const index = parseInt(input) - 1;
  if (index < terminals.length) {
    jumpToTerminal(index);
  }
}
```

### 3. Close Inactive Terminals

```typescript
// Ctrl+W: Close current terminal (if more than 1)
if (key.ctrl && input === 'w' && terminals.length > 1) {
  closeTerminal(activeIndex);
}
```

---

## Completion Checklist

- [ ] Create `src/types/terminal.ts`
- [ ] Create `src/hooks/useTerminalManager.ts`
- [ ] Create `src/components/SequentialTerminal.tsx`
- [ ] Integrate with `src/App.tsx`
- [ ] Add alternate screen buffer
- [ ] Test navigation (Ctrl+N/Ctrl+P)
- [ ] Test state preservation
- [ ] Test process cleanup
- [ ] Add terminal count indicator
- [ ] Write README for branch
- [ ] Test with multiple worktrees
- [ ] Handle edge cases

---

## Time Estimate Breakdown

| Task | Time |
|------|------|
| Data structures | 30 min |
| Terminal manager hook | 2 hours |
| Sequential terminal component | 1.5 hours |
| App integration | 1 hour |
| Alternate screen integration | 30 min |
| Testing | 1.5 hours |
| Bug fixes | 1-2 hours |
| **Total** | **4-8 hours** |

---

## Success Criteria

✅ User can open terminal on worktree
✅ User can press Ctrl+N to go to next worktree terminal
✅ User can press Ctrl+P to go to previous worktree terminal
✅ Terminal state is preserved when switching
✅ User can press Ctrl+Q to exit to TUI
✅ No orphaned processes after exit
✅ Memory usage stays reasonable (<100MB for 10 terminals)

---

## Next Steps After Implementation

1. Test with real workflows
2. Gather user feedback
3. Consider adding quick jump (Ctrl+1-9)
4. Consider adding terminal close (Ctrl+W)
5. Optimize performance if needed
6. Decide if multi-tab (Branch 3) is needed
