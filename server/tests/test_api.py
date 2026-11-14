import io
import json

from fastapi.testclient import TestClient

from app.main import app

GURU = {"X-Teacher-Key": "kunci-guru-tes"}


def _client() -> TestClient:
    return TestClient(app)


def _register(c: TestClient) -> dict:
    r = c.post("/v1/devices/register", json={"classCode": "8A", "enrollKey": "kunci-daftar-tes"})
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['deviceToken']}"}


def test_health():
    with _client() as c:
        assert c.get("/v1/health").json()["ok"] is True


def test_daftar_dengan_kunci_salah_ditolak():
    with _client() as c:
        r = c.post("/v1/devices/register", json={"classCode": "8A", "enrollKey": "salah"})
        assert r.status_code == 401


def test_sync_butuh_token():
    with _client() as c:
        assert c.post("/v1/sync", json={"deviceId": "hp-12345678"}).status_code == 401


def test_sync_idempoten_dan_analisis(export_data):
    with _client() as c:
        auth = _register(c)
        body = {"deviceId": "hp-uji-0001", **{k: export_data[k] for k in ("students", "attempts", "hintEvents", "simulations", "surveys")}}
        r1 = c.post("/v1/sync", json=body, headers=auth)
        assert r1.status_code == 200, r1.text
        assert r1.json()["accepted"]["attempts"] == len(export_data["attempts"])
        r2 = c.post("/v1/sync", json=body, headers=auth)  # kirim ulang → semua terdeteksi duplikat
        assert r2.json()["accepted"]["attempts"] == 0
        assert r2.json()["duplicates"]["attempts"] == len(export_data["attempts"])

        assert c.get("/v1/analysis").status_code == 401
        rep = c.get("/v1/analysis", headers=GURU).json()
        assert rep["summary"]["berpasangan"] == 2
        assert {r["student_code"] for r in rep["scores"]} == {"S01", "S02"}

        summary = c.get("/v1/classes/8A/summary", headers=GURU).json()
        assert {r["kategori"] for r in summary} == {"sedang", "tinggi"}

        html = c.get("/dashboard", params={"key": "kunci-guru-tes"})
        assert html.status_code == 200 and "S01" in html.text and "Dasbor MaWiYas" in html.text

        csv = c.get("/v1/export/skor.csv", headers=GURU)
        assert csv.status_code == 200 and "n_gain" in csv.text


def test_siswa_tanpa_kode_valid_ditolak():
    with _client() as c:
        auth = _register(c)
        bad = {"deviceId": "hp-uji-0002", "students": [{"code": "Budi", "classCode": "8A"}]}
        assert c.post("/v1/sync", json=bad, headers=auth).status_code == 422  # nama asli tidak diterima


def test_unggah_ekspor_json(export_data):
    with _client() as c:
        f = {"file": ("mawiyas-semua.json", io.BytesIO(json.dumps(export_data).encode()), "application/json")}
        r = c.post("/v1/analysis/upload", files=f, headers=GURU)
        assert r.status_code == 200 and r.json()["summary"]["rata_posttest"] == 25.5
        bad = {"file": ("x.json", io.BytesIO(b"bukan json"), "application/json")}
        assert c.post("/v1/analysis/upload", files=bad, headers=GURU).status_code == 400
        page = c.post("/dashboard/upload", data={"key": "kunci-guru-tes"}, files={"file": ("e.json", io.BytesIO(json.dumps(export_data).encode()), "application/json")})
        assert page.status_code == 200 and "file: e.json" in page.text
