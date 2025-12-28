# Multi-Terminal Tab Management - Technical Design

## Question

Can we have multiple "embedded" terminals with browser-like tab management indicating which terminal we're currently on?

## Answer: YES, but with a different approach ✅

The **alternate screen buffer** is binary - you can only have ONE alternate screen at a time. However, you CAN achieve multi-terminal tab management using a **PTY-based approach** with buffered output.

---

## Architecture Comparison

### ❌ Alternate Screen Buffer (Single Terminal Only)

```
┌─────────────────────┐
│   Main Screen       │
│   (worktree-cli)    │
└─────────────────────┘
         ↕ ESC[?1049h/l
┌─────────────────────┐
│  Alternate Screen   │  ← Only ONE alternate screen possible
│  (single terminal)  │
└─────────────────────┘
```

**Limitation**: Alternate screen is a terminal feature, not a buffer you control. You can't have multiple alternate screens.

### ✅ PTY-Based Multi-Terminal (Tab Management)

```
┌──────────────────────────────────────────────────────┐
│  worktree-cli - Multi-Terminal Mode                  │
│  ┌────────┬────────┬────────┬─────────┐             │
│  │ Term 1 │ Term 2 │ Term 3 │ Term 4  │  ← Tab bar  │
│  │  (*)   │        │        │         │             │
│  └────────┴────────┴────────┴─────────┘             │
│                                                      │
│  ┌────────────────────────────────────────────────┐ │
│  │ bash-5.1$ ls -la                               │ │
│  │ total 48                                       │ │
│  │ drwxr-xr-x  8 user  staff   256 Dec 28 10:30 .│ │
│  │ drwxr-xr-x  5 user  staff   160 Dec 27 14:20 ..│ │
│  │ -rw-r--r--  1 user  staff  1024 Dec 28 10:30 │ │  ← Active terminal output
│  │                                                │ │
│  │ bash-5.1$ █                                    │ │
│  └────────────────────────────────────────────────┘ │
│                                                      │
│  [Ctrl+1-4: Switch tabs] [Ctrl+T: New] [Ctrl+W: Close] [Ctrl+Q: Exit]
└──────────────────────────────────────────────────────┘

Background PTY processes:
  - Terminal 1: Running bash in /path/to/worktree1 (active, buffered)
  - Terminal 2: Running bash in /path/to/worktree2 (background, buffered)
  - Terminal 3: Running zsh in /path/to/worktree3 (background, buffered)
  - Terminal 4: idle
```

---

## How It Works

### 1. Multiple PTY Instances

Each terminal tab is a separate PTY process running in the background:

```typescript
interface TerminalTab {
  id: string;
  label: string;
  workingDir: string;
  process: any; // Bun.spawn result
  terminal: any; // Bun.Terminal instance
  buffer: string[]; // Buffered output lines
  isActive: boolean;
}

const terminals: TerminalTab[] = [
  { id: '1', label: 'worktree-1', workingDir: '/path/1', ... },
  { id: '2', label: 'worktree-2', workingDir: '/path/2', ... },
  { id: '3', label: 'worktree-3', workingDir: '/path/3', ... },
];
```

### 2. Output Buffering

Each PTY's output is captured and stored in a rolling buffer:

```typescript
const proc = Bun.spawn(['bash'], {
  cwd: workingDir,
  terminal: {
    cols: 80,
    rows: 24,
    data(terminal, data) {
      const text = new TextDecoder().decode(data);

      // Add to this terminal's buffer
      terminalTab.buffer.push(...text.split('\n'));

      // Keep buffer size manageable (e.g., last 1000 lines)
      if (terminalTab.buffer.length > 1000) {
        terminalTab.buffer = terminalTab.buffer.slice(-1000);
      }

      // If this is the active tab, trigger re-render
      if (terminalTab.isActive) {
        forceUpdate();
      }
    },
  },
});
```

### 3. Tab Navigation

Use Ink's state management and keyboard shortcuts:

```typescript
const [activeTabIndex, setActiveTabIndex] = useState(0);

useInput((input, key) => {
  // Switch tabs with Ctrl+1, Ctrl+2, etc.
  if (key.ctrl && input >= '1' && input <= '9') {
    const tabIndex = parseInt(input) - 1;
    if (tabIndex < terminals.length) {
      setActiveTabIndex(tabIndex);
    }
  }

  // New tab with Ctrl+T
  if (key.ctrl && input === 't') {
    createNewTerminal();
  }

  // Close tab with Ctrl+W
  if (key.ctrl && input === 'w') {
    closeTerminal(activeTabIndex);
  }

  // Forward input to active terminal
  const activeTerminal = terminals[activeTabIndex];
  if (activeTerminal?.terminal) {
    activeTerminal.terminal.write(input);
  }
});
```

### 4. Render Active Terminal

Only render the active terminal's buffer:

