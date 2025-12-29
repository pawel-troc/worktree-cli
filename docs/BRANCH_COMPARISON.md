# Embedded Terminal - Branch Comparison

This document compares the three embedded terminal implementation approaches available on separate branches.

## Quick Summary

| Branch | Status | Complexity | Features | Time Investment |
|--------|--------|------------|----------|----------------|
| [Simple](#branch-1-simple) | ✅ **Implemented** | ⭐ Easy | Single terminal | 2 hours |
| [Sequential](#branch-2-sequential) | 📋 **Planned** | ⭐⭐ Medium | Navigate between terminals | 4-8 hours |
| [Multi-Tab](#branch-3-multi-tab) | 📋 **Planned** | ⭐⭐⭐⭐ Complex | Full tab management | 16-24 hours |

---

## Branch 1: Simple (Alternate Screen Buffer) ✅

**Branch**: `claude/embedded-terminal-simple-1YG9V`

### Status
✅ **IMPLEMENTED** - Ready to use!

### What It Does

- Opens terminal in alternate screen buffer
- Single terminal at a time
- Clean transition: TUI → Terminal → TUI
- Type `exit` or `Ctrl+D` to return

### User Experience

```
1. User presses 'o' on worktree
2. Screen clears, shows embedded terminal
3. User works in shell
4. User types 'exit'
5. Back to TUI exactly as before
```

### Implementation

- **100 lines of code**
- Uses ANSI escape codes (`\x1b[?1049h/l`)
- No external dependencies
- Works everywhere

###  Try It

```bash
git checkout claude/embedded-terminal-simple-1YG9V
bun install
bun link
wt
# Press 'o' on any worktree!
```

### Pros

✅ Simple and reliable
✅ Works on all platforms
✅ Easy to understand and maintain
✅ No memory overhead
✅ Instant switching

### Cons

❌ Only one terminal at a time
❌ Can't switch between worktrees without exiting
❌ Terminal state not preserved

### Best For

- Users who want to stay in one window
- Simple workflows (one task at a time)
- Quick terminal access
- Testing the embedded terminal concept

---

## Branch 2: Sequential Navigation 📋

**Branch**: `claude/embedded-terminal-sequential-1YG9V` (planned)

### Status
📋 **PLANNED** - Implementation guide available

### What It Does

- Navigate between worktree terminals sequentially
- **Ctrl+N**: Next worktree terminal
- **Ctrl+P**: Previous worktree terminal
- **Ctrl+Q**: Return to TUI
- Buffers terminal state when switching

### User Experience

```
1. User presses 'o' on worktree1
2. Embedded terminal opens for worktree1
3. User presses Ctrl+N
4. Switches to worktree2 terminal
5. User presses Ctrl+P
6. Back to worktree1 (state restored from buffer)
7. User presses Ctrl+Q
8. Back to TUI
```

### Architecture

```
TUI (Main Screen)
    ↓ Press 'o'
Terminal Mode
├─ Active: worktree1 (/path/to/wt1) - visible
├─ Buffered: worktree2 (/path/to/wt2) - background
└─ Buffered: worktree3 (/path/to/wt3) - background

Press Ctrl+N/Ctrl+P to cycle through
Press Ctrl+Q to return to TUI
```

### Implementation Details

**New Files**:
- `src/components/SequentialTerminal.tsx` - Terminal view with navigation
- `src/hooks/useTerminalManager.ts` - Manages multiple terminal instances

**Key Features**:
1. **Terminal Buffer Manager**:
   ```typescript
   interface TerminalInstance {
     id: string;
     workingDir: string;
     buffer: string[]; // Last N lines of output
     process: any;     // Bun.spawn result
     isActive: boolean;
   }
   ```

2. **Navigation Logic**:
   ```typescript
   // Ctrl+N: Next terminal
   const nextTerminal = () => {
     const currentIndex = terminals.findIndex(t => t.isActive);
     const nextIndex = (currentIndex + 1) % terminals.length;
     switchToTerminal(nextIndex);
   };
   ```

3. **State Preservation**:
   - Each terminal process runs in background
   - Output captured to rolling buffer (last 1000 lines)
   - Render active terminal's buffer to screen

### Complexity

- **~300-400 lines of code**
- Bun.Terminal API for PTY
- State management for multiple terminals
- Output buffering and rendering

### Implementation Time

**4-8 hours** (estimate):
- 2 hours: Terminal buffer manager
- 2 hours: Navigation and switching logic
- 2 hours: State preservation and cleanup
- 2 hours: Testing and edge cases

### Pros

✅ Navigate between worktrees easily
✅ Don't lose work when switching
✅ Still relatively simple
✅ Good compromise between simple and complex

### Cons

❌ Only see one terminal at a time
❌ More memory usage (multiple PTY processes)
❌ More complex than simple approach
❌ Requires proper cleanup on exit

### Best For

- Users working on multiple worktrees
- Context switching between tasks
- Want to preserve terminal state
- Don't need side-by-side view

### Implementation Guide

See: [docs/sequential-navigation-impl.md](./sequential-navigation-impl.md)

---

## Branch 3: Multi-Terminal Tabs 📋

**Branch**: `claude/embedded-terminal-tabs-1YG9V` (planned)

### Status
📋 **PLANNED** - Implementation guide available

### What It Does

- Browser-like tab management
- Multiple terminals visible in tab bar
- **Ctrl+1-9**: Switch to tab N
- **Ctrl+T**: New tab
- **Ctrl+W**: Close tab
- **Ctrl+Q**: Exit to TUI

### User Experience

```
┌──────────────────────────────────────────────┐
│  worktree-cli - Terminal Mode                │
│  ┌────────┬────────┬────────┐               │
│  │ wt1 ● │  wt2   │  wt3   │  ← Tab bar    │
│  └────────┴────────┴────────┘               │
│                                              │
│  ┌────────────────────────────────────────┐ │
│  │ bash-5.1$ ls -la                       │ │
│  │ total 48                               │ │
│  │ ...                                    │ │  ← Active terminal
│  │ bash-5.1$ █                            │ │
│  └────────────────────────────────────────┘ │
│                                              │
│  [Ctrl+1-3: Switch] [Ctrl+T: New] [Ctrl+W: Close]
└──────────────────────────────────────────────┘
```

### Architecture

```typescript
interface TerminalTab {
  id: string;
  label: string;          // "worktree-1"
  workingDir: string;     // "/path/to/worktree"
  buffer: string[];       // Output lines
  process: any;           // Bun.spawn result
  terminal: any;          // Bun.Terminal instance
  isActive: boolean;
  createdAt: number;
}

const terminals: TerminalTab[] = [
  { id: '1', label: 'worktree-1', ... },
  { id: '2', label: 'worktree-2', ... },
  { id: '3', label: 'worktree-3', ... },
];
```

### Implementation Details

**New Files**:
- `src/components/MultiTerminal.tsx` - Main multi-terminal component
- `src/components/TerminalTab.tsx` - Individual tab component
- `src/components/TerminalTabBar.tsx` - Tab bar UI
- `src/hooks/useMultiTerminal.ts` - Multi-terminal state management
- `src/utils/terminal-buffer.ts` - ANSI parsing and buffering
- `src/utils/terminal-manager.ts` - Process lifecycle management

**Key Features**:
1. **Tab Bar Rendering**:
   ```tsx
   <Box>
     {terminals.map((term, index) => (
       <Text
         key={term.id}
         bold={index === activeTabIndex}
         color={index === activeTabIndex ? 'cyan' : 'gray'}
       >
         {index === activeTabIndex ? '●' : '○'} {term.label}
       </Text>
     ))}
   </Box>
   ```

2. **Output Buffering**:
   ```typescript
   proc = Bun.spawn(['bash'], {
     terminal: {
       cols: 80,
       rows: 24,
       data(terminal, data) {
         const text = new TextDecoder().decode(data);
         terminalTab.buffer.push(...parseANSI(text));
         if (terminalTab.isActive) forceUpdate();
       },
     },
   });
   ```

3. **Tab Navigation**:
   ```typescript
   useInput((input, key) => {
     if (key.ctrl && input >= '1' && input <= '9') {
       switchToTab(parseInt(input) - 1);
     }
     if (key.ctrl && input === 't') createNewTab();
     if (key.ctrl && input === 'w') closeTab(activeIndex);
   });
   ```

### Complexity

- **~800-1000 lines of code**
- Complex state management
- ANSI escape code parsing
- Memory management
- Process cleanup

### Implementation Time

**16-24 hours** (estimate):
- 4 hours: Multi-terminal state management
- 4 hours: Tab bar UI and navigation
- 4 hours: Output buffering and ANSI parsing
- 2 hours: Terminal resize handling
- 2 hours: Process lifecycle and cleanup
- 2 hours: Memory management
- 2-4 hours: Edge cases and testing

### Pros

✅ Full tmux-like experience
✅ See all terminals in tab bar
✅ Quick switching with keyboard shortcuts
✅ Create/close tabs on the fly
✅ Most powerful solution

### Cons

❌ Very complex implementation
❌ High memory usage (multiple PTYs)
❌ Many edge cases to handle
❌ ANSI parsing can be tricky
❌ Harder to maintain
❌ Potential performance issues

### Best For

- Power users
- Heavy multitasking workflows
- Users who live in the terminal
- Those who want tmux-like features
- Willing to accept complexity trade-off

### Implementation Guide

See: [docs/multi-terminal-tabs-impl.md](./multi-terminal-tabs-impl.md)

---

## Feature Comparison Matrix

| Feature | Simple | Sequential | Multi-Tab |
|---------|--------|------------|-----------|
| **Single terminal** | ✅ | ✅ | ✅ |
| **Navigate between terminals** | ❌ | ✅ | ✅ |
| **Visual tab bar** | ❌ | ❌ | ✅ |
| **See all terminals** | ❌ | ❌ | ✅ |
| **Quick switch (Ctrl+N)** | ❌ | ✅ | ✅ |
| **Create tabs on fly** | ❌ | ❌ | ✅ |
| **Close individual terminals** | N/A | N/A | ✅ |
| **Memory efficient** | ✅ | ⚠️ | ❌ |
| **Easy to maintain** | ✅ | ⚠️ | ❌ |
| **Cross-platform** | ✅ | ⚠️* | ⚠️* |
| **Implementation time** | 2h | 4-8h | 16-24h |

*Sequential and Multi-Tab require Bun.Terminal (Linux/macOS only)

---

## Recommendation

### Start Here: **Branch 1 (Simple)** ✅

Reasons:
1. ✅ **Already implemented** - try it now!
2. ✅ **Solves the core problem** - stay in one window
3. ✅ **Works everywhere** - no platform limitations
4. ✅ **Easy to maintain** - simple code
5. ✅ **Quick to implement** - 2 hours done

### Then Decide:

**If users ask for "navigate between terminals":**
→ Implement **Branch 2 (Sequential)** - good balance

**If users want "full tab management like tmux":**
→ Implement **Branch 3 (Multi-Tab)** - powerful but complex

### Don't Implement Multi-Tab Unless:

1. Users specifically request it
2. Simple approach isn't enough
3. Sequential navigation doesn't suffice
4. You're willing to invest 16-24 hours
5. You're prepared for ongoing maintenance

---

## Try Each Branch

```bash
# Branch 1: Simple (READY NOW!)
git checkout claude/embedded-terminal-simple-1YG9V
bun install && bun link
wt

# Branch 2: Sequential (PLANNED)
# See implementation guide: docs/sequential-navigation-impl.md

# Branch 3: Multi-Tab (PLANNED)
# See implementation guide: docs/multi-terminal-tabs-impl.md
# Or try POC: bun run docs/poc-multi-terminal.tsx
```

---

## Decision Matrix

Use this to decide which branch to use:

### Choose **Simple** if:
- ✅ You want it working today
- ✅ One terminal at a time is fine
- ✅ You value simplicity
- ✅ Cross-platform is important

### Choose **Sequential** if:
- ✅ You switch between worktrees frequently
- ✅ You want to preserve terminal state
- ✅ Navigation shortcuts are valuable
- ✅ 4-8 hours implementation is acceptable

### Choose **Multi-Tab** if:
- ✅ You need side-by-side visibility
- ✅ You work on 5+ worktrees simultaneously
- ✅ Tab management is critical
- ✅ 16-24 hours implementation is acceptable
- ✅ You're building a "terminal IDE"

---

## Next Steps

1. **Try Branch 1** (Simple) - it's ready!
   ```bash
   git checkout claude/embedded-terminal-simple-1YG9V
   bun link
   wt
   ```

2. **Gather user feedback**
   - Do users like embedded terminals?
   - Do they want navigation features?
   - How many terminals do they use?

3. **Decide on next step**:
   - **Happy with simple?** → Ship it! ✅
   - **Need navigation?** → Implement Branch 2
   - **Need full tabs?** → Implement Branch 3

4. **Iterate based on real usage**

---

## Questions?

- **Which branch should I use?** → Start with Simple (Branch 1)
- **Can I switch later?** → Yes! Branches are independent
- **Is multi-tab worth it?** → Only if you need tmux-like features
- **What about Windows?** → Simple works everywhere; others need Bun.Terminal

**Recommendation**: Ship Branch 1 (Simple) first, see how users like it, then decide if you need more features.
