"""Tabel database (SQLModel). Hanya kode siswa — tidak ada nama, foto, lokasi, atau ID perangkat keras."""

from datetime import datetime, timezone

from sqlmodel import Field, SQLModel


def now() -> datetime:
    return datetime.now(timezone.utc)


class Device(SQLModel, table=True):
    token: str = Field(primary_key=True)
    class_code: str
    created_at: datetime = Field(default_factory=now)


class StudentRow(SQLModel, table=True):
    code: str = Field(primary_key=True)  # S01
    class_code: str = Field(index=True)
    diagnostic_score: float | None = None
    remedial_done: bool = False
    lessons_done: str = ""  # dipisah koma


class AttemptRow(SQLModel, table=True):
    client_id: str = Field(primary_key=True)  # "<deviceId>:attempts:<id lokal>" → idempoten
    student_code: str = Field(index=True)
    mode: str = Field(index=True)  # latihan | pretest | posttest
    item_id: str
    indicator: str
    total: int
    max: int
    duration_ms: int
    hints_used: int
    steps_json: str
    explanation: str = ""
    app_version: str
    ts: int


class HintRow(SQLModel, table=True):
    client_id: str = Field(primary_key=True)
    student_code: str = Field(index=True)
    item_id: str
    step_no: int
    level: int
    trigger: str
    ts: int


class SimulationRow(SQLModel, table=True):
    client_id: str = Field(primary_key=True)
    student_code: str = Field(index=True)
    object: str
    variant: str
    trials: int
    event_id: str
    event_count: int
    animated: bool
    ts: int


class SurveyRow(SQLModel, table=True):
    client_id: str = Field(primary_key=True)
    student_code: str = Field(index=True)
    instrument: str
    context: str
    answers_json: str
    ts: int
