#!/bin/bash
# Double-click this file to look at the site on your own machine.
#
# It rebuilds first, then serves the folder to your browser and opens it.
# Leave the Terminal window open while you're looking — closing it stops the
# preview. Press Ctrl-C, or just close the window, when you're finished.
#
# Why not simply open index.html? Chrome blocks a page opened straight off the
# disk from loading its own font files, so the site would render in the wrong
# typefaces. Serving it like this is the same way it will behave online.

cd "$(dirname "$0")" || exit 1

if ! command -v python3 >/dev/null 2>&1; then
  echo ""
  echo "  Python isn't installed on this Mac yet. Double-click Build.command"
  echo "  first — it will walk you through it."
  echo ""
  echo "  Press any key to close this window."
  read -r -n 1 -s
  exit 1
fi

echo ""
echo "  Rebuilding…"
python3 tools/build.py >/dev/null 2>&1

PORT=8000
while lsof -i ":$PORT" >/dev/null 2>&1; do
  PORT=$((PORT + 1))
done

echo ""
echo "  ────────────────────────────────────────────────────────"
echo "  Your site is running at:  http://localhost:$PORT"
echo ""
echo "  Leave this window open while you look at it."
echo "  Close it, or press Ctrl-C, when you're done."
echo "  ────────────────────────────────────────────────────────"
echo ""

# give the server a moment to come up, then open the browser
( sleep 1; open "http://localhost:$PORT" >/dev/null 2>&1 ) &

python3 -m http.server "$PORT"
