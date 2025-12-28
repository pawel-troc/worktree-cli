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

## Quick Summary

### Is it possible?
**YES!** You can embed terminal sessions within worktree-cli without spawning external windows.

### How does it work?
Two main approaches:

1. **Alternate Screen Buffer** (Recommended) ⭐
   - Uses ANSI escape codes to create a secondary screen
   - User can switch to a full shell, then return to TUI
   - Simple, reliable, works everywhere
   - Similar to how vim/less preserve your terminal state

2. **Embedded PTY with Bun.Terminal**
   - Spawns a pseudo-terminal within the app
   - Render PTY output in Ink components
   - More complex but more integrated
   - Requires Bun v1.3.5+ (Linux/macOS only)

### What are the limitations?

- **Windows**: Bun.Terminal not available (would need `@skitee3000/bun-pty`)
- **Complexity**: PTY approach requires careful state management
- **Raw mode**: Must toggle between cooked mode (TUI) and raw mode (shell)
- **Terminal compatibility**: Some older terminals may not support all features

### Recommended next steps

1. ✅ Try the POC demo: `bun run docs/poc-example.ts`
2. ✅ Read the full research: [embedded-terminal-research.md](./embedded-terminal-research.md)
3. 🎯 Implement the alternate screen buffer approach (1-2 hours of work)
4. 🔄 Gather user feedback
5. 🚀 Consider advanced PTY integration if needed

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
