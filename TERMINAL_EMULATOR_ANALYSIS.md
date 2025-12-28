# Terminal Emulator Integration Analysis
**worktree-cli Enhancement Proposal**

---

## Executive Summary

This document analyzes the feasibility of integrating terminal emulation capabilities into worktree-cli, inspired by claude-squad's architecture. The goal is to create a unified interface where users can manage git worktrees AND interact with multiple terminal sessions within a single terminal window.

**Key Finding**: This is technically feasible but represents a significant architectural shift. The analysis identifies three potential approaches with varying complexity and risk levels.

---

## 1. Current worktree-cli Architecture

### Technology Stack
- **Runtime**: Bun + TypeScript
- **UI Framework**: Ink (React for CLI)
- **Architecture**: View-based component system with state machine pattern
- **Process Management**: Detached spawned processes with terminal detection

### Current Terminal Interaction Model

worktree-cli currently operates in a **"spawn and exit"** pattern:

```
User creates worktree
    ↓
Post-create command executes
    ↓
CLI spawns detached process (new terminal tab/window)
    ↓
CLI exits or returns to list view
    ↓
User manually switches to spawned terminal
```

**Key Characteristics**:
- Terminal-specific AppleScript for iTerm2/Apple Terminal
- Detached process spawning (`stdio: "ignore"`, `detached: true`)
- Single-process, single-view CLI
- No persistent terminal session management

---

## 2. Claude-Squad Architecture Deep Dive

### Technology Stack
- **Language**: Go (86.6%)
- **TUI Framework**: Bubble Tea (MVU pattern)
- **Terminal Multiplexing**: tmux
- **Terminal I/O**: creack/pty (pseudo-terminal library)
- **Git Integration**: Native git worktree operations

### Architecture Pattern: **Orchestrator + Multiplexer**

```
Claude-Squad TUI (Bubble Tea)
    ↓
Session Management Layer
    ├── Session Instance (metadata + state)
    ├── Tmux Session Wrapper
    │   ├── PTY Factory (creack/pty)
    │   ├── Command Execution
    │   └── Content Capture
    └── Git Worktree Manager
        ├── Branch creation/deletion
        ├── Worktree creation/cleanup
        └── Diff statistics
```

### How It Works

**Session Creation Flow**:
1. User presses `n` (new session)
2. App creates git worktree for specific branch
3. App spawns detached tmux session in worktree directory
4. Tmux session runs Claude/Aider/Gemini CLI
5. PTY captures session I/O without attaching
6. TUI displays preview via `tmux capture-pane`

**Navigation Model**:
```
Main View (30% width)          Preview Pane (70% width)
├── Session 1                  ┌─────────────────────────┐
├── Session 2 [selected]  ─────│ Live terminal output    │
├── Session 3                  │ from tmux capture       │
└── Session 4                  └─────────────────────────┘

User presses Enter/o → Attaches to tmux session (fullscreen)
User presses Ctrl+Q → Detaches back to main view
```

**Key Technical Mechanisms**:

1. **PTY (Pseudo-Terminal)**:
   - Creates virtual terminal file descriptors
   - Enables programmatic terminal I/O
   - Used by `creack/pty` library

2. **Tmux Integration**:
   ```go
   // Create detached session
   exec.Command("tmux", "new-session", "-d", "-s", name, "-c", workDir, program)

   // Capture output without attaching
   exec.Command("tmux", "capture-pane", "-e", "-p", "-t", name)

   // Attach interactively
   exec.Command("tmux", "attach-session", "-t", name)
   ```

3. **Session Lifecycle**:
   - **Running**: Active tmux session with PTY
   - **Paused**: Git worktree removed, tmux killed, branch preserved
   - **Ready**: Metadata exists but not started
   - **Loading**: Transitional state during initialization

4. **Content Monitoring**:
   - Background goroutine polls `capture-pane` every 500ms
   - SHA256 hashing detects content changes efficiently
   - Updates preview pane only on changes

---

## 3. Technical Comparison

