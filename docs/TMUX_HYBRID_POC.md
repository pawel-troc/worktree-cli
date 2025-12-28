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

#### 1. **No Return After Attach** - Critical UX Issue

**Problem**: When a user attaches to a tmux session, the Ink app calls `exit()` to hand control to tmux. This terminates the entire Node.js process, making it impossible to return to the management interface.

**Example Flow**:
```
User in TmuxView → Presses [a] to attach
  ↓
Ink app calls exit()
  ↓
Node.js process terminates
  ↓
tmux attach-session takes over terminal
  ↓
User presses Ctrl+B, D to detach
  ↓
User is back at shell prompt (NOT the Ink app)
  ↓
User must run `wt` again to restart the CLI
```

**Impact**:
- Breaks the "hybrid" experience completely
- User loses context of what sessions they had open
- Can't quickly switch between management UI and terminals
- Defeats the purpose of an integrated interface

**Why This Happens**:
- Ink apps run in the same terminal they're launched in
- To give tmux full control, we must release the terminal
- Once `exit()` is called, the process is gone
- Can't "pause" a Node.js process and resume it later

**Root Cause**: `TmuxView.tsx:157-162`
```typescript
const proc = attachToSession(session.sessionName);

proc.on("exit", () => {
  // When user detaches from tmux, we can't restart the Ink app
  // So we just exit completely
  process.exit(0);
});
```

---

#### 2. **No Real Terminal Embedding** - Missing Core Feature

**Problem**: We're not rendering terminal output within the Ink UI. The TmuxView is just a management interface that launches external tmux sessions.

**What We Have**:
```
┌─────────────────────────────────┐
│ ⚡ Hybrid Tmux Mode             │
│ Active Sessions:                │
│ ▶ [1] wt-feature-auth          │
│   Path: /foo/bar                │
│   Command: claude code          │
│ [a] Attach  [q] Quit            │
└─────────────────────────────────┘
```

**What We Need**:
```
┌─────────────────────────────────┐
│ ⚡ Hybrid Tmux Mode             │
│ ▶ [1] feature-auth [2] bugfix  │
├─────────────────────────────────┤
│ user@host:~/worktree $          │
│ $ npm test                      │
│ ✓ 42 tests passing              │
│ $ _                             │
│                                 │
│ [Live terminal output here]     │
│                                 │
└─────────────────────────────────┘
```

**What's Missing**:
- No live terminal output rendering
- No ability to type commands in the UI
- No split-pane view showing multiple sessions
- No visual feedback on what's happening in sessions

**Impact**:
- Can't see what's happening without attaching
- No way to compare output across worktrees
- Can't quickly glance at test results or build status
- User must constantly attach/detach to check progress

**Why This Happens**:
- Rendering terminal output in Ink requires a PTY (pseudo-terminal)
- We'd need `node-pty` to capture terminal output
- Would need to implement a terminal emulator (VT100/ANSI parsing)
- Significant complexity for proper terminal rendering

---

#### 3. **No Session State Persistence** - Loses Context

**Problem**: Session tracking only exists in memory. If the CLI exits, all knowledge of sessions is lost.

**Example Scenario**:
```bash
# User creates 3 worktrees in tmux mode
$ wt
# Creates: wt-feature-auth, wt-bugfix-ui, wt-refactor-db
# All sessions running happily

# User accidentally presses Ctrl+C or exits CLI
$ wt
# CLI restarts - shows NO sessions!
# But the tmux sessions are still running in background!

$ tmux list-sessions
wt-feature-auth: 1 windows (created Thu Dec 28 12:34:56 2024)
wt-bugfix-ui: 1 windows (created Thu Dec 28 12:35:12 2024)
wt-refactor-db: 1 windows (created Thu Dec 28 12:35:28 2024)
```

**Impact**:
- User loses track of which worktrees have active sessions
- Can't manage sessions created in previous CLI runs
- Orphaned tmux sessions accumulate over time
- No way to reconnect to existing sessions from the UI

**What We'd Need**:
- Persist session info to `~/.worktree-cli/repos/{repo}.json`
- Store: session name, worktree path, command, creation time
- On startup, reconcile stored sessions with `tmux list-sessions`
- Clean up orphaned entries automatically

**Example Config Structure**:
```json
{
  "postCreateCommand": "code .",
  "tmuxSessions": [
    {
      "sessionName": "wt-feature-auth",
      "path": "/Users/dev/project/worktrees/feature-auth",
      "command": "code .",
      "createdAt": "2024-12-28T12:34:56Z",
      "active": true
    }
  ]
}
```

---

#### 4. **No Terminal Output Preview** - Blind Management

**Problem**: Can't see what's happening in a session without fully attaching to it.

**Example**:
```
User has 3 sessions running:
┌────────────────────────────────┐
│ [1] wt-feature-auth            │  ← Running npm test (passing? failing?)
│ [2] wt-bugfix-ui               │  ← Build in progress? (0%? 100%?)
│ [3] wt-refactor-db             │  ← Idle? Running? Crashed?
└────────────────────────────────┘
```

