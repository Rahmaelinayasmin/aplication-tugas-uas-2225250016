"""Analisis file ekspor JSON dari aplikasi MaWiYas tanpa menjalankan server.

Pemakaian:
    python -m app.cli mawiyas-semua-2026-12-01.json [lebih banyak file …] --out hasil-analisis

Beberapa file (dari beberapa HP) digabung. Hasil: laporan.md + CSV per tabel di folder --out.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from . import analysis
from .config import settings


def merge_exports(paths: list[Path]) -> dict:
    """Gabungkan ekspor dari beberapa HP. id lokal diberi awalan nomor file agar tidak bertabrakan."""
    merged: dict[str, list] = {"students": [], "attempts": [], "hintEvents": [], "simulations": [], "surveys": []}
    seen_students: dict[str, dict] = {}
    for n, p in enumerate(paths):
        data = json.loads(p.read_text(encoding="utf-8"))
        for s in data.get("students", []):
            seen_students[s["code"]] = s
        for k in ("attempts", "hintEvents", "simulations", "surveys"):
            for rec in data.get(k, []):
                merged[k].append({**rec, "id": f"{n}-{rec.get('id')}"})
    merged["students"] = list(seen_students.values())
    return merged


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description="Analisis data penelitian MaWiYas (pandas)")
    ap.add_argument("files", nargs="+", type=Path, help="file ekspor JSON dari menu Guru / Peneliti")
    ap.add_argument("--out", type=Path, default=Path("hasil-analisis"))
    args = ap.parse_args(argv)

    rep = analysis.report(analysis.frames_from_export(merge_exports(args.files)), settings.test_max)
    args.out.mkdir(parents=True, exist_ok=True)
    names = {"scores": "skor-ngain", "indicators": "skor-indikator", "cognitive_load": "beban-kognitif-rata",
             "cognitive_load_per_student": "beban-kognitif-siswa", "hint_fading": "fading-petunjuk"}
    for key, name in names.items():
        rep[key].to_csv(args.out / f"{name}.csv", index=False, encoding="utf-8-sig")

    s = rep["summary"]
    md = [
        "# Laporan Analisis MaWiYas\n",
        f"Sumber: {', '.join(p.name for p in args.files)}\n",
        "## Ringkasan\n",
        f"- Siswa: **{s['siswa']}** (pretest & posttest lengkap: **{s['berpasangan']}**)",
        f"- Rata-rata pretest: **{s['rata_pretest']}** / {s['test_max']} · posttest: **{s['rata_posttest']}** / {s['test_max']}",
        f"- Rata-rata N-gain: **{s['rata_n_gain']}** (kategori {s['kategori_n_gain']})",
        f"- Jawaban alasan yang belum dicek guru: {s['perlu_dicek']}\n",
        "## Skor & N-gain per siswa\n", analysis.to_markdown(rep["scores"]),
        "## Skor per indikator Mathematical Literacy (%)\n", analysis.to_markdown(rep["indicators"]),
        "## Beban kognitif (0–10)\n", analysis.to_markdown(rep["cognitive_load"]),
        "_Kuesioner adaptasi Leppink dkk. (2013), belum divalidasi pada siswa SMP._\n",
        "## Fading petunjuk\n", analysis.to_markdown(rep["hint_fading"]),
    ]
    (args.out / "laporan.md").write_text("\n".join(md), encoding="utf-8")
    print("\n".join(md[3:8]))
    print(f"\nLaporan lengkap: {args.out / 'laporan.md'}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
