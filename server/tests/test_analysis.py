import json

import pytest

from app import analysis
from app.cli import main as cli_main


def test_ngain_dan_kategori_hake(export_data):
    rep = analysis.report(analysis.frames_from_export(export_data))
    s = rep["scores"].set_index("student_code")
    assert s.loc["S01", "pretest"] == 12 and s.loc["S01", "posttest"] == 24
    assert s.loc["S01", "n_gain"] == pytest.approx(12 / 18, abs=1e-3)
    assert s.loc["S01", "kategori"] == "sedang"
    assert s.loc["S02", "n_gain"] == pytest.approx(21 / 24, abs=1e-3)
    assert s.loc["S02", "kategori"] == "tinggi"
    assert rep["summary"]["berpasangan"] == 2
    assert rep["summary"]["rata_pretest"] == 9.0 and rep["summary"]["rata_posttest"] == 25.5
    assert rep["summary"]["perlu_dicek"] == 2  # TES-1 tahap 6 pada pretest kedua siswa


def test_hake_batas():
    assert analysis.hake_category(0.7) == "tinggi"
    assert analysis.hake_category(0.3) == "sedang"
    assert analysis.hake_category(0.29) == "rendah"
    assert analysis.hake_category(None) == "–"


def test_tes_diulang_yang_terbaru_dipakai(export_data):
    redo = dict(export_data["attempts"][0])
    redo.update(id=999, total=6, ts=2_000_000)  # S01 mengulang pretest TES-1
    export_data["attempts"].append(redo)
    s = analysis.report(analysis.frames_from_export(export_data))["scores"].set_index("student_code")
    assert s.loc["S01", "pretest"] == 12 - 3 + 6


def test_indikator(export_data):
    ind = analysis.report(analysis.frames_from_export(export_data))["indicators"].set_index("indikator")
    # Reasoning: pre (3+1)/12, post (5+6)/12
    assert ind.loc["Mathematical Reasoning", "pretest"] == pytest.approx(33.3, abs=0.1)
    assert ind.loc["Mathematical Reasoning", "posttest"] == pytest.approx(91.7, abs=0.1)


def test_beban_kognitif(export_data):
    rep = analysis.report(analysis.frames_from_export(export_data))
    row = rep["cognitive_load"].set_index("context").loc["posttest"]
    assert row["n"] == 2
    assert row["IL"] == pytest.approx(5.0)
    assert row["EL"] == pytest.approx(2.5)
    assert row["GL"] == pytest.approx(7.0)


def test_fading_petunjuk(export_data):
    f = analysis.report(analysis.frames_from_export(export_data))["hint_fading"].set_index("student_code")
    assert bool(f.loc["S01", "memudar"]) is True
    assert f.loc["S01", "petunjuk_awal"] > f.loc["S01", "petunjuk_akhir"]


def test_ekspor_kosong_tidak_error():
    rep = analysis.report(analysis.frames_from_export({"students": [], "attempts": [], "surveys": []}))
    assert rep["summary"]["siswa"] == 0 and rep["summary"]["rata_n_gain"] is None


def test_cli_menggabung_dua_hp(tmp_path, export_data):
    a, b = dict(export_data), dict(export_data)
    b["students"] = [{"code": "S03", "classCode": "8B", "diagnosticScore": 0.8, "remedialDone": True, "lessonsDone": []}]
    b["attempts"] = [{**x, "studentCode": "S03"} for x in export_data["attempts"] if x["studentCode"] == "S01"]
    (tmp_path / "hp1.json").write_text(json.dumps(a), encoding="utf-8")
    (tmp_path / "hp2.json").write_text(json.dumps(b), encoding="utf-8")
    assert cli_main([str(tmp_path / "hp1.json"), str(tmp_path / "hp2.json"), "--out", str(tmp_path / "out")]) == 0
    laporan = (tmp_path / "out" / "laporan.md").read_text(encoding="utf-8")
    assert "S03" in laporan and "N-gain" in laporan
    assert (tmp_path / "out" / "skor-ngain.csv").exists()
