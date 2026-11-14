"""Bentuk data yang dikirim aplikasi Android (sama dengan ekspor JSON di aplikasi, camelCase)."""

from pydantic import BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel


class Camel(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True, extra="ignore")


class RegisterIn(Camel):
    class_code: str = Field(pattern=r"^[0-9]{1,2}[A-Z]{0,2}$")
    enroll_key: str


class RegisterOut(Camel):
    device_token: str


class StudentIn(Camel):
    code: str = Field(pattern=r"^S\d{2,3}$")
    class_code: str
    diagnostic_score: float | None = None
    remedial_done: bool = False
    lessons_done: list[str] = []


class StepIn(Camel):
    no: int
    score: float
    max: float
    correct: bool
    ecf: bool = False
    needs_review: bool = False
    reviewed: bool | None = None
    answer: str = ""
    wrong: int = 0
    hint_level: int = 0
    skipped: bool = False


class AttemptIn(Camel):
    id: int
    student_code: str
    mode: str
    item_id: str
    indicator: str
    total: float
    max: float
    duration_ms: int
    hints_used: int
    steps: list[StepIn]
    explanation: str | None = None  # F07 "Jelaskan ke teman"
    app_version: str = ""
    ts: int


class HintIn(Camel):
    id: int
    student_code: str
    item_id: str
    step_no: int
    level: int
    trigger: str
    ts: int


class SimulationIn(Camel):
    id: int
    student_code: str
    object: str
    variant: str
    trials: int
    event_id: str
    event_count: int
    animated: bool
    ts: int


class SurveyIn(Camel):
    id: int
    student_code: str
    instrument: str
    context: str
    answers: dict[str, float]
    ts: int


class SyncIn(Camel):
    """Satu paket sinkron. Mengirim ulang data yang sama aman (idempoten)."""

    device_id: str = Field(min_length=8, max_length=64)
    students: list[StudentIn] = []
    attempts: list[AttemptIn] = []
    hint_events: list[HintIn] = []
    simulations: list[SimulationIn] = []
    surveys: list[SurveyIn] = []


class SyncOut(Camel):
    accepted: dict[str, int]
    duplicates: dict[str, int]
