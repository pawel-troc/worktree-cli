# worktree-cli

Interactive TUI for managing git worktrees.

## Features

- List all worktrees with branch and path info
- Create worktrees from existing branches, new branches, or commits
- Delete worktrees with confirmation
- Configurable default worktree storage location

## Installation

Requires [Bun](https://bun.sh) runtime.

```bash
# Install dependencies
bun install

# Link globally
bun link

# Or run directly
bun run start
```

## Usage

Run `wt` from within a git repository:

```bash
wt
```

### Keyboard Shortcuts

**List View:**
- `↑/↓` - Navigate worktrees
- `c` - Create new worktree
- `d` - Delete selected worktree
- `r` - Refresh list
- `q` - Quit

**Create View:**
- `↑/↓` - Navigate options
- `Enter` - Confirm selection
- `Tab` - Toggle custom path
- `Esc` - Cancel

**Delete View:**
- `y` - Confirm delete
- `n` - Cancel
- `f` - Force delete (for locked worktrees)

## Configuration

Config file: `~/.worktree-cli/config.json`

```json
{
  "defaultWorktreePath": "~/.worktree-cli/worktrees/{repo}/{branch}"
}
```

Placeholders:
- `{repo}` - Repository name
- `{branch}` - Branch name (slashes replaced with dashes)

## Project Structure

```
src/
├── index.tsx           # Entry point
├── App.tsx             # Main TUI component
├── components/
│   ├── WorktreeList.tsx
│   ├── CreateWorktree.tsx
│   ├── DeleteWorktree.tsx
│   ├── Header.tsx
│   └── StatusBar.tsx
├── hooks/
│   └── useWorktrees.ts
└── utils/
    ├── git.ts          # Git command wrappers
    └── config.ts       # Config management
```

## Tech Stack

- [Bun](https://bun.sh) - JavaScript runtime
- [Ink](https://github.com/vadimdemedes/ink) - React for CLI
- [TypeScript](https://www.typescriptlang.org/)
