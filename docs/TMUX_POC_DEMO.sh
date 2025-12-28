#!/bin/bash
# Demo script for testing the Tmux Hybrid POC

set -e

echo "🚀 Tmux Hybrid POC - Demo Script"
echo "================================"
echo ""

# Check if tmux is installed
if ! command -v tmux &> /dev/null; then
    echo "❌ Error: tmux is not installed"
    echo ""
    echo "Please install tmux first:"
    echo "  macOS:  brew install tmux"
    echo "  Ubuntu: sudo apt install tmux"
    echo "  RHEL:   sudo yum install tmux"
    exit 1
fi

echo "✅ tmux is installed: $(tmux -V)"
echo ""

# Check if in a git repository
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    echo "❌ Error: Not in a git repository"
    echo ""
    echo "Please run this script from within a git repository."
    exit 1
fi

echo "✅ Git repository detected"
echo ""

# Build and link the CLI
echo "📦 Building and linking worktree-cli..."
bun link

echo ""
echo "✅ CLI linked successfully!"
echo ""
echo "🎯 Next steps:"
echo ""
echo "1. Run the CLI:"
echo "   $ wt"
echo ""
echo "2. Create a new worktree:"
echo "   - Press [c]"
echo "   - Follow the wizard"
echo ""
echo "3. Select 'Tmux Mode' when prompted"
echo ""
echo "4. Explore the hybrid interface:"
echo "   - Arrow keys to navigate sessions"
echo "   - [a] to attach to a session"
echo "   - Ctrl+B, D to detach from tmux"
echo "   - [x] to kill a session"
echo "   - [q] to exit"
echo ""
echo "📖 For more information, see: docs/TMUX_HYBRID_POC.md"
echo ""
