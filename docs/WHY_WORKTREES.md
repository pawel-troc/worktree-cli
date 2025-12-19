# Why Git Worktrees? A Guide for AI-Assisted Development

## Introduction

If you've ever found yourself wanting to work on multiple features or bugs simultaneously without constantly switching branches and stashing changes, **git worktrees** are exactly what you need. This document explains what worktrees are, why they're particularly valuable when working with AI coding agents, and how to use them effectively.

## The Problem with Traditional Branch Switching

Imagine this scenario: You're deep into implementing a feature when a critical bug report comes in. With traditional git workflow, you need to:

1. Stash or commit your work-in-progress changes
2. Switch to the main branch
3. Create a new branch for the bugfix
4. Fix the bug
5. Switch back to your feature branch
6. Restore your stashed changes
7. Remember where you left off

```mermaid
sequenceDiagram
    participant Dev as Developer
    participant Repo as Repository
    
    Note over Dev,Repo: Working on Feature A
    Dev->>Repo: git stash
    Dev->>Repo: git checkout main
    Dev->>Repo: git checkout -b bugfix/urgent
    Note over Dev,Repo: Fix the bug
    Dev->>Repo: git checkout feature-a
    Dev->>Repo: git stash pop
    Note over Dev,Repo: ❌ Context lost, stash conflicts possible
```

This is disruptive, error-prone, and breaks your flow.

## Enter Git Worktrees

A **worktree** allows you to have multiple working directories for the same repository, each checked out to a different branch. Think of it as having multiple "copies" of your repository, but they all share the same `.git` directory (history, remotes, config).

```mermaid
graph TB
    subgraph "Single Repository with Worktrees"
        GIT[".git directory<br/>(shared history)"]
        
        subgraph WT1["Worktree: main"]
            M[Working Directory]
        end
        
        subgraph WT2["Worktree: feature/auth"]
            F1[Working Directory]
        end
        
        subgraph WT3["Worktree: bugfix/login"]
            F2[Working Directory]
        end
        
        GIT --> WT1
        GIT --> WT2
        GIT --> WT3
    end
```

### Key Benefits

| Traditional Branching | Worktrees |
|----------------------|-----------|
| One working directory | Multiple working directories |
| Must stash/commit to switch | Switch by changing folders |
| Context switching overhead | Zero context switching |
| One IDE window per task | Multiple IDE windows, each on different branch |

## Why Worktrees Shine with AI Agents

AI coding agents (like GitHub Copilot, Cursor, Claude, etc.) work best when they have a clean, focused workspace. Here's why worktrees are a game-changer:

### 1. Parallel AI Sessions

```mermaid
graph LR
    subgraph "Without Worktrees"
        A1[AI Agent] --> R1[Single Repo]
        Note1[❌ One task at a time]
    end
    
    subgraph "With Worktrees"
        A2[AI Agent 1] --> WT1[Worktree: feature/api]
        A3[AI Agent 2] --> WT2[Worktree: feature/ui]
        A4[AI Agent 3] --> WT3[Worktree: bugfix/auth]
        Note2[✅ Parallel development]
    end
```

You can run **multiple AI agent sessions** simultaneously, each working on a different task in its own worktree. No conflicts, no waiting.

### 2. Clean Context for Each Task

AI agents perform better with focused context. Each worktree provides:
- Clean working directory with only relevant changes
- No stashed changes polluting the state
- Independent `node_modules`, build artifacts, etc.

### 3. Easy Review and Comparison

With worktrees, you can easily:
- Open two IDE windows side-by-side comparing implementations
- Test different approaches to the same problem in parallel
- Let AI work on one approach while you manually try another

## Common Concerns Addressed

### "Does it copy all my files?"

**No!** When you create a worktree, git only creates the working directory structure. Here's what happens:

```mermaid
graph TD
    subgraph "What Gets SHARED"
        G[.git directory]
        H[Git history]
        R[Remote configuration]
        B[All branches]
    end
    
    subgraph "What Gets CREATED in New Worktree"
        T[Tracked files only]
        TN[Checked out to selected branch]
    end
    
    subgraph "What Does NOT Get Copied ⚠️"
        U[Untracked files]
        I[.gitignore'd files]
        N[node_modules]
        E[.env files]
        L[.local configs]
    end
```

**Important:** Files in `.gitignore` (like `node_modules`, `.env`, build outputs) are **NOT copied** to the new worktree. This is actually a feature - you get a clean slate, but you'll need to:

1. Run `npm install` / `bun install` in the new worktree
2. Copy over any necessary `.env` files (this CLI tool can automate this!)

### "Can I still commit and push normally?"

**Absolutely!** Each worktree works exactly like a normal git repository for day-to-day operations:

```bash
# In any worktree, standard git commands work perfectly
git add .
git commit -m "feat: add new feature"
git push origin feature/my-feature
```

The only restriction is that **two worktrees cannot have the same branch checked out** simultaneously (which makes sense - it would create conflicts).

```mermaid
sequenceDiagram
    participant WT1 as Worktree: feature/api
    participant Git as Shared .git
    participant Remote as GitHub
    
    WT1->>Git: git commit
    Git->>Git: Store commit in history
    WT1->>Remote: git push
    Remote-->>WT1: ✅ Push successful
    
    Note over WT1,Remote: Works exactly like normal git!
```

### "What about pulling and merging?"

Works exactly as expected:

```bash
# Update your branch with latest changes
git fetch origin
git merge origin/main

# Or rebase
git rebase origin/main
```

## Practical Workflow with AI Agents

Here's a typical workflow using worktrees with AI agents:

```mermaid
flowchart TD
    START[Start: Main repo at ~/projects/my-app] --> CREATE1[Create worktree for Feature A]
    CREATE1 --> WT1[~/worktrees/my-app/feature-a]
    START --> CREATE2[Create worktree for Feature B]
    CREATE2 --> WT2[~/worktrees/my-app/feature-b]
    
    WT1 --> AI1[Open in VS Code + Start AI Agent]
    WT2 --> AI2[Open in VS Code + Start AI Agent]
    
    AI1 --> WORK1[AI works on Feature A]
    AI2 --> WORK2[AI works on Feature B]
    
    WORK1 --> COMMIT1[Commit & Push]
    WORK2 --> COMMIT2[Commit & Push]
    
    COMMIT1 --> PR1[Create PR for Feature A]
    COMMIT2 --> PR2[Create PR for Feature B]
    
    PR1 --> CLEANUP1[Delete worktree when merged]
    PR2 --> CLEANUP2[Delete worktree when merged]
```

## Quick Reference

### Creating a Worktree (Command Line)

```bash
# From existing branch
git worktree add ../my-worktree-folder existing-branch

# Creating new branch
git worktree add -b new-feature ../my-worktree-folder main
```

### Using This CLI Tool

Just run `wt` and use the interactive interface to:
- **Create** worktrees with automatic path management
- **Delete** worktrees and optionally clean up branches
- **Configure** automatic file copying (for `.env` files, etc.)

### Listing Worktrees

```bash
git worktree list
```

### Removing a Worktree

```bash
git worktree remove ../my-worktree-folder
```

## Summary

| Feature | Benefit |
|---------|---------|
| Multiple working directories | Work on several tasks simultaneously |
| Shared git history | No duplication of repository data |
| Independent file states | Clean context for each task |
| Normal git operations | `commit`, `push`, `pull` work as expected |
| Perfect for AI agents | Run multiple AI sessions in parallel |

---

**Ready to try it?** Run `wt` in your repository and create your first worktree! 🚀