| Aspect | worktree-cli | claude-squad |
|--------|--------------|--------------|
| **Primary Language** | TypeScript (Bun) | Go |
| **TUI Framework** | Ink (React-based) | Bubble Tea (MVU pattern) |
| **Terminal Strategy** | External spawning | Internal multiplexing |
| **Process Model** | Detached spawn → exit | Managed background sessions |
| **Session Persistence** | None (ephemeral) | Full persistence + pause/resume |
| **Terminal I/O** | None (delegates to system) | PTY + tmux capture |
| **Multi-session** | No | Yes (up to 10 concurrent) |
| **View Model** | Single-view state machine | Multi-pane layout |
| **Git Integration** | Direct git CLI calls | Direct git CLI calls (similar) |
| **Platform Support** | macOS (AppleScript), Linux/Windows partial | Unix-like (tmux dependency) |

---

## 4. Feasibility Analysis

### Option A: Full Claude-Squad Pattern (Tmux + PTY)

**Approach**: Rewrite worktree-cli to match claude-squad's architecture

**Requirements**:
- Add tmux dependency (external)
- Integrate PTY library (e.g., `node-pty` for Node.js ecosystem)
- Redesign UI to support multi-pane layout
- Implement session persistence layer
- Build tmux command orchestration

**Complexity**: **VERY HIGH** ⚠️

**Pros**:
- Battle-tested pattern (tmux is 20+ years old)
- Reliable terminal multiplexing
- Cross-platform support (Unix-like systems)
- Session persistence even if CLI crashes
- Can attach/detach freely

**Cons**:
- Complete architectural rewrite required
- Adds external dependency (tmux must be installed)
- Significant learning curve for tmux integration
- May not work on Windows (tmux is Unix-only)
- Node.js PTY libraries are less mature than Go's

**Estimated Effort**: 4-6 weeks of full-time development

---

### Option B: Ink-Native Terminal Emulation

**Approach**: Implement terminal emulation purely within Ink using React components

**Requirements**:
- Use `node-pty` to spawn PTY processes
- Build custom terminal rendering component
- Implement ANSI escape sequence parser
- Create tab/pane management system
- Handle terminal resize events

**Example Pattern**:
```typescript
// Pseudo-code
const Terminal = ({ worktreePath, command }) => {
  const [output, setOutput] = useState([]);
  const ptyRef = useRef();

  useEffect(() => {
    const pty = spawn(command, [], {
      cwd: worktreePath,
      cols: 80,
      rows: 24,
    });

    pty.onData(data => {
      setOutput(prev => [...prev, parseAnsi(data)]);
    });

    ptyRef.current = pty;
    return () => pty.kill();
  }, []);

  return (
    <Box flexDirection="column">
      {output.map((line, i) => (
        <Text key={i}>{line}</Text>
      ))}
    </Box>
  );
};
```

**Complexity**: **HIGH** ⚠️

**Pros**:
- No external dependencies (tmux)
- Full control over rendering
- Better integration with existing Ink UI
- Cross-platform (works on Windows)
- Stays within JavaScript ecosystem

**Cons**:
- Must implement terminal emulation from scratch
- ANSI escape sequence parsing is complex
- Performance concerns with full terminal rendering in React
- Session persistence requires custom implementation
- Debugging terminal issues is difficult
- May have compatibility issues with complex TUI apps

**Estimated Effort**: 3-5 weeks of full-time development

---

### Option C: Hybrid Approach (Tmux with Simplified UI)

**Approach**: Use tmux for session management but keep worktree-cli's simpler UI

**Requirements**:
- Add tmux dependency
- Implement basic tmux command wrappers
- Add "attach to worktree" command that connects to existing tmux session
- Keep existing create/delete/list UI
- Add optional preview pane showing `tmux capture-pane` output

**Pattern**:
```
User creates worktree (existing flow)
    ↓
CLI spawns tmux session instead of detached process
    ↓
User can:
    a) Stay in CLI (list view)
    b) Press 'o' to attach to tmux session for that worktree
    c) Detach with Ctrl+Q to return to CLI
```

**Complexity**: **MEDIUM** ⚡

