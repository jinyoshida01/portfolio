#!/bin/bash
# Double-click this file to rebuild the site after you've added or changed
# images, videos, or anything in a project's text.
#
# It opens a Terminal window, does the work, prints what it found, and waits
# for you to press a key before closing. Nothing here can break the site —
# the worst case is an error message you can send on.

cd "$(dirname "$0")" || exit 1

echo ""
echo "  Rebuilding the site…"
echo "  ────────────────────────────────────────────────────────"
echo ""

if command -v python3 >/dev/null 2>&1; then
  python3 tools/build.py
  STATUS=$?
else
  echo "  Python isn't installed on this Mac yet."
  echo ""
  echo "  macOS will offer to install it for you: a window should appear"
  echo "  asking to install the command line developer tools. Click Install,"
  echo "  wait for it to finish, then double-click this file again."
  echo ""
  # this triggers macOS's own install prompt
  python3 --version >/dev/null 2>&1
  STATUS=1
fi

echo ""
echo "  ────────────────────────────────────────────────────────"
if [ "$STATUS" -eq 0 ]; then
  echo "  Done. Your changes are now in the site."
  echo "  Double-click Preview.command to look at it."
else
  echo "  Something went wrong — the message above says what."
fi
echo ""
echo "  Press any key to close this window."
read -r -n 1 -s
