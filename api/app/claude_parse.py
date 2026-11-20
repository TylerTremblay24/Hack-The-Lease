"""Claude parsing with forced tool use (= JSON schema), Pydantic validation, verbatim-quote check,
and a cached fallback so the demo never depends on the network."""
import json, os, pathlib
from typing import Type
from pydantic import BaseModel, ValidationError

from .prompts import LISTING_SYSTEM, PROFILE_SYSTEM
from .schemas import ParsedListing, StudentProfile

MODEL = os.getenv("ANTHROPIC_MODEL", "claude-sonnet-5-5")
CACHE = pathlib.Path(__file__).resolve().parents[2] / "web" / "public" / "cache"
TIMEOUT_S = 12


def verify_quotes(data: dict, text: str) -> tuple[dict, int]:
    """Drop evidence whose quote is not literally in the student's text (anti-hallucination)."""
    norm = " ".join(text.split()).lower()
    kept = [e for e in data.get("evidence", []) if " ".join(e["quote"].split()).lower() in norm]
    dropped = len(data.get("evidence", [])) - len(kept)
    data["evidence"] = kept
    return data, dropped


def _call_claude(system: str, text: str, model_cls: Type[BaseModel], tool_name: str) -> dict:
    import anthropic  # imported lazily so the API boots without a key

    client = anthropic.Anthropic(timeout=TIMEOUT_S)
    msg = client.messages.create(
        model=MODEL,
        max_tokens=1500,
        system=system,
        tools=[{"name": tool_name, "description": "Return the structured result.",
                "input_schema": model_cls.model_json_schema()}],
        tool_choice={"type": "tool", "name": tool_name},
        messages=[{"role": "user", "content": text}],
    )
    block = next(b for b in msg.content if b.type == "tool_use")
    return block.input


def _cached(kind: str, demo_key: str | None) -> dict | None:
    if not demo_key:
        return None
    f = CACHE / f"{kind}_{demo_key}.json"
    return json.loads(f.read_text()) if f.exists() else None


def parse(kind: str, text: str, demo_key: str | None) -> tuple[dict, str, int]:
    system, cls, tool = (PROFILE_SYSTEM, StudentProfile, "save_profile") if kind == "profile" \
        else (LISTING_SYSTEM, ParsedListing, "save_listing")
    try:
        raw = _call_claude(system, text, cls, tool)
        raw.setdefault("consent", {"useFreeText": True, "storeProfile": False}) if kind == "profile" else None
        data = cls.model_validate(raw).model_dump(exclude_none=True)
        data, dropped = verify_quotes(data, text)
        return data, "claude", dropped
    except (ValidationError, StopIteration, Exception) as err:  # noqa: BLE001 - demo must not crash
        cached = _cached(kind, demo_key)
        if cached is None:
            raise RuntimeError(f"Parse failed and no cache for demoKey={demo_key!r}: {err}") from err
        return cached, "cache", 0