**Pros**:
- Minimal architectural changes
- Leverages tmux's reliability
- Adds session persistence
- Can attach/detach as needed
- Incremental adoption path

**Cons**:
- Still requires tmux dependency
- Doesn't provide simultaneous multi-terminal view
- Less ambitious than full integration
- Unix-only (no Windows support)

**Estimated Effort**: 1-2 weeks of full-time development

---

### Option D: Enhanced Process Management (No Terminal Emulation)

**Approach**: Improve current model without terminal emulation

**Requirements**:
- Add process tracking to config
- Store PIDs of spawned processes
- Add "reconnect" command that brings terminal to foreground
- Implement process health checking
- Add tmux session detection (if user manually uses tmux)

**Pattern**:
```
User creates worktree
    ↓
CLI spawns detached process + saves metadata
    ↓
User can query "active worktrees" with running processes
    ↓
User can "focus" a worktree (brings terminal forward)
```

**Complexity**: **LOW** ✅

**Pros**:
- Minimal code changes
- No new dependencies
- Works with existing patterns
- Cross-platform compatible
- Low risk

**Cons**:
- No true terminal multiplexing
- No unified view
- Still relies on external terminal
- Limited session management

**Estimated Effort**: 3-5 days of development

---

## 5. Key Implementation Challenges

### Challenge 1: Node.js PTY Ecosystem

**Issue**: The Node.js PTY library landscape is fragmented:
- `node-pty`: Most popular, used by VS Code, but C++ native module
- `node-pty-prebuilt-multiarch`: Pre-compiled binaries
- Bun compatibility unknown

**Mitigation**:
- Test Bun compatibility with `node-pty` before committing
- Consider fallback to Node.js if Bun doesn't work
- Explore pure JavaScript alternatives (though performance may suffer)

### Challenge 2: ANSI Escape Sequence Parsing

**Issue**: Terminal output includes complex ANSI codes for:
- Colors (256-color, true color)
- Cursor positioning
- Text formatting (bold, italic, underline)
- Clearing screens
- Alternative buffers

**Mitigation**:
- Use existing libraries like `ansi-escapes`, `strip-ansi`, `chalk`
- For full emulation, consider `xterm.js` (but web-based)
- Start with basic parsing and iterate

### Challenge 3: Terminal Size and Resize Events

**Issue**: Terminals have dynamic dimensions (cols × rows) that change on window resize

**Mitigation**:
- Listen to `process.stdout` resize events
- Propagate resize to PTY via `pty.resize(cols, rows)`
- Handle gracefully in Ink layout system

### Challenge 4: Session Persistence

**Issue**: If CLI crashes, how to reconnect to running sessions?

**Solutions**:
- **Option A (Tmux)**: Tmux handles this automatically
- **Option B (Custom)**: Store PIDs and socket paths, implement reconnection logic
- **Option C**: Accept ephemeral sessions as limitation

### Challenge 5: Input Multiplexing

**Issue**: When showing multiple terminals, which receives keyboard input?

**Solution**:
- Implement "focus" model (one active terminal at a time)
- Use tab/arrow keys to switch focus
- Show visual indicator of focused terminal

---

## 6. Recommended Approach

### Phase 1: Proof of Concept (Option C - Hybrid)

**Rationale**:
- Lowest risk, highest value
- Validates tmux integration with minimal changes
- Provides clear migration path to full implementation
- Users can test without breaking existing workflows

**Implementation Steps**:
1. Add tmux detection to `utils/terminal.ts`
2. Create `utils/tmux.ts` with basic wrappers:
   - `createTmuxSession(name, cwd, command)`
   - `attachToSession(name)`
   - `captureSession(name)` for preview
   - `listSessions()`
3. Update `App.tsx` to add "attach" action
4. Modify post-create flow to optionally create tmux session
5. Add setting: "Use tmux for sessions" (default: false)

**Success Criteria**:
- Users can create worktree with tmux session
- Users can attach/detach from session
- Session persists after CLI exits
- Existing non-tmux workflow still works

### Phase 2: Enhanced UI (Option B - Partial)

