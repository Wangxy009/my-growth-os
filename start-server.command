#!/bin/zsh
set -u
cd "$(dirname "$0")"
echo "Starting My Growth OS..."
echo "Project: $(pwd)"
echo "Node: $(node --version 2>&1)"
echo ""
node server.js
status=$?
echo ""
echo "Server exited with status $status. Press Enter to close."
read -r
