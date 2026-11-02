#!/usr/bin/env python3
"""Validate review-only RU/HY/EN model localization drafts (not live pages)."""
import json
import re
import sys
from pathlib import Path
from urllib.parse import urlparse

LANGUAGES = ("ru", "hy", "en")
CYRILLIC = re.compile(r"[\u0400-\u052F]")
ARMENIAN = re.compile(r"[\u0530-\u058F]")
LATIN = re.compile(r"[A-Za-z]")
MIN_DESCRIPTION = 120
SPEC_FIELDS = ("body", "screen", "network")
LABEL_FIELDS = ("body", "screen", "network", "availability")


def validate(path: Path) -> list[str]:
    errors = []
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, UnicodeError, json.JSONDecodeError) as exc:
        return [f"{path}: cannot read JSON: {exc}"]
    if data.get("status") != "draft_not_published":
        errors.append("draft status must be draft_not_published")
    url = urlparse(str(data.get("source_url", "")))
    if url.scheme != "https" or not url.netloc:
        errors.append("source_url must be an absolute HTTPS URL")
    translations = data.get("translations")
    if not isinstance(translations, dict):
        return errors + ["translations must be an object"]
    for lang in LANGUAGES:
        entry = translations.get(lang)
        if not isinstance(entry, dict):
            errors.append(f"{lang}: missing translation object")
            continue
        description = entry.get("description", "")
        if not isinstance(description, str) or len(description.strip()) < MIN_DESCRIPTION:
            errors.append(f"{lang}: description shorter than {MIN_DESCRIPTION} characters")
        elif lang == "hy" and (not ARMENIAN.search(description) or CYRILLIC.search(description)):
            errors.append("hy: Armenian text missing or contains Cyrillic")
        elif lang == "en" and (not LATIN.search(description) or CYRILLIC.search(description) or ARMENIAN.search(description)):
            errors.append("en: English text missing or contains Armenian/Cyrillic")
        elif lang == "ru" and not CYRILLIC.search(description):
            errors.append("ru: Russian text missing")
        for group, fields in (("specifications", SPEC_FIELDS), ("labels", LABEL_FIELDS)):
            values = entry.get(group)
            if not isinstance(values, dict):
                errors.append(f"{lang}: missing {group}")
                continue
            for field in fields:
                value = values.get(field)
                if not isinstance(value, str) or not value.strip():
                    errors.append(f"{lang}: missing {group}.{field}")
                elif lang in ("hy", "en") and CYRILLIC.search(value):
                    errors.append(f"{lang}: Cyrillic in {group}.{field}")
    return [f"{path}: {e}" for e in errors]


def main() -> int:
    paths = [Path(p) for p in sys.argv[1:]]
    if not paths:
        paths = sorted(Path("data/localization-drafts").glob("*.json"))
    if not paths:
        print("No localization drafts found", file=sys.stderr)
        return 1
    problems = [error for path in paths for error in validate(path)]
    if problems:
        print("\n".join(problems), file=sys.stderr)
        return 1
    print(f"PASS: {len(paths)} RU/HY/EN localization draft(s); not a live-site validation")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
