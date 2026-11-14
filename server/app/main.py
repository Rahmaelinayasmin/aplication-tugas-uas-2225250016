"""MaWiYas Server (FastAPI).

Endpoint sesuai api.md §5:
  POST /v1/devices/register          daftar HP dengan kunci pendaftaran → device token
  POST /v1/sync                      kirim data dari HP (idempoten)
  GET  /v1/classes/{kelas}/summary   ringkasan skor per kode siswa        (kunci guru)
  GET  /v1/analysis                  laporan analisis lengkap (JSON)       (kunci guru)
  POST /v1/analysis/upload           analisis file ekspor JSON aplikasi    (kunci guru)
  GET  /v1/export/{jenis}.csv        unduh data gabungan                   (kunci guru)
  GET  /dashboard?key=…              dasbor guru (HTML)

Jalankan:  uvicorn app.main:app --host 0.0.0.0 --port 8000
"""

from __future__ import annotations

import io
import json
import secrets
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Annotated, Any

import pandas as pd
from fastapi import Depends, FastAPI, File, Form, Header, HTTPException, Query, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, StreamingResponse
from fastapi.templating import Jinja2Templates
from sqlmodel import Session, select

from . import __version__, analysis
from .config import DEFAULT_KEYS, settings
from .db import get_session, init_db
from .models import AttemptRow, Device, HintRow, SimulationRow, StudentRow, SurveyRow
from .schemas import RegisterIn, RegisterOut, SyncIn, SyncOut


@asynccontextmanager
async def lifespan(_: FastAPI):
    init_db()
    if DEFAULT_KEYS:
        print("PERINGATAN: kunci bawaan dipakai. Atur MAWIYAS_ENROLL_KEY dan MAWIYAS_TEACHER_KEY sebelum dipakai di sekolah.")
    yield


app = FastAPI(title="MaWiYas Server", version=__version__, lifespan=lifespan,
              description="Sinkronisasi & analisis data penelitian aplikasi MaWiYas (Konsep Dasar Peluang, kelas VIII).")
# WebView Capacitor memakai origin https://localhost; dev web memakai http://localhost:5173
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])
templates = Jinja2Templates(directory=str(Path(__file__).parent / "templates"))
SessionDep = Annotated[Session, Depends(get_session)]


# ───────────── keamanan sederhana ─────────────
def device_auth(session: SessionDep, authorization: Annotated[str | None, Header()] = None) -> Device:
    token = (authorization or "").removeprefix("Bearer ").strip()
    dev = session.get(Device, token) if token else None
    if not dev:
        raise HTTPException(401, "Token perangkat tidak valid. Daftarkan ulang HP di menu Guru / Peneliti.")
    return dev


def teacher_auth(x_teacher_key: Annotated[str | None, Header()] = None, key: Annotated[str | None, Query()] = None) -> None:
    given = x_teacher_key or key or ""
    if not secrets.compare_digest(given, settings.teacher_key):
        raise HTTPException(401, "Kunci guru salah.")


# ───────────── API ─────────────
@app.get("/v1/health")
def health() -> dict[str, Any]:
    return {"app": "MaWiYas Server", "version": __version__, "ok": True}


@app.post("/v1/devices/register", response_model=RegisterOut, response_model_by_alias=True)
def register(body: RegisterIn, session: SessionDep) -> RegisterOut:
    if not secrets.compare_digest(body.enroll_key, settings.enroll_key):
        raise HTTPException(401, "Kunci pendaftaran salah. Tanyakan ke peneliti.")
    dev = Device(token=secrets.token_urlsafe(24), class_code=body.class_code)
    session.add(dev)
    session.commit()
    return RegisterOut(device_token=dev.token)


@app.post("/v1/sync", response_model=SyncOut, response_model_by_alias=True)
def sync(body: SyncIn, session: SessionDep, _dev: Annotated[Device, Depends(device_auth)]) -> SyncOut:
    acc = {"students": 0, "attempts": 0, "hintEvents": 0, "simulations": 0, "surveys": 0}
    dup = dict.fromkeys(acc, 0)
    cid = lambda table, i: f"{body.device_id}:{table}:{i}"

    for s in body.students:  # siswa: upsert (status belajar bisa berubah)
        row = session.get(StudentRow, s.code) or StudentRow(code=s.code, class_code=s.class_code)
        row.class_code, row.diagnostic_score, row.remedial_done = s.class_code, s.diagnostic_score, s.remedial_done
        row.lessons_done = ",".join(s.lessons_done)
        session.add(row)
        acc["students"] += 1

    def add(table: str, model, client_id: str, **fields) -> None:
        existing = session.get(model, client_id)
        if existing is not None:
            if table == "attempts":  # skor alasan bisa diubah guru di HP → perbarui
                existing.total, existing.steps_json, existing.explanation = fields["total"], fields["steps_json"], fields["explanation"]
                session.add(existing)
            dup[table] += 1
            return
        session.add(model(client_id=client_id, **fields))
        acc[table] += 1

    for a in body.attempts:
        add("attempts", AttemptRow, cid("attempts", a.id), student_code=a.student_code, mode=a.mode, item_id=a.item_id,
            indicator=a.indicator, total=round(a.total), max=round(a.max), duration_ms=a.duration_ms, hints_used=a.hints_used,
            steps_json=json.dumps([s.model_dump(by_alias=True) for s in a.steps]), explanation=a.explanation or "", app_version=a.app_version, ts=a.ts)
    for h in body.hint_events:
        add("hintEvents", HintRow, cid("hints", h.id), student_code=h.student_code, item_id=h.item_id, step_no=h.step_no,
            level=h.level, trigger=h.trigger, ts=h.ts)
    for m in body.simulations:
        add("simulations", SimulationRow, cid("simulations", m.id), student_code=m.student_code, object=m.object, variant=m.variant,
            trials=m.trials, event_id=m.event_id, event_count=m.event_count, animated=m.animated, ts=m.ts)
    for v in body.surveys:
        add("surveys", SurveyRow, cid("surveys", v.id), student_code=v.student_code, instrument=v.instrument, context=v.context,
            answers_json=json.dumps(v.answers), ts=v.ts)
    session.commit()
    return SyncOut(accepted=acc, duplicates=dup)


