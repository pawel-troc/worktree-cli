#!/bin/bash

# Clear worktree-cli configuration file
# This script removes the config.json file from ~/.worktree-cli

CONFIG_DIR="$HOME/.worktree-cli"
CONFIG_FILE="$CONFIG_DIR/config.json"

if [ -f "$CONFIG_FILE" ]; then
    rm "$CONFIG_FILE"
    echo "✓ Config file removed: $CONFIG_FILE"
else
    echo "No config file found at: $CONFIG_FILE"
fi
