"""Analisis data penelitian MaWiYas dengan pandas.

Dipakai oleh dasbor FastAPI DAN oleh perintah `python -m app.cli` untuk file ekspor JSON dari aplikasi.

- Skor tes Mathematical Literacy (Tabel 2, maks. 30) pretest & posttest per siswa
- N-gain ternormalisasi (Hake): g = (post − pre) / (maks − pre); tinggi ≥ 0,7 · sedang 0,3–0,7 · rendah < 0,3
- Persentase skor per indikator ML (pre vs post)
- Beban kognitif IL / EL / GL dari kuesioner (rata-rata 0–10)
- Fading petunjuk: rata-rata petunjuk per langkah, paruh awal vs paruh akhir latihan
"""

from __future__ import annotations

import json
from typing import Any

import pandas as pd

INDICATORS = {
    "reasoning": "Mathematical Reasoning",
    "formulating": "Formulating Situations Mathematically",
    "employing": "Employing Concepts, Facts & Procedures",
    "interpreting": "Interpreting, Applying & Evaluating",
}

ATTEMPT_COLS = ["student_code", "mode", "item_id", "indicator", "total", "max", "hints_used", "steps", "ts"]


def _snake(rec: dict[str, Any]) -> dict[str, Any]:
    out = {}
    for k, v in rec.items():
        s = "".join("_" + c.lower() if c.isupper() else c for c in k)
        out[s] = v
    return out


def frames_from_export(data: dict[str, Any]) -> dict[str, pd.DataFrame]:
    """Ubah file `mawiyas-semua-*.json` (ekspor aplikasi) menjadi DataFrame."""
    students = pd.DataFrame([_snake(s) for s in data.get("students", [])], columns=["code", "class_code", "diagnostic_score"])
    attempts = pd.DataFrame([_snake(a) for a in data.get("attempts", [])])
    if attempts.empty:
        attempts = pd.DataFrame(columns=ATTEMPT_COLS)
    surveys = pd.DataFrame([_snake(s) for s in data.get("surveys", [])], columns=["student_code", "context", "answers", "ts"])
    hints = pd.DataFrame([_snake(h) for h in data.get("hintEvents", [])], columns=["student_code", "item_id", "step_no", "level", "trigger", "ts"])
    return {"students": students, "attempts": attempts[ATTEMPT_COLS], "surveys": surveys, "hints": hints}


def frames_from_rows(students, attempts, surveys, hints) -> dict[str, pd.DataFrame]:
    """Ubah baris database (SQLModel) menjadi DataFrame dengan kolom yang sama."""
    st = pd.DataFrame([{"code": s.code, "class_code": s.class_code, "diagnostic_score": s.diagnostic_score} for s in students],
                      columns=["code", "class_code", "diagnostic_score"])
    at = pd.DataFrame([{"student_code": a.student_code, "mode": a.mode, "item_id": a.item_id, "indicator": a.indicator,
                        "total": a.total, "max": a.max, "hints_used": a.hints_used, "steps": json.loads(a.steps_json), "ts": a.ts}
                       for a in attempts], columns=ATTEMPT_COLS)
    sv = pd.DataFrame([{"student_code": s.student_code, "context": s.context, "answers": json.loads(s.answers_json), "ts": s.ts} for s in surveys],
                      columns=["student_code", "context", "answers", "ts"])
    hn = pd.DataFrame([{"student_code": h.student_code, "item_id": h.item_id, "step_no": h.step_no, "level": h.level, "trigger": h.trigger, "ts": h.ts} for h in hints],
                      columns=["student_code", "item_id", "step_no", "level", "trigger", "ts"])
    return {"students": st, "attempts": at, "surveys": sv, "hints": hn}


def _latest_tests(attempts: pd.DataFrame) -> pd.DataFrame:
    """Percobaan tes terakhir per siswa × mode × soal (bila tes diulang, yang terbaru dipakai)."""
    t = attempts[attempts["mode"].isin(["pretest", "posttest"])]
    if t.empty:
        return t
    return t.sort_values("ts").groupby(["student_code", "mode", "item_id"], as_index=False).last()


def hake_category(g: float | None) -> str:
    if g is None or pd.isna(g):
        return "–"
    return "tinggi" if g >= 0.7 else "sedang" if g >= 0.3 else "rendah"


def test_scores(attempts: pd.DataFrame, students: pd.DataFrame, test_max: int = 30) -> pd.DataFrame:
    """Satu baris per siswa: kelas, diagnostik, pretest, posttest, N-gain, kategori."""
    t = _latest_tests(attempts)
    cols = ["student_code", "class_code", "diagnostic", "pretest", "posttest", "n_gain", "kategori"]
    if students.empty and t.empty:
        return pd.DataFrame(columns=cols)
    base = students.rename(columns={"code": "student_code", "diagnostic_score": "diagnostic"})[["student_code", "class_code", "diagnostic"]]
    if not t.empty:
        piv = t.pivot_table(index="student_code", columns="mode", values="total", aggfunc="sum").reset_index()
        base = base.merge(piv, on="student_code", how="outer")
    for m in ("pretest", "posttest"):
        if m not in base:
            base[m] = pd.NA
    pre, post = base["pretest"].astype("Float64"), base["posttest"].astype("Float64")
    denom = (test_max - pre).where(pre < test_max)
    base["n_gain"] = ((post - pre) / denom).round(3)
    base["kategori"] = [hake_category(None if pd.isna(g) else float(g)) for g in base["n_gain"]]
    return base[cols].sort_values("student_code").reset_index(drop=True)


