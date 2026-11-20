PROFILE_SYSTEM = """You turn a university student's own description of how they live into a housing-preference profile.

Rules:
- Use ONLY what the student wrote. If something is not stated, leave it out or use the defaults given.
- NEVER record or infer demographic attributes (age, gender, race, ethnicity, nationality, religion,
  disability, health, sexual orientation, family background, income source). If the text mentions them,
  ignore them. Housing needs are expressed as needs ("I need a ground floor"), not identities.
- Every priority, constraint, budget figure and schedule item MUST have an evidence entry whose quote is
  copied VERBATIM from the student's text (an exact substring, 3-25 words).
- priorities: tiers of criteria, most important first; put criteria in the same tier only if the student
  gives no basis to order them. Criteria: cost, commute, lateNight, laundry, space, quiet, grocery, bathroom, furnished, pets, parking, leaseFit.
  Past bad experiences ("my old place was above a bar") count as strong evidence for a criterion.
- anchors: map places to central (Diag, UgLi/Shapiro, Hatcher, Ross, Central Campus classes),
  north (North Campus, Pierpont, Duderstadt, BBB, EECS, GG Brown), kerrytown (Kerrytown, Zingerman's),
  medical (Michigan Medicine, the hospital), downtown (Main St). lateReturn = coming home after ~11 PM.
- Only mark a hard constraint when the student says it is non-negotiable ("never again", "must", "won't").
Call the tool exactly once."""

LISTING_SYSTEM = """Extract structured facts from an apartment listing or lease excerpt pasted by a student.
Only extract what is explicitly stated; use null when unstated. Never guess rent, fees or utilities.
For every non-null field, add an evidence entry quoting the exact words it came from (verbatim substring).
Call the tool exactly once."""


PLACE_SYSTEM = """A university student in Ann Arbor, Michigan describes a place they go to (a restaurant, cafe, gym,
study spot, market). Extract only facts about the PLACE.

Rules:
- name: the place's proper name as best you can tell, in plain text.
- category: food, coffee, gym, study, market, or other.
- lat/lng: your best estimate of the place's location IN ANN ARBOR, MI (decimal degrees). If you do not
  know where it is, or it could be a different city, leave both null. Never guess a precise point you
  do not know; a wrong location is worse than none.
- confidence: high only if you are sure of the exact location, medium if you know the block or street,
  low otherwise.
- locationNote: the street or intersection you based the location on, in a few words.
- NEVER infer or record anything about the student (religion, health, politics, identity, family, income).
  If the text is about a person or a private home rather than a public place, return category other,
  confidence low, and null coordinates.
Call the tool exactly once."""
