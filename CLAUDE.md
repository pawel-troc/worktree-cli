# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

worktree-cli is an interactive TUI tool for managing git worktrees, built with Bun and Ink (React for CLI).

## Commands

```bash
# Install dependencies
bun install

# Run the app
bun run start

# Build and link globally (installs as `wt` command)
bun link

# Type check
bun x tsc --noEmit

# Version bumping
bun run version:patch  # 0.1.0 → 0.1.1
bun run version:minor  # 0.1.0 → 0.2.0
bun run version:major  # 0.1.0 → 1.0.0
```

## Versioning Guidelines

When modifying code or creating commits, update the version in `package.json`:

- **patch**: Bug fixes, minor tweaks, documentation updates
- **minor**: New features, non-breaking changes
- **major**: Breaking changes, major refactors

If unsure which version bump is appropriate, ask the user before running the version command.

## Architecture

The app uses a view-based architecture with React/Ink:

- **App.tsx** - Main component managing view state (list, create, delete, settings, postCreate)
- **components/** - UI components for each view
- **components/wizard/** - Reusable wizard system for multi-step flows
- **hooks/** - Custom hooks for state management (useWorktrees, useWizard)
- **utils/** - Git operations and config management

## Key Patterns

- Arrow key navigation throughout the app
- Wizard-based flows for create/delete operations using useWizard hook
- Configuration stored in `~/.worktree-cli/config.json`
- Post-create command execution via spawned detached process