def indicator_table(attempts: pd.DataFrame) -> pd.DataFrame:
    """Persentase skor per indikator ML, pretest vs posttest (dihitung dari jumlah skor / jumlah maksimum)."""
    t = _latest_tests(attempts)
    rows = []
    for ind, name in INDICATORS.items():
        row: dict[str, Any] = {"indikator": name}
        for m in ("pretest", "posttest"):
            sub = t[(t["indicator"] == ind) & (t["mode"] == m)] if not t.empty else t
            row[m] = round(float(sub["total"].sum()) / float(sub["max"].sum()) * 100, 1) if len(sub) and sub["max"].sum() else None
        row["selisih"] = round(row["posttest"] - row["pretest"], 1) if row["pretest"] is not None and row["posttest"] is not None else None
        rows.append(row)
    return pd.DataFrame(rows, columns=["indikator", "pretest", "posttest", "selisih"])


def cognitive_load(surveys: pd.DataFrame) -> tuple[pd.DataFrame, pd.DataFrame]:
    """Skor IL/EL/GL per isian kuesioner, dan rata-ratanya per konteks (pretest/posttest/latihan)."""
    cols = ["student_code", "context", "IL", "EL", "GL"]
    if surveys.empty:
        return pd.DataFrame(columns=cols), pd.DataFrame(columns=["context", "n", "IL", "EL", "GL"])
    rows = []
    for _, s in surveys.iterrows():
        a: dict[str, float] = s["answers"]
        def mean(prefix: str) -> float | None:
            v = [float(x) for k, x in a.items() if k.startswith(prefix)]
            return round(sum(v) / len(v), 2) if v else None
        rows.append({"student_code": s["student_code"], "context": s["context"], "IL": mean("IL"), "EL": mean("EL"), "GL": mean("GL")})
    per = pd.DataFrame(rows, columns=cols)
    agg = per.groupby("context").agg(n=("student_code", "count"), IL=("IL", "mean"), EL=("EL", "mean"), GL=("GL", "mean")).round(2).reset_index()
    return per, agg


def hint_fading(attempts: pd.DataFrame) -> pd.DataFrame:
    """Petunjuk per langkah pada paruh awal vs paruh akhir latihan setiap siswa. Turun = bantuan memudar."""
    p = attempts[attempts["mode"] == "latihan"].sort_values("ts")
    cols = ["student_code", "soal_latihan", "petunjuk_awal", "petunjuk_akhir", "memudar"]
    rows = []
    for code, g in p.groupby("student_code"):
        if len(g) < 2:
            continue
        per_step = [a_hints / max(1, len(steps)) for a_hints, steps in zip(g["hints_used"], g["steps"])]
        half = len(per_step) // 2
        early, late = sum(per_step[:half]) / half, sum(per_step[half:]) / (len(per_step) - half)
        rows.append({"student_code": code, "soal_latihan": len(g), "petunjuk_awal": round(early, 2), "petunjuk_akhir": round(late, 2), "memudar": late < early})
    return pd.DataFrame(rows, columns=cols)


def report(frames: dict[str, pd.DataFrame], test_max: int = 30) -> dict[str, Any]:
    scores = test_scores(frames["attempts"], frames["students"], test_max)
    paired = scores.dropna(subset=["pretest", "posttest"])
    per_cl, cl = cognitive_load(frames["surveys"])
    review = 0
    for steps in frames["attempts"]["steps"]:
        review += sum(1 for s in steps if s.get("needsReview", s.get("needs_review")) and not s.get("reviewed"))
    summary = {
        "siswa": int(len(scores)),
        "berpasangan": int(len(paired)),
        "rata_pretest": round(float(paired["pretest"].mean()), 2) if len(paired) else None,
        "rata_posttest": round(float(paired["posttest"].mean()), 2) if len(paired) else None,
        "rata_n_gain": round(float(paired["n_gain"].dropna().mean()), 3) if paired["n_gain"].notna().any() else None,
        "perlu_dicek": review,
        "test_max": test_max,
    }
    summary["kategori_n_gain"] = hake_category(summary["rata_n_gain"])
    return {"summary": summary, "scores": scores, "indicators": indicator_table(frames["attempts"]),
            "cognitive_load": cl, "cognitive_load_per_student": per_cl, "hint_fading": hint_fading(frames["attempts"])}


def to_markdown(df: pd.DataFrame) -> str:
    """Tabel Markdown sederhana (tanpa dependensi tambahan)."""
    if df.empty:
        return "_(belum ada data)_\n"
    fmt = lambda v: "–" if v is None or (not isinstance(v, (list, dict)) and pd.isna(v)) else (f"{v:.3g}" if isinstance(v, float) else str(v))
    head = "| " + " | ".join(map(str, df.columns)) + " |\n|" + "---|" * len(df.columns) + "\n"
    return head + "".join("| " + " | ".join(fmt(v) for v in row) + " |\n" for row in df.itertuples(index=False))