**What We Can't Tell**:
- Is the build/test still running?
- Did it finish? Pass or fail?
- Is there an error waiting for user input?
- Is the terminal idle or actively running something?

**Impact**:
- User must attach to each session to check status
- Can't quickly triage which worktree needs attention
- Wastes time switching between sessions
- Can't prioritize work based on what's ready

**What We'd Need**:
```
┌────────────────────────────────┐
│ [1] wt-feature-auth    ✓ PASS │  ← Last line: "✓ 42 tests passing"
│ [2] wt-bugfix-ui       ⚙ 67%  │  ← Last line: "Building... 67%"
│ [3] wt-refactor-db     ⚠ ERR  │  ← Last line: "Error: Connection refused"
└────────────────────────────────┘
```

**How to Implement**:
- Capture last N lines of tmux pane output
- Use `tmux capture-pane -p -t session:window.pane`
- Parse for common patterns (PASS/FAIL, progress %, errors)
- Display indicators next to session names

---

#### 5. **Platform & Dependency Limitations**

**Problem**: Only works on Unix-like systems with tmux installed.

**Platform Matrix**:
```
✅ macOS with tmux        → Works
✅ Linux with tmux        → Works
❌ macOS without tmux     → Falls back (shows error)
❌ Linux without tmux     → Falls back (shows error)
❌ Windows (WSL + tmux)   → Untested, likely works
❌ Windows (native)       → Won't work (no tmux)
❌ Windows (Git Bash)     → Won't work (no tmux)
```

**Example Error Flow**:
```typescript
// User selects "Tmux Mode" on Windows
TmuxView loads
  ↓
isTmuxAvailable() checks for tmux
  ↓
Returns false
  ↓
Shows error message:
"tmux is not installed. Please install tmux to use this feature."
  ↓
User can only press [q] to exit
  ↓
Wasted workflow, frustrating UX
```

**Impact**:
- Windows users completely excluded
- macOS/Linux users must install tmux first
- No fallback to alternative terminal management
- Feature is opt-in by necessity, not choice

---

#### 6. **No Multi-Session Comparison** - Single View Only

**Problem**: Can only look at one session at a time. No side-by-side comparison.

**Use Case**:
```
Developer working on a feature that spans 3 worktrees:
- wt-frontend: Running dev server (port 3000)
- wt-backend: Running API server (port 8000)
- wt-database: Running migrations

Wants to see:
┌─────────────────────┬─────────────────────┬─────────────────────┐
│ [Frontend]          │ [Backend]           │ [Database]          │
│ webpack building... │ API listening :8000 │ ✓ Migrations done   │
│ 89% compile         │ GET /api/users      │ Ready for queries   │
│                     │ 200 OK              │                     │
└─────────────────────┴─────────────────────┴─────────────────────┘
```

**Current Reality**:
```
Can only attach to one session at a time
Must constantly switch between sessions
No ability to see all outputs simultaneously
Can't correlate logs across services
```

**Impact**:
- Painful for full-stack development
- Can't debug cross-service issues easily
- Microservices workflows are impractical
- Defeats the "multi-worktree" value proposition

---

#### 7. **Limited Error Handling** - Fragile Implementation

**Problem**: Many tmux operations can fail silently or with poor error messages.

**Example Failure Scenarios**:

**Scenario A: Session Creation Fails**
```typescript
// User creates worktree in path with spaces
createSession("wt-my feature", "/path/with spaces/worktree", "code .")
  ↓
tmux command fails:
  tmux new-session -d -s "wt-my feature" -c "/path/with spaces/worktree"
       ↑ Invalid session name (contains space)
  ↓
Error is swallowed in try/catch
  ↓
UI shows session as created, but it doesn't exist
  ↓
User presses [a] to attach
  ↓
"Session not found" error
```

**Scenario B: Tmux Is Killed**
```typescript
// User has 3 sessions running
// System tmux server crashes or is killed
$ pkill tmux

// CLI still shows 3 sessions (stale state)
// User presses [a] to attach
  ↓
spawn("tmux", ["attach-session", "-t", "wt-feature-auth"])
  ↓
Error: "no server running on /tmp/tmux-1000/default"
  ↓
User sees cryptic error, doesn't know what to do
```

**Scenario C: Permission Issues**
```typescript
// User tries to create session in restricted directory
createSession("wt-admin", "/root/admin-panel", "code .")
  ↓
tmux new-session -d -s "wt-admin" -c "/root/admin-panel"
  ↓
tmux fails silently (can't cd to /root/admin-panel)
  ↓
Session is created, but in wrong directory!
```

**What's Missing**:
- Validation before creating sessions
- Proper error propagation to UI
- User-friendly error messages
- Automatic recovery mechanisms
- Health checks for tmux server

---

#### 8. **No Keyboard Shortcut Discoverability**

**Problem**: Users must learn both Ink shortcuts AND tmux shortcuts.

