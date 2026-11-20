import json, pathlib
from app.claude_parse import verify_quotes
from app.schemas import StudentProfile

SEED = pathlib.Path(__file__).resolve().parents[2] / "data" / "seed"


def test_seed_profiles_validate():
    for p in json.loads((SEED / "profiles.json").read_text()):
        StudentProfile.model_validate(p)


def test_demographic_keys_rejected():
    p = json.loads((SEED / "profiles.json").read_text())[0]
    p["gender"] = "x"
    try:
        StudentProfile.model_validate(p)
        assert False, "extra key should be rejected"
    except Exception:
        pass


def test_fabricated_quotes_are_dropped():
    text = "Last winter I hauled laundry two blocks in the snow. Never again."
    data = {"evidence": [{"target": "laundry", "quote": "hauled laundry two blocks"},
                         {"target": "quiet", "quote": "I need total silence"}]}
    data, dropped = verify_quotes(data, text)
    assert dropped == 1 and data["evidence"][0]["target"] == "laundry"
