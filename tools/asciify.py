"""Replace typographic punctuation in a text file with ASCII equivalents.

PowerShell 5.1 reads .ps1 files as ANSI unless they carry a byte-order mark, so
a smart quote or em dash written inside a *string* becomes a parse error. Inside
a comment it is merely ugly. This makes the tools scripts safe either way.

    python tools/asciify.py tools/tauri.ps1
"""

import sys

REPLACEMENTS = {
    "\u2014": "-",    # em dash
    "\u2013": "-",    # en dash
    "\u2018": "'",    # left single quote
    "\u2019": "'",    # right single quote
    "\u201c": '"',    # left double quote
    "\u201d": '"',    # right double quote
    "\u2026": "...",  # ellipsis
    "\u00a0": " ",    # non-breaking space
}


def main(paths):
    for path in paths:
        raw = open(path, "rb").read()
        try:
            text = raw.decode("utf-8")
        except UnicodeDecodeError:
            text = raw.decode("cp1252")
        cleaned = text
        for bad, good in REPLACEMENTS.items():
            cleaned = cleaned.replace(bad, good)
        remaining = sorted({c for c in cleaned if ord(c) > 127})
        if cleaned != text:
            open(path, "w", encoding="utf-8", newline="\n").write(cleaned)
            print(f"{path}: cleaned")
        else:
            print(f"{path}: already ascii")
        if remaining:
            print(f"   still non-ascii: {remaining}")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(__doc__)
        raise SystemExit(1)
    main(sys.argv[1:])