```typescript
<Box flexDirection="column">
  {/* Tab bar */}
  <Box>
    {terminals.map((term, index) => (
      <Box key={term.id} marginRight={1}>
        <Text
          bold={index === activeTabIndex}
          color={index === activeTabIndex ? 'cyan' : 'gray'}
        >
          {index === activeTabIndex ? '●' : '○'} {term.label}
        </Text>
      </Box>
    ))}
  </Box>

  {/* Active terminal output */}
  <Box flexDirection="column" borderStyle="round">
    {terminals[activeTabIndex].buffer.slice(-24).map((line, i) => (
      <Text key={i}>{line}</Text>
    ))}
  </Box>

  {/* Status bar */}
  <Box>
    <Text dimColor>
      [Ctrl+1-{terminals.length}] Switch | [Ctrl+T] New | [Ctrl+W] Close | [Ctrl+Q] Exit
    </Text>
  </Box>
</Box>
```

---

## Implementation Challenges

### 1. Output Buffering Complexity

**Challenge**: PTY output includes ANSI escape codes for cursor movement, colors, etc.

**Solution**: You need to parse and interpret ANSI codes to maintain a proper buffer:

```typescript
import ansi from 'ansi-escapes';
import stripAnsi from 'strip-ansi';

// Store both raw and parsed output
interface TerminalBuffer {
  raw: string;        // Raw ANSI output
  lines: string[];    // Parsed visible lines
  cursorX: number;
  cursorY: number;
}
```

**Libraries to help**:
- `ansi-escapes` - Generate ANSI codes
- `strip-ansi` - Remove ANSI codes
- `ansi-regex` - Parse ANSI sequences
- Consider a VT100 emulator library like `node-pty`'s built-in parser

### 2. Terminal Size Management

**Challenge**: Each terminal needs to know its size for proper rendering.

**Solution**:
- Detect terminal size with `process.stdout.columns/rows`
- Resize all PTYs when terminal window changes
- Account for UI chrome (tab bar, status bar)

```typescript
process.stdout.on('resize', () => {
  const availableRows = process.stdout.rows - 3; // Minus tab bar and status
  const availableCols = process.stdout.columns;

  terminals.forEach(term => {
    if (term.terminal) {
      term.terminal.resize({ cols: availableCols, rows: availableRows });
    }
  });
});
```

### 3. Raw Mode Management

**Challenge**: Ink needs cooked mode, but terminals need raw mode.

**Solution**: Toggle based on active view:

```typescript
// When entering terminal mode
process.stdin.setRawMode(true);

// When returning to worktree list
process.stdin.setRawMode(false);

// On exit, always restore
process.on('exit', () => {
  process.stdin.setRawMode(false);
});
```

### 4. Memory Management

**Challenge**: Multiple PTY processes and buffers consume memory.

**Solutions**:
- Limit buffer size per terminal (e.g., 1000 lines)
- Kill inactive terminals after timeout
- Provide "hibernate" option to pause unused terminals

```typescript
const MAX_BUFFER_LINES = 1000;
const INACTIVE_TIMEOUT = 5 * 60 * 1000; // 5 minutes

function pruneBuffer(terminal: TerminalTab) {
  if (terminal.buffer.length > MAX_BUFFER_LINES) {
    terminal.buffer = terminal.buffer.slice(-MAX_BUFFER_LINES);
  }
}

function hibernateInactiveTerminals() {
  terminals.forEach(term => {
    if (!term.isActive && Date.now() - term.lastActiveTime > INACTIVE_TIMEOUT) {
      term.terminal.close();
      term.isHibernated = true;
    }
  });
}
```

### 5. Process Cleanup

**Challenge**: Ensure all PTY processes are killed on exit.

**Solution**:

```typescript
const activeProcesses: any[] = [];

function createTerminal(workingDir: string) {
  const proc = Bun.spawn(['bash'], { /* ... */ });
  activeProcesses.push(proc);
  return proc;
}

// Cleanup on exit
process.on('exit', () => {
  activeProcesses.forEach(proc => {
    try {
      proc.terminal?.close();
      proc.kill();
    } catch (e) {
      // Ignore errors during cleanup
    }
  });
});

// Handle Ctrl+C
process.on('SIGINT', () => {
  activeProcesses.forEach(proc => proc.terminal?.close());
  process.exit(0);
});
```

---

## Recommended Architecture

### Hybrid Approach: Main TUI + Multi-Terminal Mode

```
worktree-cli (Main TUI)
├─ View: worktree-list (default)
│   └─ Press 'o' on worktree → Open in multi-terminal mode
│
└─ View: multi-terminal
    ├─ Tab 1: /path/to/worktree1
    ├─ Tab 2: /path/to/worktree2
    ├─ Tab 3: /path/to/worktree3
    └─ Press Ctrl+Q → Return to worktree-list
```

**Flow**:
1. User navigates worktree list
2. Presses 'o' on a worktree → Opens multi-terminal mode with that worktree in Tab 1
3. User can create more tabs (Ctrl+T) for other worktrees
4. User switches between tabs (Ctrl+1, Ctrl+2, etc.)
5. Press Ctrl+Q → Return to main worktree list, all terminals are closed

