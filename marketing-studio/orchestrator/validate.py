#!/usr/bin/env python3
"""
Minimal JSON Schema (draft-07 subset) validator — no external dependency.
Supports what marketing-studio/schemas/*.schema.json actually use: type,
required, properties, items, enum, pattern, minItems, additionalProperties
(schema-valued), and $ref-free nesting. Not a general-purpose validator —
if a schema starts using features beyond this list, extend
`_validate_node` rather than reaching for the `jsonschema` package (keeps
the studio dependency-free, matching video-editing's philosophy of using
only what's needed).

CLI:
    python3 validate.py --schema strategy --data campaigns/x/01_strategy.json
    python3 validate.py --schema-path schemas/strategy.schema.json --data <path>
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import SCHEMAS_DIR, load_json  # noqa: E402

_TYPE_MAP = {
    "string": str,
    "number": (int, float),
    "integer": int,
    "boolean": bool,
    "array": list,
    "object": dict,
    "null": type(None),
}


class ValidationError(Exception):
    pass


def _check_type(value, expected, path: str, errors: list[str]) -> None:
    types = expected if isinstance(expected, list) else [expected]
    py_types = tuple(_TYPE_MAP[t] for t in types if t in _TYPE_MAP)
    if py_types and not isinstance(value, py_types):
        errors.append(f"{path}: expected type {types}, got {type(value).__name__}")


def _validate_node(value, schema: dict, path: str, errors: list[str]) -> None:
    if "type" in schema:
        _check_type(value, schema["type"], path, errors)

    if "enum" in schema and value not in schema["enum"]:
        errors.append(f"{path}: value {value!r} not in enum {schema['enum']}")

    if "pattern" in schema and isinstance(value, str):
        if not re.match(schema["pattern"], value):
            errors.append(f"{path}: {value!r} does not match pattern {schema['pattern']}")

    if isinstance(value, dict):
        required = schema.get("required", [])
        for key in required:
            if key not in value:
                errors.append(f"{path}: missing required field '{key}'")
        props = schema.get("properties", {})
        for key, subschema in props.items():
            if key in value:
                _validate_node(value[key], subschema, f"{path}.{key}", errors)
        additional = schema.get("additionalProperties")
        if isinstance(additional, dict):
            for key, subvalue in value.items():
                if key not in props:
                    _validate_node(subvalue, additional, f"{path}.{key}", errors)

    if isinstance(value, list):
        min_items = schema.get("minItems")
        if min_items is not None and len(value) < min_items:
            errors.append(f"{path}: expected at least {min_items} item(s), got {len(value)}")
        items_schema = schema.get("items")
        if items_schema:
            for i, item in enumerate(value):
                _validate_node(item, items_schema, f"{path}[{i}]", errors)


def validate(data: dict, schema: dict) -> list[str]:
    errors: list[str] = []
    _validate_node(data, schema, "$", errors)
    return errors


def resolve_schema_path(name_or_path: str) -> Path:
    candidate = Path(name_or_path)
    if candidate.exists():
        return candidate
    named = SCHEMAS_DIR / f"{name_or_path}.schema.json"
    if named.exists():
        return named
    raise FileNotFoundError(f"No schema found for '{name_or_path}'")


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--schema", help="Schema short name, e.g. 'strategy' (looked up in schemas/)")
    ap.add_argument("--schema-path", type=Path, help="Explicit path to a .schema.json file")
    ap.add_argument("--data", type=Path, required=True)
    args = ap.parse_args()

    if not args.schema and not args.schema_path:
        raise SystemExit("Provide --schema <name> or --schema-path <file>")

    schema_path = args.schema_path or resolve_schema_path(args.schema)
    schema = load_json(schema_path)
    data = load_json(args.data)

    errors = validate(data, schema)
    if errors:
        print(f"INVALID — {args.data} against {schema_path.name}:")
        for e in errors:
            print(f"  - {e}")
        sys.exit(1)
    print(f"VALID — {args.data} matches {schema_path.name}")


if __name__ == "__main__":
    main()
