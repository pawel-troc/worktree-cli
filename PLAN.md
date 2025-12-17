# worktree-cli Implementation Plan

## Overview
Create an interactive TUI CLI tool called `wt` for managing git worktrees, built with Ink, TypeScript, and Bun.

## Tech Stack
- **Runtime**: Bun
- **UI Framework**: Ink (React for CLI)
- **Language**: TypeScript
- **CLI Parsing**: Commander.js or built-in args

## Project Structure
```
worktree-cli/
├── src/
│   ├── index.tsx           # Entry point, renders main App
│   ├── App.tsx             # Main TUI component with navigation
│   ├── components/
│   │   ├── WorktreeList.tsx    # List view of all worktrees
│   │   ├── CreateWorktree.tsx  # Form to create new worktree
│   │   ├── DeleteWorktree.tsx  # Confirmation dialog for deletion
│   │   ├── Header.tsx          # App header with title
│   │   └── StatusBar.tsx       # Bottom status/help bar
│   ├── hooks/
│   │   └── useWorktrees.ts     # Hook to fetch/manage worktree data
│   └── utils/
│       ├── git.ts              # Git command wrappers
│       └── config.ts           # Config file management
├── package.json
├── tsconfig.json
└── README.md
```

## Implementation Steps

### Step 1: Install Bun and Initialize Project
- Install Bun runtime
- Initialize project with `bun init`
- Install dependencies: `ink`, `react`, `@types/react`

### Step 2: Configure TypeScript and Build
- Set up tsconfig.json for JSX support
- Configure package.json with bin entry for `wt` command
- Add build scripts

### Step 3: Create Git Utilities
- `getWorktrees()`: Parse output of `git worktree list --porcelain`
- `createWorktree(path, branch)`: Run `git worktree add`
- `removeWorktree(path)`: Run `git worktree remove`
- `getBranches()`: Get available branches for selection

### Step 4: Build Core Components
- **App.tsx**: Main screen with tab/list navigation between views
- **WorktreeList.tsx**: Display worktrees with selection, show current branch, path
- **CreateWorktree.tsx**: Input fields for path and branch selection
- **DeleteWorktree.tsx**: Confirmation before removing

### Step 5: Add Keyboard Navigation
- Arrow keys for list navigation
- Enter to select/confirm
- Escape to go back
- `c` to create, `d` to delete, `q` to quit

### Step 6: Polish and Test
- Add loading states
- Handle errors gracefully
- Test with actual git repositories

## Key Dependencies
```json
{
  "dependencies": {
    "ink": "^5.0.1",
    "react": "^18.3.1"
  },
  "devDependencies": {
    "@types/react": "^18.3.0",
    "typescript": "^5.0.0"
  }
}
```

## Worktree Creation Options
When creating a worktree, user can choose:
1. **From existing branch** - Select from available branches
2. **Create new branch** - Enter new branch name (uses `git worktree add -b`)
3. **From commit/tag** - Detached HEAD mode

## Storage Configuration
- **Default location**: `~/.worktree-cli/worktrees/<repo-name>/<branch-name>`
- **Config file**: `~/.worktree-cli/config.json` stores default path template
- **Override**: User can specify custom path when creating each worktree

### Config File Structure
```json
{
  "defaultWorktreePath": "~/.worktree-cli/worktrees/{repo}/{branch}"
}
```
Placeholders: `{repo}` = repository name, `{branch}` = branch name

## CLI Usage
```bash
# Run interactive TUI
wt

# The TUI will show:
# - List of current worktrees
# - Options to create/delete worktrees
# - Keyboard shortcuts for navigation
```
