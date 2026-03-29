#!/bin/bash

FILE="$1"
SHEBANG='#!/usr/bin/env node'

if [ -z "$FILE" ]; then
  echo "Usage: $0 <file>"
  exit 1
fi

if [ ! -f "$FILE" ]; then
  echo "File not found: $FILE"
  exit 1
fi

FIRST_LINE=$(head -n 1 "$FILE")

if [ "$FIRST_LINE" != "$SHEBANG" ]; then
  echo "Injecting shebang into $FILE"
  TMP_FILE=$(mktemp)
  echo "$SHEBANG" > "$TMP_FILE"
  cat "$FILE" >> "$TMP_FILE"
  mv "$TMP_FILE" "$FILE"
else
  echo "Shebang already present in $FILE"
fi

chmod +x "$FILE"
