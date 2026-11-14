import os
import sys
import tempfile
from pathlib import Path

import pytest

# Database & kunci khusus tes — harus diatur sebelum modul app diimpor
_tmp = tempfile.mkdtemp(prefix="mawiyas-test-")
os.environ["MAWIYAS_DB"] = f"sqlite:///{Path(_tmp) / 'test.db'}"
os.environ["MAWIYAS_ENROLL_KEY"] = "kunci-daftar-tes"
os.environ["MAWIYAS_TEACHER_KEY"] = "kunci-guru-tes"
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

ITEMS = [("TES-1", "reasoning"), ("TES-2", "formulating"), ("TES-3", "employing"), ("TES-4", "interpreting"), ("TES-5", "employing")]


def _attempt(id_, code, mode, item, ind, total, ts, hints=0, reason_review=False):
    steps = [{"no": n, "score": 1 if n <= total else 0, "max": 1, "correct": n <= total, "ecf": False,
              "needsReview": reason_review and n == 6, "answer": "x", "wrong": 0, "hintLevel": 0, "skipped": False} for n in range(1, 7)]
    return {"id": id_, "studentCode": code, "mode": mode, "itemId": item, "indicator": ind, "total": total, "max": 6,
            "durationMs": 60000, "hintsUsed": hints, "steps": steps, "appVersion": "1.1.0", "ts": ts}


def make_export() -> dict:
    """Ekspor contoh: S01 pre 12 → post 24 (g = 0,667), S02 pre 6 → post 27 (g = 0,875). Bentuknya sama dengan ekspor aplikasi."""
    attempts, i = [], 1
    plan = {"S01": ([3, 2, 3, 2, 2], [5, 5, 5, 4, 5]), "S02": ([1, 1, 2, 1, 1], [6, 5, 6, 5, 5])}
    for code, (pre, post) in plan.items():
        for (item, ind), p, q in zip(ITEMS, pre, post):
            attempts.append(_attempt(i, code, "pretest", item, ind, p, 1000 + i, reason_review=item == "TES-1")); i += 1
            attempts.append(_attempt(i, code, "posttest", item, ind, q, 9000 + i)); i += 1
        for k, h in enumerate([4, 3, 1, 0]):  # latihan: petunjuk makin sedikit
            attempts.append(_attempt(i, code, "latihan", f"LAT-{k}", "employing", 6, 5000 + i, hints=h)); i += 1
    surveys = [
        {"id": 1, "studentCode": "S01", "instrument": "CL10", "context": "posttest", "answers": {"IL1": 4, "IL2": 5, "IL3": 6, "EL1": 2, "EL2": 1, "EL3": 3, "GL1": 8, "GL2": 9, "GL3": 7, "GL4": 8}, "ts": 99999},
        {"id": 2, "studentCode": "S02", "instrument": "CL10", "context": "posttest", "answers": {"IL1": 6, "IL2": 5, "IL3": 4, "EL1": 3, "EL2": 3, "EL3": 3, "GL1": 6, "GL2": 6, "GL3": 6, "GL4": 6}, "ts": 99998},
    ]
    return {
        "exportedAt": "2026-12-01T08:00:00Z",
        "students": [{"code": "S01", "classCode": "8A", "createdAt": 1, "diagnosticScore": 0.5, "remedialDone": True, "lessonsDone": ["u1"]},
                     {"code": "S02", "classCode": "8A", "createdAt": 1, "diagnosticScore": 1, "remedialDone": True, "lessonsDone": []}],
        "attempts": attempts,
        "hintEvents": [{"id": 1, "studentCode": "S01", "itemId": "LAT-0", "stepNo": 1, "level": 1, "trigger": "auto", "ts": 5001}],
        "simulations": [{"id": 1, "studentCode": "S01", "object": "dice", "variant": "2dadu-klasik", "trials": 100, "eventId": "sum7", "eventCount": 17, "animated": False, "ts": 4000}],
        "surveys": surveys,
    }


@pytest.fixture
def export_data() -> dict:
    return make_export()
