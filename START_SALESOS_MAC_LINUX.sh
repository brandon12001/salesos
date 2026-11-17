#!/usr/bin/env bash
set -e
cd "$(dirname "$0")"
if ! command -v node >/dev/null 2>&1; then
  echo 'Node.js is required. Install the current Node.js LTS release from https://nodejs.org/'
  exit 1
fi
if [ ! -d node_modules ]; then npm install; fi
printf '\nOpen http://localhost:5173 in your browser.\n'
npm run dev
