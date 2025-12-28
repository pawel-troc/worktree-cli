# Tmux Hybrid POC

## Overview

This is a proof of concept for a hybrid approach to multi-worktree management. Instead of spawning detached processes in separate terminal windows/tabs, this POC integrates tmux sessions directly into the CLI workflow.

## Architecture

### Flow Diagram

```
User creates worktree
        ↓
Creation successful
        ↓
PostCreatePrompt (3 options)
    ├── Switch (original behavior - spawn new terminal)
    ├── Tmux Mode (NEW - hybrid approach) ⭐
    └── Stay (return to list)
        ↓
    TmuxView Component
        ├── Tab Bar (browser-like tabs for sessions)
        ├── Session Info (path, command)
        └── Tmux Session Management
```

### Components

1. **TmuxView.tsx** (`src/components/TmuxView.tsx`)
   - Main component for the hybrid interface
   - Shows active tmux sessions as tabs
   - Manages session lifecycle (create, attach, kill)
   - Provides browser-like tab navigation

2. **TmuxManager** (`src/utils/tmux.ts`)
   - Utility functions for tmux session management
   - Session creation and attachment
   - Session listing and cleanup
   - Tmux availability detection

3. **PostCreatePrompt** (modified)
   - Added third option: "Tmux Mode"
   - Routes to TmuxView instead of spawning process

4. **App.tsx** (modified)
   - Added "tmux" view type
   - State management for tmux sessions
   - Integration handlers

### Layout

```
┌────────────────────────────────────────────┐
│ ⚡ Hybrid Tmux Mode - Multi-Worktree Mgmt │
├────────────────────────────────────────────┤
│ Active Sessions:                           │
│ ▶ [1] wt-feature-auth  [2] wt-bugfix-ui   │
├────────────────────────────────────────────┤
│   Path: /path/to/worktree                  │
│   Command: claude code                     │
├────────────────────────────────────────────┤
│ 💡 How it works:                           │
│ • Press [a] to attach to selected session  │
│ • Inside tmux, Ctrl+B,D to detach          │
│ • Arrow keys to navigate sessions          │
│ • Press [x] to kill selected session       │
├────────────────────────────────────────────┤
│ [←/→] Switch tabs  [a] Attach  [q] Exit    │
└────────────────────────────────────────────┘
```

## How It Works

### 1. Creating a Session

When user selects "Tmux Mode" after creating a worktree:
- A unique tmux session is created: `wt-{worktree-name}`
- Session starts in the worktree directory
- Post-create command is executed in the session
- Session runs detached in the background

### 2. Managing Sessions

The TmuxView component:
- Lists all active `wt-*` sessions as tabs
- Allows navigation with arrow keys (browser-like)
- Shows session details (path, command)
- Tracks sessions and refreshes every 2 seconds

### 3. Attaching to Sessions

When user presses `[a]`:
- Ink app exits temporarily
- Control is handed to tmux
- User can work in the full terminal
- Detaching (Ctrl+B, D) returns to... exit (limitation)

### 4. Cleanup

- Sessions can be killed individually with `[x]`
- All sessions are killed when exiting with `[q]`

## Limitations & Future Improvements

### Current Limitations

1. **No Return After Attach**: When user attaches to a tmux session and then detaches, the Ink app cannot be restarted. This is a limitation of the current implementation.

2. **No Real Terminal Embedding**: We're not actually embedding a terminal in the Ink UI. Instead, we provide a management interface that hands control to tmux when needed.

3. **Tmux Required**: This POC requires tmux to be installed on the system.

### Potential Improvements

1. **True Terminal Embedding**
   - Use `node-pty` or similar to embed terminal
   - Render terminal output in Ink using `ink-terminal` or custom renderer
   - Keep control within the Ink app

2. **Multi-Session View**
   - Show multiple terminal sessions simultaneously
   - Split panes like tmux but rendered in Ink
   - Switch between sessions without leaving the app

3. **Session Persistence**
   - Save session configuration to disk
   - Resume sessions across CLI restarts
   - Smart session recovery

4. **Enhanced Tab Management**
   - Close tabs with keyboard shortcuts
   - Reorder tabs
   - Search/filter sessions
   - Session groups/workspaces

5. **Better Integration**
   - Add tmux mode from the list view (not just post-create)
   - Quick switch between all worktrees
   - Tmux status integration
   - Custom tmux configuration per worktree

## Dependencies

- **tmux**: Must be installed on the system
- **Bun**: For running the CLI
- **Ink**: For the TUI components

## Testing the POC

### Prerequisites

```bash
# Install tmux (if not already installed)
# macOS
brew install tmux

# Linux
sudo apt install tmux  # Debian/Ubuntu
sudo yum install tmux  # RHEL/CentOS
```

### Running the POC

1. Build and link the CLI:
   ```bash
   bun link
   ```

2. Navigate to a git repository:
   ```bash
   cd /path/to/your/repo
   ```

3. Run the CLI:
   ```bash
   wt
   ```

4. Create a new worktree:
   - Press `[c]` to create
   - Follow the wizard
   - When prompted, select "Tmux Mode" option

5. Explore the hybrid interface:
   - Navigate between sessions with arrow keys
   - Press `[a]` to attach to a session
   - Inside tmux, use `Ctrl+B, D` to detach
   - Press `[x]` to kill a session
   - Press `[q]` to exit and cleanup

## Files Modified/Created

### New Files
- `src/utils/tmux.ts` - Tmux session management utilities
- `src/components/TmuxView.tsx` - Main hybrid interface component
- `docs/TMUX_HYBRID_POC.md` - This documentation

### Modified Files
- `src/App.tsx` - Added tmux view integration
- `src/components/PostCreatePrompt.tsx` - Added tmux mode option
- `src/components/StatusBar.tsx` - Added tmux view type

## Next Steps

This POC demonstrates the feasibility of integrating tmux for multi-worktree management. To make this production-ready:

1. Resolve the attach/detach limitation with true terminal embedding
2. Add comprehensive error handling
3. Add tests for tmux utilities
4. Improve UX with better visual feedback
5. Add configuration options for tmux behavior
6. Consider making tmux mode opt-in via settings

## Questions & Feedback

This is a POC to explore the hybrid approach. Feedback and suggestions are welcome!
