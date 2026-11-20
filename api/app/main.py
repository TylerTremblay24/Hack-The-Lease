"""uvicorn app.main:app --reload --port 8000   (run from api/)"""
import json, pathlib
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from .claude_parse import parse
from .schemas import ParseRequest, ParseResponse

SEED = pathlib.Path(__file__).resolve().parents[2] / "data" / "seed"
app = FastAPI(title="Tipping Point API")
app.add_middleware(CORSMiddleware, allow_origins=["http://localhost:3000"], allow_methods=["*"], allow_headers=["*"])


@app.get("/health")
def health():
    return {"ok": True}


@app.get("/listings")
def listings():
    return json.loads((SEED / "listings.json").read_text())


@app.get("/assumptions")
def assumptions():
    return json.loads((SEED / "assumptions.json").read_text())


@app.post("/parse/{kind}", response_model=ParseResponse)
def parse_text(kind: str, req: ParseRequest):
    if kind not in ("profile", "listing"):
        raise HTTPException(404)
    if not req.consent:
        raise HTTPException(400, "Consent is required to analyze free text.")
    try:
        data, source, dropped = parse(kind, req.text, req.demoKey)
    except RuntimeError as e:
        raise HTTPException(502, str(e))
    # Free text is never stored or logged: only the structured result leaves this function.
    return ParseResponse(source=source, droppedEvidence=dropped, data=data)
