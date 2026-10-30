#!/usr/bin/env python3
"""Read-only integrity checks for the 2026-10-30 public-content export."""
from pathlib import Path
import json
import sys

ROOT = Path(__file__).resolve().parent.parent / "data" / "public-catalog" / "2026-10-30"

def load(name):
    obj = json.loads((ROOT / name).read_text(encoding="utf-8"))
    assert isinstance(obj.get("items"), list), f"{name}: items missing"
    assert obj.get("count") == len(obj["items"]), f"{name}: count mismatch"
    return obj["items"]

def main():
    parts = sorted(ROOT.glob("models-???.json"))
    assert len(parts) == 9, f"expected nine model parts, got {len(parts)}"
    all_models = []
    for i, part in enumerate(parts, 1):
        data = load(part.name)
        expected = 70 if i == 9 else 100
        assert len(data) == expected, f"{part.name}: {len(data)}, expected {expected}"
        all_models.extend(data)
    ids = [m["id"] for m in all_models]
    assert len(ids) == len(set(ids)) == 870, "missing or duplicate model IDs"
    assert ids == sorted(ids), "model IDs not sorted"
    assert all(m.get("brand") and m.get("model_name") for m in all_models), "missing model identity"
    assert all(isinstance(m.get("translations"), dict) for m in all_models), "missing translations container"
    assert all((not m.get("hero_image_url")) or
               (m.get("image_source_url") and m.get("image_credit") and m.get("image_license"))
               for m in all_models), "photo metadata missing"
    brands = load("brands.json")
    assert len(brands) == 10, "brand count changed"
    assert "sharp" not in {str(b.get("name", "")).lower() for b in brands}, "wrong brand in collection"
    news = load("news.json")
    assert len(news) == 13, "news count changed"
    assert all(n.get("slug") and n.get("title_ru") and n.get("body_ru")
               for n in news), "news record missing essential fields"
    photos = load("photos.json")
    assert len(photos) == 31, "published photo record count changed"
    print("Snapshot integrity PASSED: 870 models, 10 brands, 13 news, 31 photo records.")
    print("This test does not establish historical accuracy, license validity, or full disaster recovery.")
    return 0

if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:
        print(f"Snapshot integrity FAILED: {exc}", file=sys.stderr)
        raise SystemExit(1)
