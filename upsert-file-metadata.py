#!/usr/bin/env python3
import json
import pathlib
import sys


def main() -> int:
    if len(sys.argv) != 6:
        print(
            "Usage: upsert-file-metadata.py <metadata_file> <original_name> <encrypted_id> <s3_url> <crypt_url>",
            file=sys.stderr,
        )
        return 2

    metadata_path = pathlib.Path(sys.argv[1])
    original_name = sys.argv[2]
    encrypted_id = sys.argv[3]
    s3_url = sys.argv[4]
    crypt_url = sys.argv[5]

    existing = []
    if metadata_path.exists():
        content = metadata_path.read_text(encoding="utf-8").strip()
        if content:
            try:
                parsed = json.loads(content)
                if isinstance(parsed, list):
                    existing = [item for item in parsed if isinstance(item, dict)]
            except json.JSONDecodeError:
                existing = []

    by_id = {row.get("encrypted_id"): row for row in existing if row.get("encrypted_id")}
    record = by_id.get(encrypted_id, {})

    if original_name:
        record["original_name"] = original_name
    else:
        record.setdefault("original_name", "")

    record["encrypted_id"] = encrypted_id

    if s3_url:
        record["s3_url"] = s3_url
    else:
        record.setdefault("s3_url", "")

    if crypt_url:
        record["crypt_url"] = crypt_url
    else:
        record.setdefault("crypt_url", "")

    by_id[encrypted_id] = record

    metadata_path.parent.mkdir(parents=True, exist_ok=True)
    output = [
        {
            "original_name": by_id[key].get("original_name", ""),
            "encrypted_id": by_id[key].get("encrypted_id", ""),
            "s3_url": by_id[key].get("s3_url", ""),
            "crypt_url": by_id[key].get("crypt_url", ""),
        }
        for key in sorted(by_id)
    ]
    metadata_path.write_text(json.dumps(output, indent=2, ensure_ascii=True) + "\n", encoding="utf-8")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
