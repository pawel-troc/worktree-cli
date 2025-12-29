# Embedded Terminal - Simple Approach

This branch implements the **simple embedded terminal** using alternate screen buffer.

## What Changed

### New Features

1. **Embedded Terminal Support**
   - Opens terminals inside worktree-cli using alternate screen buffer
   - Clean ANSI escape code based implementation
   - Preserves TUI state when entering/exiting terminal

2. **Config Option**: `useEmbeddedTerminal`
   - Toggle between embedded and external terminals
   - Configurable via Settings (press 's')
   - Default: `true` (embedded terminal enabled)

3. **Two Terminal Modes**:
   - **Execute Command**: Runs post-create command, waits for completion, returns to TUI
   - **Open Shell**: Opens interactive shell, returns to TUI on exit

### Files Modified

- `src/utils/terminal.ts`: Added `openEmbeddedShell()` and `executeInEmbeddedTerminal()`
- `src/utils/config.ts`: Added `useEmbeddedTerminal` to config interface
- `src/App.tsx`: Updated to use embedded terminal when enabled
- `src/components/Settings.tsx`: Added toggle for embedded terminal option

## Usage

### 1. After Creating a Worktree

When you create a worktree and select "Yes, run command":
- **Embedded mode**: Command executes in alternate screen buffer
- **External mode**: Spawns new terminal window/tab (original behavior)

### 2. Opening Existing Worktree

Press 'o' on any worktree:
- **Embedded mode**: Opens shell in alternate screen buffer
- **External mode**: Spawns new terminal window/tab

### 3. Toggle Settings

Press 's' → Navigate to "Use embedded terminal" → Press Enter to toggle

## Benefits

✅ **Stay in one window**: No more switching between terminal tabs
✅ **Preserve state**: TUI exactly as you left it when you exit shell
✅ **Cross-platform**: Works on Linux, macOS, Windows
✅ **Simple**: Just 100 lines of code, minimal complexity
✅ **No dependencies**: Uses standard ANSI escape codes

## Limitations

⚠️ **Single terminal**: Only one terminal at a time
⚠️ **No persistence**: Terminal state lost when you exit
⚠️ **No multitasking**: Can't run multiple shells simultaneously

## Implementation Details

### Alternate Screen Buffer

Uses ANSI escape codes:
- `\x1b[?1049h` - Enable alternate screen
- `\x1b[?1049l` - Restore original screen

### Flow

```
TUI (Main Screen)
      ↓ Press 'o' or post-create
Alternate Screen (Terminal)
      ↓ Type 'exit' or Ctrl+D
TUI (Main Screen - restored)
```

## Try It

```bash
# Create a worktree
wt
# Press 'c' to create
# Complete the wizard
# Select "Yes" to run command
# → Opens embedded terminal!
# Type 'exit' to return

# Or open existing worktree
wt
# Press 'o' on any worktree
# → Opens embedded shell!
```

## Comparison with Other Branches

See full comparison: [docs/BRANCH_COMPARISON.md](./docs/BRANCH_COMPARISON.md)

| Branch | Complexity | Features | Implementation Time |
|--------|-----------|----------|-------------------|
| **This one** (simple) | ⭐ Simple | Single terminal | 1-2 hours ✅ |
| Sequential | ⭐⭐ Medium | Navigate between terminals | 4-8 hours |
| Multi-terminal | ⭐⭐⭐⭐ Complex | Full tab management | 16-24 hours |
