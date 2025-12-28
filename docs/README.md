# Embedded Terminal Research

This directory contains research and proof-of-concept implementations for embedding terminal sessions within worktree-cli.

## Files

### 📄 [embedded-terminal-research.md](./embedded-terminal-research.md)
**Comprehensive research document** covering:
- Current implementation analysis
- Technical solutions (Bun.Terminal, node-pty, Ink integration)
- Feasibility assessment
- Limitations and challenges
- Two detailed implementation approaches with code examples
- Migration path and testing strategy

**TL;DR**: ✅ Embedding terminals is feasible. Recommended approach is using **alternate screen buffer** (simple, works everywhere) or **Bun.Terminal API** (more advanced).

### 🧪 [poc-example.ts](./poc-example.ts)
**Working proof-of-concept demo** that you can run to see embedded terminal in action.

```bash
# Run the demo
bun run docs/poc-example.ts
```

This demonstrates:
- Opening an embedded shell using alternate screen buffer
- Executing commands in embedded terminal
- Switching between main screen and terminal
- Clean restoration of original screen

### 🚀 [multi-terminal-tabs.md](./multi-terminal-tabs.md)
**Advanced research document** covering multi-terminal tab management:
- Can you have multiple embedded terminals with browser-like tabs?
- PTY-based approach vs alternate screen buffer limitations
- Architecture for managing multiple simultaneous terminals
- Output buffering and tab navigation
- Implementation complexity analysis

**TL;DR**: ✅ Multi-terminal tabs are feasible using PTY-based approach with Ink, but significantly more complex than single terminal.

### 🎯 [poc-multi-terminal.tsx](./poc-multi-terminal.tsx)
**Advanced POC demo** showing multi-terminal tab management.

```bash
# Run the multi-terminal demo
bun run docs/poc-multi-terminal.tsx
```

This demonstrates:
- Multiple embedded terminals running simultaneously
- Browser-like tab bar showing active terminal
- Keyboard shortcuts for tab navigation (Ctrl+1-9)
- Creating new tabs (Ctrl+T)
- Closing tabs (Ctrl+W)
- Output buffering for each terminal

## Quick Summary

### Is it possible?
**YES!** You can embed terminal sessions within worktree-cli without spawning external windows.

### How does it work?
Three main approaches:

1. **Alternate Screen Buffer** (Recommended for single terminal) ⭐
   - Uses ANSI escape codes to create a secondary screen
   - User can switch to a full shell, then return to TUI
   - Simple, reliable, works everywhere
   - Similar to how vim/less preserve your terminal state
   - **Limitation**: Only ONE terminal at a time

2. **Embedded PTY with Bun.Terminal** (For advanced integration)
   - Spawns a pseudo-terminal within the app
   - Render PTY output in Ink components
   - More complex but more integrated
   - Requires Bun v1.3.5+ (Linux/macOS only)

3. **Multi-Terminal Tabs** (For power users) 🚀
   - Multiple PTY instances running simultaneously
   - Browser-like tab management with keyboard shortcuts
   - Each terminal buffers its output independently
   - Complex but provides tmux-like experience
   - See [multi-terminal-tabs.md](./multi-terminal-tabs.md) for details

### What are the limitations?

- **Windows**: Bun.Terminal not available (would need `@skitee3000/bun-pty`)
- **Complexity**: PTY approach requires careful state management
- **Raw mode**: Must toggle between cooked mode (TUI) and raw mode (shell)
- **Terminal compatibility**: Some older terminals may not support all features

### Recommended next steps

1. ✅ Try the simple POC: `bun run docs/poc-example.ts`
2. ✅ Try the multi-terminal POC: `bun run docs/poc-multi-terminal.tsx`
3. ✅ Read the full research: [embedded-terminal-research.md](./embedded-terminal-research.md)
4. ✅ Read multi-terminal design: [multi-terminal-tabs.md](./multi-terminal-tabs.md)
5. 🎯 Decide on approach based on complexity vs features
6. 🔄 Implement and gather user feedback

## Key Benefits

Getting rid of external terminal spawning would provide:

- ✨ Stay within the same terminal window/tab
- 🔄 Easy switching between TUI and shell
- 💾 Preserve TUI state while in shell
- 🎯 More integrated user experience
- 🚀 Works on more platforms than current AppleScript approach

## Technical Resources

### Official Documentation
- [Bun.Terminal API](https://bun.com/blog/bun-v1.3.5)
- [Bun Spawn Documentation](https://bun.com/docs/runtime/child-process)
- [Ink React CLI Framework](https://github.com/vadimdemedes/ink)

### Key Packages
- `node-pty` - Standard PTY library (doesn't work with Bun)
- `@skitee3000/bun-pty` - Bun-compatible PTY implementation
- Native `Bun.Terminal` - Built-in PTY support (Bun v1.3.5+)

### Related Examples
- [Creating browser-based terminals with xterm.js](https://www.eddymens.com/blog/creating-a-browser-based-interactive-terminal-using-xtermjs-and-nodejs)
- [Building CLI tools with Ink](https://medium.com/trabe/building-cli-tools-with-react-using-ink-and-pastel-2e5b0d3e2793)
- [Terminal control examples](https://rosettacode.org/wiki/Terminal_control/Preserve_screen)

---

**Questions?** Check the full research document or run the POC demo to see it in action!