def _frames(session: Session, class_code: str | None = None) -> dict[str, pd.DataFrame]:
    students = session.exec(select(StudentRow)).all()
    if class_code:
        students = [s for s in students if s.class_code == class_code]
    codes = {s.code for s in students}
    keep = lambda rows: [r for r in rows if not class_code or r.student_code in codes]
    return analysis.frames_from_rows(students, keep(session.exec(select(AttemptRow)).all()),
                                     keep(session.exec(select(SurveyRow)).all()), keep(session.exec(select(HintRow)).all()))


def _json_report(rep: dict[str, Any]) -> dict[str, Any]:
    clean = lambda df: json.loads(df.to_json(orient="records"))
    return {"summary": rep["summary"], **{k: clean(v) for k, v in rep.items() if isinstance(v, pd.DataFrame)}}


@app.get("/v1/classes/{class_code}/summary", dependencies=[Depends(teacher_auth)])
def class_summary(class_code: str, session: SessionDep) -> list[dict[str, Any]]:
    f = _frames(session, class_code)
    scores = analysis.test_scores(f["attempts"], f["students"], settings.test_max)
    return json.loads(scores.to_json(orient="records"))


@app.get("/v1/analysis", dependencies=[Depends(teacher_auth)])
def full_analysis(session: SessionDep, kelas: str | None = None) -> dict[str, Any]:
    return _json_report(analysis.report(_frames(session, kelas), settings.test_max))


@app.post("/v1/analysis/upload", dependencies=[Depends(teacher_auth)])
async def analyze_upload(file: UploadFile = File(...)) -> dict[str, Any]:
    return _json_report(analysis.report(analysis.frames_from_export(await _read_export(file)), settings.test_max))


async def _read_export(file: UploadFile) -> dict[str, Any]:
    try:
        data = json.loads(await file.read())
        assert isinstance(data, dict) and "attempts" in data
        return data
    except Exception as e:  # noqa: BLE001
        raise HTTPException(400, "File bukan ekspor JSON MaWiYas (Guru / Peneliti → Semua (JSON)).") from e


@app.get("/v1/export/{kind}.csv", dependencies=[Depends(teacher_auth)])
def export_csv(kind: str, session: SessionDep, kelas: str | None = None) -> StreamingResponse:
    rep = analysis.report(_frames(session, kelas), settings.test_max)
    tables = {"skor": rep["scores"], "indikator": rep["indicators"], "beban-kognitif": rep["cognitive_load_per_student"], "petunjuk": rep["hint_fading"]}
    if kind not in tables:
        raise HTTPException(404, f"Jenis ekspor: {', '.join(tables)}")
    buf = io.StringIO()
    tables[kind].to_csv(buf, index=False)
    return StreamingResponse(iter(["﻿" + buf.getvalue()]), media_type="text/csv",
                             headers={"Content-Disposition": f'attachment; filename="mawiyas-{kind}.csv"'})


# ───────────── dasbor guru (HTML) ─────────────
def _render(request: Request, rep: dict[str, Any], key: str, kelas: str | None, source: str, classes: list[str]) -> HTMLResponse:
    # NaN → None agar template menampilkan "–"
    tables = {k: v.astype(object).where(v.notna(), None).to_dict(orient="records") for k, v in rep.items() if isinstance(v, pd.DataFrame)}
    return templates.TemplateResponse(request, "dashboard.html", {
        "s": rep["summary"], "t": tables, "key": key, "kelas": kelas or "", "source": source, "classes": classes,
        "indicators_cols": list(rep["indicators"].columns), "default_keys": DEFAULT_KEYS, "version": __version__})


@app.get("/dashboard", response_class=HTMLResponse, dependencies=[Depends(teacher_auth)])
def dashboard(request: Request, session: SessionDep, key: str, kelas: str | None = None) -> HTMLResponse:
    classes = sorted({s.class_code for s in session.exec(select(StudentRow)).all()})
    return _render(request, analysis.report(_frames(session, kelas or None), settings.test_max), key, kelas, "server", classes)


@app.post("/dashboard/upload", response_class=HTMLResponse)
async def dashboard_upload(request: Request, key: Annotated[str, Form()], file: UploadFile = File(...)) -> HTMLResponse:
    teacher_auth(key=key)
    rep = analysis.report(analysis.frames_from_export(await _read_export(file)), settings.test_max)
    return _render(request, rep, key, None, f"file: {file.filename}", [])


@app.get("/", response_class=HTMLResponse)
def root() -> str:
    return ("<!doctype html><meta charset=utf-8><title>MaWiYas Server</title>"
            "<body style='font-family:system-ui;padding:24px;background:#FBF8F3;color:#2E3440'>"
            f"<h1>MaWiYas Server {__version__}</h1><p>Server berjalan. Buka <code>/dashboard?key=KUNCI_GURU</code> untuk dasbor, "
            "atau <a href='/docs'>/docs</a> untuk dokumentasi API.</p>")