**Benefits**:
- Clean separation between browsing worktrees and working in them
- Multiple terminals available when needed
- Easy to return to main menu
- All state cleaned up when exiting terminal mode

---

## Simplified Alternative: Sequential Terminal Access

If full multi-tab management is too complex, consider this simpler approach:

```
worktree-cli Main Screen
↓ Press 'o' on worktree
Terminal for worktree-1 (Alternate Screen Buffer)
↓ Press Ctrl+N (next worktree)
Terminal for worktree-2 (Same Alternate Screen, new process)
↓ Press Ctrl+P (previous worktree)
Terminal for worktree-1 (Restored from buffer or new process)
↓ Press Ctrl+Q
Back to worktree-cli Main Screen
```

**Pros**:
- Simpler implementation
- Still allows navigating between worktrees
- Uses alternate screen buffer (reliable)

**Cons**:
- Only one terminal visible at a time
- Need to buffer or restart terminals when switching

---

## Proof of Concept Implementation

See `docs/poc-multi-terminal.tsx` for a working example.

**Key Features Demonstrated**:
- Multiple PTY instances
- Tab bar with active indicator
- Keyboard shortcuts for tab navigation
- Output buffering
- Process cleanup

**Try it**:
```bash
bun run docs/poc-multi-terminal.tsx
```

---

## Comparison with tmux

You're essentially building a **mini tmux** inside your Ink app!

| Feature | tmux | Multi-Terminal in Ink |
|---------|------|----------------------|
| Multiple terminals | ✅ Sessions/Windows | ✅ Tabs |
| Background processes | ✅ Detached sessions | ✅ Buffered PTYs |
| Tab navigation | ✅ `Ctrl+b` + number | ✅ `Ctrl+number` |
| Split panes | ✅ Horizontal/vertical | ⚠️ Possible but complex |
| Session persistence | ✅ Survives disconnect | ❌ Killed on exit |
| Integration with TUI | ❌ Separate tool | ✅ Seamless integration |

**When to use which**:
- **Use tmux**: If users need persistent sessions that survive disconnection
- **Use Multi-Terminal in Ink**: For seamless integration with worktree-cli TUI

---

## Implementation Complexity

### Simple (1-2 hours): Single Alternate Screen
- One terminal at a time
- Easy implementation
- Good UX

### Medium (4-8 hours): Sequential Terminal Access
- Navigate between terminals with keyboard shortcuts
- Buffer previous terminal states
- Better UX than single terminal

### Complex (16-24 hours): Full Multi-Terminal Tabs
- Multiple simultaneous PTYs
- Tab bar UI
- Full keyboard navigation
- Best UX but highest complexity

---

## Recommendation for worktree-cli

### Phase 1: Single Embedded Terminal
Start with the alternate screen buffer approach from the original research.

**Implementation**: 1-2 hours
**User Value**: High (stay in one terminal window)

### Phase 2: Sequential Terminal Navigation
Add Ctrl+N/Ctrl+P to navigate between worktrees while in terminal mode.

**Implementation**: +2-4 hours
**User Value**: Medium (convenience)

### Phase 3 (Optional): Full Multi-Terminal Tabs
Only implement if users strongly request it.

**Implementation**: +16-24 hours
**User Value**: Medium (nice to have)

---

## Conclusion

**Yes, multi-terminal tab management is feasible**, but it requires the PTY-based approach with output buffering, not the alternate screen buffer approach.

**Trade-offs**:
- ✅ Awesome user experience (like VSCode terminal tabs)
- ✅ Seamless integration with Ink TUI
- ❌ Significantly more complex than single terminal
- ❌ More memory overhead (multiple PTY processes)
- ❌ More edge cases to handle

**Recommendation**: Start simple (single terminal with alternate screen buffer), then add sequential navigation if users request it, and only build full multi-terminal tabs if there's strong demand.

The complexity jump from single terminal to multi-terminal is significant. Make sure the use case justifies the engineering effort!

---

## References

### Terminal Multiplexers
- [Introduction to tmux](https://www.redhat.com/en/blog/introduction-tmux-linux)
- [Screen and tmux for Session Management](https://www.linuxbash.sh/post/the-screen-and-tmux-for-session-management)
- [tmux Quick Guide](https://hamvocke.com/blog/a-quick-and-easy-guide-to-tmux/)

### Ink Multi-View Navigation
- [Ink GitHub Repository](https://github.com/vadimdemedes/ink)
- [Building CLI tools with React using Ink](https://medium.com/trabe/building-cli-tools-with-react-using-ink-and-pastel-2e5b0d3e2793)
- [Ink v3 Advanced Components](https://developerlife.com/2021/11/25/ink-v3-advanced-ui-components/)

### Related Technologies
- [Bun.Terminal API](https://bun.com/blog/bun-v1.3.5)
- [Ink UI Components](https://github.com/vadimdemedes/ink-ui)
