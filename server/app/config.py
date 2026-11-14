"""Konfigurasi lewat variabel lingkungan. Ganti kunci bawaan sebelum dipakai di sekolah."""

import os
from dataclasses import dataclass


@dataclass(frozen=True)
class Settings:
    # Kunci pendaftaran HP: diketik guru di aplikasi (Guru / Peneliti → Sinkron ke server)
    enroll_key: str = os.getenv("MAWIYAS_ENROLL_KEY", "MAWIYAS-2026")
    # Kunci guru/peneliti untuk dasbor & endpoint analisis
    teacher_key: str = os.getenv("MAWIYAS_TEACHER_KEY", "guru-mawiyas")
    database_url: str = os.getenv("MAWIYAS_DB", "sqlite:///./mawiyas.db")
    test_max: int = 30  # Tabel 2: 5 soal × 6 tahap × skor 1


settings = Settings()
DEFAULT_KEYS = settings.enroll_key == "MAWIYAS-2026" or settings.teacher_key == "guru-mawiyas"
