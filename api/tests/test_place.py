import json, pathlib
import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError

from app import claude_parse
from app.main import app
from app.schemas import ParsedPlace, StudentProfile

SEED = pathlib.Path(__file__).resolve().parents[2] / "data" / "seed"
client = TestClient(app)


def fake(result):
    def _f(system, text, cls, tool):
        if isinstance(result, Exception):
            raise result
        return result
    return _f


def post(text="Panera on State St", consent=True):
    return client.post("/parse/place", json={"text": text, "consent": consent})


def test_claude_place_inside_ann_arbor(monkeypatch):
    monkeypatch.setattr(claude_parse, "_call_claude", fake(
        {"name": "Panera Bread", "category": "food", "lat": 42.2795, "lng": -83.7425, "confidence": "medium", "locationNote": "State St near Liberty"}))
    r = post()
    assert r.status_code == 200
    j = r.json()
    assert j["source"] == "claude" and j["needsLocation"] is False
    assert j["data"]["lat"] == 42.2795


def test_place_outside_ann_arbor_is_not_trusted(monkeypatch):
    monkeypatch.setattr(claude_parse, "_call_claude", fake(
        {"name": "Panera Bread", "category": "food", "lat": 41.88, "lng": -87.63, "confidence": "high"}))  # Chicago
    j = post().json()
    assert j["needsLocation"] is True and j["data"]["lat"] is None and j["data"]["lng"] is None


def test_low_confidence_location_is_dropped(monkeypatch):
    monkeypatch.setattr(claude_parse, "_call_claude", fake(
        {"name": "Some Cafe", "category": "coffee", "lat": 42.28, "lng": -83.74, "confidence": "low"}))
    j = post("some cafe").json()
    assert j["needsLocation"] is True and j["data"]["lat"] is None


def test_missing_coordinates_ask_the_student(monkeypatch):
    monkeypatch.setattr(claude_parse, "_call_claude", fake(
        {"name": "Mystery Gym", "category": "gym", "lat": None, "lng": None, "confidence": "low"}))
    assert post("mystery gym").json()["needsLocation"] is True


def test_offline_falls_back_to_builtin_places(monkeypatch):
    monkeypatch.setattr(claude_parse, "_call_claude", fake(RuntimeError("no key")))
    j = post("zingermans deli").json()
    assert j["source"] == "list" and j["needsLocation"] is False
    assert abs(j["data"]["lat"] - 42.2836) < 1e-6


def test_offline_and_unknown_is_a_clean_502(monkeypatch):
    monkeypatch.setattr(claude_parse, "_call_claude", fake(RuntimeError("no key")))
    assert post("totally unknown pop-up").status_code == 502


def test_consent_required():
    assert post(consent=False).status_code == 400


def test_extra_fields_from_claude_are_rejected():
    with pytest.raises(ValidationError):
        ParsedPlace.model_validate({"name": "X", "category": "food", "confidence": "high", "religion": "y"})


def test_ui_shaped_profile_validates():
    """What the page builds (ranges, place chips, per-place limits) must satisfy the mirrored schema."""
    p = json.loads((SEED / "profiles.json").read_text())[0]
    place = {"id": "zingermans-deli", "name": "Zingerman's Deli", "category": "food", "coords": {"lat": 42.2836, "lng": -83.7468}, "source": "list"}
    p.update({"monthsRange": [8, 12], "occupantsRange": [1, 2], "places": [place]})
    p["priorities"] = [["place:zingermans-deli"], ["cost"]]
    p["hardConstraints"] = {"placeMaxWalkMin": {"zingermans-deli": 10}, "maxNoise": 2, "parkingRequired": True}
    StudentProfile.model_validate(p)
