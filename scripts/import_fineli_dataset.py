#!/usr/bin/env python3
from __future__ import annotations

import csv
import json
import sys
import tempfile
import zipfile
from decimal import Decimal, InvalidOperation
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ARCHIVE = ROOT.parent / "Fineli_Rel20.zip"
OUTPUT_FILE = ROOT / "public" / "data" / "fineli-dataset.json"

REQUIRED_NUTRIENTS = {"ENERC", "PROT", "CHOAVL", "FAT"}


def parse_decimal(raw_value: str | None) -> float | None:
    if raw_value is None:
        return None

    cleaned = raw_value.strip().replace("\xa0", "").replace(" ", "")
    if not cleaned:
        return None

    if "," in cleaned and "." not in cleaned:
        cleaned = cleaned.replace(".", "").replace(",", ".")
    elif "," in cleaned and "." in cleaned:
        cleaned = cleaned.replace(".", "").replace(",", ".")

    try:
        return float(Decimal(cleaned))
    except (InvalidOperation, ValueError):
        return None


def read_csv_rows(csv_path: Path):
    with csv_path.open("r", encoding="latin-1", newline="") as handle:
        reader = csv.DictReader(handle, delimiter=";")
        return list(reader)


def find_dataset_dir(archive_path: Path) -> Path:
    with zipfile.ZipFile(archive_path) as archive:
        temp_dir = Path(tempfile.mkdtemp(prefix="fineli-import-"))
        archive.extractall(temp_dir)
        return temp_dir


def main() -> int:
    if not ARCHIVE.exists():
        print(f"Fineli archive not found: {ARCHIVE}", file=sys.stderr)
        return 1

    dataset_dir = find_dataset_dir(ARCHIVE)
    try:
        food_name_map: dict[str, str] = {}
        name_file = dataset_dir / "foodname_EN.csv"
        if name_file.exists():
            for row in read_csv_rows(name_file):
                food_id = (row.get("FOODID") or "").strip()
                food_name = (row.get("FOODNAME") or "").strip()
                if food_id and food_name and food_id not in food_name_map:
                    food_name_map[food_id] = food_name

        nutrient_by_food: dict[str, dict[str, float]] = {}
        nutrient_file = dataset_dir / "component_value.csv"
        if nutrient_file.exists():
            for row in read_csv_rows(nutrient_file):
                food_id = (row.get("FOODID") or "").strip()
                nutrient_name = (row.get("EUFDNAME") or "").strip()
                if not food_id or not nutrient_name:
                    continue

                value = parse_decimal(row.get("BESTLOC"))
                if value is None:
                    continue

                nutrient_by_food.setdefault(food_id, {})[nutrient_name] = value

        foods: list[dict[str, object]] = []
        seen_food_ids: set[str] = set()
        food_index_file = dataset_dir / "food.csv"
        if food_index_file.exists():
            for row in read_csv_rows(food_index_file):
                food_id = (row.get("FOODID") or "").strip()
                if not food_id or food_id in seen_food_ids:
                    continue
                seen_food_ids.add(food_id)

                name = food_name_map.get(food_id) or (row.get("FOODNAME") or "").strip()
                if not name:
                    continue

                nutrients = nutrient_by_food.get(food_id, {})
                if not REQUIRED_NUTRIENTS.issubset(nutrients.keys()):
                    continue

                energy_kj = nutrients["ENERC"]
                calories = round(energy_kj / 4.184, 1) if energy_kj else 0.0

                foods.append(
                    {
                        "id": f"fineli-{food_id}",
                        "source": "fineli",
                        "name": name,
                        "defaultServingGrams": 100,
                        "nutritionPer100g": {
                            "calories": calories,
                            "protein": round(float(nutrients["PROT"]), 1),
                            "carbs": round(float(nutrients["CHOAVL"]), 1),
                            "fat": round(float(nutrients["FAT"]), 1),
                        },
                        "usageCount": 0,
                    }
                )

        foods.sort(key=lambda item: str(item["name"]).lower())
        OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)
        OUTPUT_FILE.write_text(
            json.dumps(foods, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )
        print(f"Imported {len(foods)} foods into {OUTPUT_FILE.relative_to(ROOT)}")
        return 0
    finally:
        for child in sorted(dataset_dir.iterdir(), reverse=True):
            if child.is_file() or child.is_symlink():
                child.unlink()
            elif child.is_dir():
                for nested in sorted(child.rglob("*"), reverse=True):
                    if nested.is_file() or nested.is_symlink():
                        nested.unlink()
                    elif nested.is_dir():
                        nested.rmdir()
                child.rmdir()
        dataset_dir.rmdir()


if __name__ == "__main__":
    raise SystemExit(main())