**Confusion Matrix**:
```
In TmuxView UI:
  [q] = Quit
  [a] = Attach
  [x] = Kill session
  [←/→] = Switch tabs

Inside Tmux:
  Ctrl+B, D = Detach
  Ctrl+B, C = New window
  Ctrl+B, N = Next window
  Ctrl+B, P = Previous window
  Ctrl+B, X = Kill pane
  (... 50+ more shortcuts)
```

**User Experience**:
```
New user presses [a] to attach to session
  ↓
Now in tmux
  ↓
Tries to press [q] to quit (from muscle memory)
  ↓
Doesn't work! (tmux ignores it)
  ↓
Presses Ctrl+C
  ↓
Kills the command running in tmux! (oops)
  ↓
Doesn't know how to detach
  ↓
Closes entire terminal window (nuclear option)
  ↓
Loses all sessions
```

**What's Missing**:
- In-UI tmux shortcut cheat sheet
- First-time user tutorial
- Visual indicator of "You are now in tmux mode"
- Escape hatch explanation before attaching

---

#### 9. **No Session Ownership Tracking**

**Problem**: Can't distinguish between sessions created by CLI vs. manually created tmux sessions.

**Example**:
```bash
# User creates session manually
$ tmux new-session -s wt-manual-test

# User runs CLI and creates session via UI
$ wt
# Creates: wt-feature-auth

# CLI shows both sessions! (because both match "wt-*" pattern)
┌────────────────────────────────┐
│ [1] wt-manual-test             │  ← Not created by CLI!
│ [2] wt-feature-auth            │  ← Created by CLI
└────────────────────────────────┘

# User presses [x] to kill "wt-manual-test"
  ↓
Kills session user created manually
  ↓
User loses important work!
```

**What's Missing**:
- Session metadata to track origin
- Filter to only show CLI-created sessions
- Warning before killing sessions not created by CLI
- Visual indicator of session source

---

#### 10. **No Automatic Cleanup** - Session Leakage

**Problem**: If CLI crashes or is force-quit, tmux sessions persist forever.

**Example Timeline**:
```
Day 1: User creates 3 worktrees in tmux mode
       → 3 tmux sessions running

Day 2: User creates 5 more worktrees
       → 8 tmux sessions running

Day 3: User forgets about old worktrees
       → 8 tmux sessions still running
       → Consuming memory and resources

Day 30: User has 50+ orphaned tmux sessions
        → System slowdown
        → No idea which sessions are relevant
```

**Check Current Sessions**:
```bash
$ tmux list-sessions
wt-feature-auth-old: 1 windows (created 29 days ago)
wt-bugfix-login: 1 windows (created 25 days ago)
wt-refactor-api: 1 windows (created 20 days ago)
... (47 more sessions)
```

**What's Missing**:
- Automatic session cleanup on worktree deletion
- TTL (time-to-live) for idle sessions
- "Garbage collection" on CLI startup
- Warning when session count is high
- Bulk cleanup command

---

#### 11. **No Cross-Session Commands** - No Orchestration

**Problem**: Can't run commands across multiple sessions simultaneously.

**Use Case Examples**:

**Example A: Pull Latest Changes**
```
User wants to: git pull in all 5 worktree sessions
Current approach:
  1. Attach to session 1
  2. Type "git pull"
  3. Detach
  4. Attach to session 2
  5. Type "git pull"
  6. Detach
  ... repeat 3 more times

Desired approach:
  Press [P] → "Pull all worktrees"
  → Runs "git pull" in all sessions
  → Shows aggregated results
```

**Example B: Run Tests Everywhere**
```
User wants to: npm test in all worktrees with package.json
Current: Manual attach/detach 5+ times
Desired: One command to test all, see which fail
```

**What's Missing**:
- Broadcast command to multiple sessions
- Parallel execution with aggregated results
- Session grouping (e.g., "frontend" group)
- Custom command templates

---

### Summary Table

| Limitation | Severity | Workaround | Fix Complexity |
|------------|----------|------------|----------------|
| No return after attach | 🔴 Critical | Restart CLI | High (requires PTY) |
| No terminal embedding | 🔴 Critical | Attach manually | High (terminal emulator) |
| No state persistence | 🟡 Medium | Manual tracking | Low (JSON config) |
| No output preview | 🟡 Medium | Attach to check | Medium (tmux capture) |
| Platform limitations | 🟡 Medium | Install tmux | N/A (inherent) |
| No multi-session view | 🟠 High | Use tmux windows | High (split rendering) |
| Limited error handling | 🟠 High | Check manually | Medium (validation) |
| Shortcut confusion | 🟢 Low | User learns tmux | Low (docs/tutorial) |
| No ownership tracking | 🟢 Low | Naming convention | Low (metadata file) |
| No automatic cleanup | 🟡 Medium | Manual `tmux kill` | Low (gc on startup) |
| No cross-session commands | 🟡 Medium | Script it yourself | Medium (orchestration) |

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