**After validating Phase 1**:
1. Add preview pane showing `tmux capture-pane` output
2. Implement split-view layout (list + preview)
3. Add "focused worktree" concept
4. Real-time preview updates (polling)

### Phase 3: Full Integration (Optional)

**If Phase 2 is successful and users request it**:
- Consider full multi-pane terminal view
- Evaluate performance and complexity
- May require switching to pure terminal emulation (Option B)

---

## 7. Alternative: Don't Integrate Terminal Emulation

### Why This Might Be the Right Choice

**Core Principle**: Do one thing well

**Arguments Against Integration**:
1. **Scope Creep**: worktree-cli's strength is worktree management, not terminal emulation
2. **Complexity**: Terminal emulation is a full project in itself (see: xterm.js, iTerm2)
3. **Existing Solutions**: tmux, screen, iTerm2 tabs already solve this problem
4. **Maintenance Burden**: Terminal bugs are notoriously difficult to debug
5. **User Expectations**: Users may expect full terminal emulator features

**Alternative Enhancement**:
Instead of building terminal emulation, enhance **integration** with existing tools:

```bash
# Better integration examples
wt create feature-x --tmux        # Create in new tmux window
wt attach feature-x               # Attach to tmux session for this worktree
wt list --show-tmux-sessions      # Show which worktrees have active sessions
wt exec feature-x "npm test"      # Run command in worktree's tmux session
```

This provides similar benefits with much lower complexity.

---

## 8. Architectural Considerations if Proceeding

### State Management Evolution

**Current**: Simple view state machine
```typescript
type View = "list" | "create" | "delete" | "settings" | "postCreate";
```

**With Terminal Integration**:
```typescript
type View = "list" | "create" | "delete" | "settings" | "terminal";

interface TerminalState {
  activeWorktrees: Map<string, TerminalSession>;
  focusedWorktree: string | null;
  layout: "split" | "fullscreen" | "preview";
}

interface TerminalSession {
  worktreePath: string;
  pty?: PTY;
  tmuxSession?: string;
  output: string[];
  status: "running" | "paused" | "stopped";
}
```

### Component Hierarchy

```
App.tsx (orchestrator)
  ├── WorktreeList.tsx (existing)
  ├── TerminalManager.tsx (NEW)
  │   ├── TerminalTabs.tsx
  │   ├── TerminalPane.tsx
  │   │   └── TerminalOutput.tsx
  │   └── TerminalInput.tsx
  ├── CreateWorktree.tsx (existing, modified)
  └── Settings.tsx (existing, add terminal settings)
```

### Configuration Extensions

```typescript
interface Config {
  // Existing fields...
  defaultWorktreePath: string;
  postCreateCommand: string;

  // New terminal-related fields
  useTerminalEmulation: boolean;
  terminalEmulationMode: "tmux" | "native" | "none";
  maxConcurrentSessions: number;
  autoAttachOnCreate: boolean;
  tmuxSessionPrefix: string;
  terminalPreviewHeight: number;
}
```

---

## 9. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Bun incompatibility with node-pty | Medium | High | Test early; fallback to Node.js |
| Performance issues with terminal rendering | High | Medium | Use tmux capture instead of full emulation |
| Cross-platform compatibility breaks | Medium | High | Make feature optional; graceful degradation |
| Maintenance burden increases significantly | High | High | Start with minimal implementation; iterate based on feedback |
| User confusion with new workflow | Medium | Medium | Keep existing workflow; add as opt-in feature |
| Terminal escape sequence bugs | High | Medium | Use battle-tested parsers; comprehensive testing |

---

## 10. Conclusion and Recommendation

### Summary

Integrating terminal emulation into worktree-cli is **technically feasible** but represents a **significant architectural evolution**. The claude-squad implementation provides an excellent reference architecture, but their use of Go + tmux + PTY is well-suited to their ecosystem and may not translate directly to Bun + TypeScript + Ink.

### Recommendation: **Hybrid Approach (Option C) with Incremental Adoption**

