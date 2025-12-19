#!/bin/bash

# Clear worktree-cli configuration files
# This script removes the config.json file and all repo configs from ~/.worktree-cli

CONFIG_DIR="$HOME/.worktree-cli"
CONFIG_FILE="$CONFIG_DIR/config.json"
REPOS_DIR="$CONFIG_DIR/repos"

if [ -f "$CONFIG_FILE" ]; then
    rm "$CONFIG_FILE"
    echo "✓ Config file removed: $CONFIG_FILE"
else
    echo "No config file found at: $CONFIG_FILE"
fi

if [ -d "$REPOS_DIR" ]; then
    rm -rf "$REPOS_DIR"/*
    echo "✓ Repo configs removed from: $REPOS_DIR"
else
    echo "No repos directory found at: $REPOS_DIR"
fi
