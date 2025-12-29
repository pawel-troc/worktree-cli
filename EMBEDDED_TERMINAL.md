# Embedded Terminal - Sequential Navigation

This branch implements **sequential terminal navigation** with the ability to switch between multiple worktree terminals.

## What Changed from Branch 1 (Simple)

### New Features

1. **Multiple Terminal Support**
   - Open terminals for multiple worktrees
   - Each terminal runs independently in the background
   - Output buffered for each terminal (last 1000 lines)

2. **Sequential Navigation**
   - **Ctrl+N**: Switch to next worktree terminal
   - **Ctrl+P**: Switch to previous worktree terminal
   - **Ctrl+Q**: Exit terminal mode and return to TUI

3. **Terminal State Preservation**
   - Terminal processes keep running when you switch away
   - Output is buffered and restored when you switch back
   - Seamless context switching between worktrees

4. **Visual Terminal Indicator**
   - Shows all open terminals in a bar
   - Active terminal highlighted
   - Counter showing current position (e.g., "2/3")

### Files Added

- `src/types/terminal.ts`: TypeScript interfaces for terminal instances
- `src/hooks/useTerminalManager.ts`: Hook managing multiple terminal instances
- `src/components/SequentialTerminal.tsx`: UI component for sequential terminal mode

### Files Modified

- `src/App.tsx`: Integrated sequential terminal mode
- `EMBEDDED_TERMINAL.md`: Updated documentation

## Usage

### Opening a Terminal

1. Run `wt` to open worktree-cli
2. Navigate to a worktree (using arrow keys)
3. Press 'o' to open terminal
4. Terminal opens in alternate screen buffer

### Navigating Between Terminals

1. Open another worktree's terminal (return to TUI with Ctrl+Q, then press 'o' on another)
2. Use keyboard shortcuts:
   - **Ctrl+N**: Next terminal
   - **Ctrl+P**: Previous terminal
3. Terminal state is preserved when you switch
4. See indicator bar showing all terminals

### Exiting Terminal Mode

- Press **Ctrl+Q** to return to worktree list
- All terminal processes are cleaned up
- You're back to the TUI exactly as before

## Example Workflow

```
1. wt                          # Open worktree-cli
2. Press 'o' on worktree-1     # Opens terminal for worktree-1
3. cd src && ls                # Work in worktree-1
4. Press Ctrl+Q                # Return to TUI
5. Press 'o' on worktree-2     # Opens terminal for worktree-2 (worktree-1 still running)
6. npm install                 # Work in worktree-2
7. Press Ctrl+P                # Switch back to worktree-1
8. # You see previous output!  # State preserved
9. Press Ctrl+Q                # Exit, both terminals cleaned up
```

## Visual Interface

```
┌──────────────────────────────────────────────┐
│  worktree-1                          (1/3)   │
│  📂 /path/to/worktree-1                      │
│                                              │
│  ● worktree-1  ○ worktree-2  ○ worktree-3   │
│  ──────────────────────────────────────────  │
│                                              │
│  bash-5.1$ ls -la                            │
│  total 48                                    │
│  ...                                         │
│  bash-5.1$ █                                 │
│                                              │
│  [Ctrl+N: Next] [Ctrl+P: Previous] [Ctrl+Q: Exit]
└──────────────────────────────────────────────┘
```

## Benefits

✅ Multi-worktree workflow
✅ Preserve terminal context
✅ Quick keyboard navigation
✅ Visual feedback
✅ Single terminal window

## Limitations

⚠️ More memory usage (multiple processes)
⚠️ Buffer limited to 1000 lines
⚠️ Sequential navigation only

## Comparison

| Feature | Simple (Branch 1) | Sequential (This) | Multi-Tab (Branch 3) |
|---------|------------------|-------------------|---------------------|
| Multiple terminals | ❌ | ✅ | ✅ |
| Navigate between | ❌ | ✅ Ctrl+N/P | ✅ Ctrl+1-9 |
| Visual tabs | ❌ | Indicator | Full tab bar |
| Complexity | ⭐ | ⭐⭐ | ⭐⭐⭐⭐ |

## Try It

```bash
bun install && bun link && wt
```
