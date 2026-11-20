"""Pydantic mirror of web/lib/types.ts (frozen at Hour 3). extra="forbid" everywhere:
anything Claude returns outside the schema is rejected, so demographic fields cannot sneak in."""
from typing import Literal, Optional
from pydantic import BaseModel, ConfigDict, Field

Criterion = Literal[
    "cost", "commute", "lateNight", "laundry", "space", "quiet", "grocery",
    "bathroom", "furnished", "pets", "parking", "leaseFit",
]
Anchor = Literal["central", "north", "kerrytown", "medical", "downtown"]
Strict = ConfigDict(extra="forbid")


class ScheduleAnchor(BaseModel):
    model_config = Strict
    anchor: Anchor
    daysPerWeek: int = Field(ge=0, le=7)
    lateReturn: bool
    label: Optional[str] = Field(default=None, max_length=60)


class Evidence(BaseModel):
    model_config = Strict
    target: str
    quote: str = Field(max_length=300)


class HardConstraints(BaseModel):
    model_config = Strict
    inUnitLaundryRequired: Optional[bool] = None
    maxWeeklyCommuteMin: Optional[int] = Field(default=None, ge=0, le=3000)
    petFriendly: Optional[bool] = None
    furnished: Optional[bool] = None
    maxLeaseMonths: Optional[int] = Field(default=None, ge=1, le=24)
    laundryAtLeast: Optional[Literal["in_building"]] = None
    parkingRequired: Optional[bool] = None
    maxNoise: Optional[int] = Field(default=None, ge=1, le=5)
    maxGroceryWalkMin: Optional[int] = Field(default=None, ge=0, le=120)
    maxLateWalkMin: Optional[int] = Field(default=None, ge=0, le=120)


class Budget(BaseModel):
    model_config = Strict
    targetMonthly: int = Field(ge=200, le=6000)
    capMonthly: int = Field(ge=200, le=8000)


class Consent(BaseModel):
    model_config = Strict
    useFreeText: bool
    storeProfile: Literal[False] = False


class Household(BaseModel):
    model_config = Strict
    occupants: int = Field(ge=1, le=8)


class StudentProfile(BaseModel):
    model_config = Strict
    schemaVersion: Literal["1.0"] = "1.0"
    displayName: Optional[str] = None
    consent: Consent
    budget: Budget
    household: Household
    monthsNeeded: int = Field(ge=1, le=24)
    hasCar: bool
    anchors: list[ScheduleAnchor]
    priorities: list[list[Criterion]]
    hardConstraints: HardConstraints
    evidence: list[Evidence]


class ParsedListing(BaseModel):
    """What Claude may extract from a pasted listing or lease. Null = not stated -> UI asks."""
    model_config = Strict
    rentTotalMonthly: Optional[int] = None
    bedrooms: Optional[int] = None
    bathrooms: Optional[float] = None
    sqft: Optional[int] = None
    leaseMonths: Optional[int] = None
    laundry: Optional[Literal["in_unit", "in_building", "none"]] = None
    utilitiesIncluded: list[Literal["electric", "heat", "water", "internet"]] = []
    heatType: Optional[Literal["gas", "electric"]] = None
    parkingMonthly: Optional[int] = None
    oneTimeFeesTotal: Optional[int] = None
    furnished: Optional[bool] = None
    petFriendly: Optional[bool] = None
    evidence: list[Evidence] = []


class ParseRequest(BaseModel):
    model_config = Strict
    text: str = Field(min_length=10, max_length=4000)
    consent: bool
    demoKey: Optional[str] = None  # e.g. "maya" -> cached fallback


class ParseResponse(BaseModel):
    source: Literal["claude", "cache"]
    droppedEvidence: int  # quotes Claude returned that were NOT verbatim in the text
    data: dict
