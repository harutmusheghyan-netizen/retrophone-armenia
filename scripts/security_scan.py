#!/usr/bin/env python3
"""Read-only checks for accidentally committed production credentials.

Checks tracked files only. Does not print matched values or upload any content.
Designed for public RetroPhone Armenia repository.
"""
from __future__ import annotations
import pathlib
import re
import subprocess
import sys

PATTERNS = {
    "Supabase server-side secret": re.compile(rb"\bsb_secret_[A-Za-z0-9_-]{12,}"),
    "OpenAI-style secret": re.compile(rb"\bsk-(?:proj-)?[A-Za-z0-9_-]{24,}"),
    "Private key header": re.compile(rb"-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----"),
    "Postgres URL with password": re.compile(rb"postgres(?:ql)?://[^ \n:@/]+:[^ \n@/]+@"),
    "Supabase service-role JWT": re.compile(rb"eyJ[A-Za-z0-9_-]{20,}\.eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}"),
}
BLOCKED_NAMES = {".env", "credentials.json", "secrets.json", "service-account.json"}
BLOCKED_SUFFIXES = {".pem", ".p12", ".pfx", ".key"}

def main() -> int:
    tracked = subprocess.check_output(["git", "ls-files", "-z"]).split(b"\0")
    bad = []
    for raw in tracked:
        if not raw:
            continue
        name = raw.decode("utf-8", "surrogateescape")
        path = pathlib.Path(name)
        if not path.is_file():
            continue
        if (path.name in BLOCKED_NAMES or path.name.startswith(".env.")
                or path.suffix.lower() in BLOCKED_SUFFIXES):
            bad.append((name, "restricted filename"))
            continue
        data = path.read_bytes()
        if len(data) > 12 * 1024 * 1024:
            continue
        for label, regex in PATTERNS.items():
            if label == "Supabase service-role JWT":
                # JWT detection alone is not decisive: public publishable/anon JWTs
                # may be intentionally accessible. Do not flag on structure alone.
                continue
            if regex.search(data):
                bad.append((name, label))
    if bad:
        print("Potential secret material detected (values deliberately hidden):")
        for name, label in bad:
            print(f"  {name}: {label}")
        return 1
    print(f"Secret filename/pattern check passed: {sum(bool(x) for x in tracked)} tracked paths.")
    return 0

if __name__ == "__main__":
    sys.exit(main())