**Phase 1**: Implement basic tmux integration (1-2 weeks)
- Add tmux session creation as post-create option
- Implement attach/detach commands
- Validate user interest and technical stability

**Phase 2**: Enhanced UI if Phase 1 succeeds (2-3 weeks)
- Add preview pane with tmux capture
- Implement split-view layout
- Add session management commands

**Phase 3**: Evaluate full integration based on feedback
- Only proceed if there's strong user demand
- Consider fork or separate tool if scope diverges too much

### Key Success Factors

1. **Make it optional**: Preserve existing workflow; new features are opt-in
2. **Start simple**: Tmux integration first, full emulation only if needed
3. **Test early**: Validate Bun + node-pty compatibility immediately
4. **Get feedback**: Release Phase 1 to users before investing in Phase 2
5. **Document well**: Terminal integration is complex; good docs are critical

### Final Thought

Consider whether terminal emulation truly aligns with worktree-cli's core mission. Sometimes the best enhancement is **better integration** with existing tools (tmux, iTerm2, etc.) rather than **reimplementing** those tools. The claude-squad pattern works because their tool fundamentally requires managing multiple concurrent AI agent sessions—worktree management may not have the same requirement.

---

## Appendix: Reference Implementation Snippets

### A1. Basic Tmux Wrapper (TypeScript)

```typescript
// utils/tmux.ts
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export class TmuxSession {
  constructor(private sessionName: string) {}

  async create(cwd: string, command: string): Promise<void> {
    const sanitizedName = this.sessionName.replace(/\s+/g, "_");
    await execAsync(
      `tmux new-session -d -s ${sanitizedName} -c "${cwd}" "${command}"`
    );
  }

  async attach(): Promise<void> {
    // This needs to replace current process
    process.stdin.setRawMode(true);
    await execAsync(`tmux attach-session -t ${this.sessionName}`);
  }

  async capture(): Promise<string> {
    const { stdout } = await execAsync(
      `tmux capture-pane -e -p -t ${this.sessionName}`
    );
    return stdout;
  }

  async exists(): Promise<boolean> {
    try {
      await execAsync(`tmux has-session -t=${this.sessionName}`);
      return true;
    } catch {
      return false;
    }
  }

  async kill(): Promise<void> {
    await execAsync(`tmux kill-session -t ${this.sessionName}`);
  }
}
```

### A2. Node-PTY Integration Example

```typescript
// utils/pty-terminal.ts
import * as pty from "node-pty";
import { useEffect, useState } from "react";

export const usePtyTerminal = (command: string, cwd: string) => {
  const [output, setOutput] = useState<string[]>([]);
  const [ptyProcess, setPtyProcess] = useState<pty.IPty | null>(null);

  useEffect(() => {
    const proc = pty.spawn(command, [], {
      name: "xterm-color",
      cols: 80,
      rows: 30,
      cwd,
      env: process.env as any,
    });

    proc.onData((data) => {
      setOutput((prev) => [...prev, data]);
    });

    setPtyProcess(proc);

    return () => {
      proc.kill();
    };
  }, [command, cwd]);

  const write = (data: string) => {
    ptyProcess?.write(data);
  };

  return { output, write };
};
```

### A3. Ink Terminal Component

```typescript
// components/Terminal.tsx
import React from "react";
import { Box, Text, useInput } from "ink";
import { usePtyTerminal } from "../utils/pty-terminal.js";

interface TerminalProps {
  command: string;
  cwd: string;
  onExit?: () => void;
}

export const Terminal: React.FC<TerminalProps> = ({
  command,
  cwd,
  onExit,
}) => {
  const { output, write } = usePtyTerminal(command, cwd);

  useInput((input, key) => {
    if (key.ctrl && input === "q") {
      onExit?.();
    } else {
      write(input);
    }
  });

  return (
    <Box flexDirection="column" height="100%">
      {output.slice(-50).map((line, i) => (
        <Text key={i}>{line}</Text>
      ))}
    </Box>
  );
};
```

---

**Document Version**: 1.0
**Date**: 2025-12-28
**Author**: Claude Code Analysis
**Status**: Proposal for Discussion
