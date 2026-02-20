"""
============================================================
FILE 03: PATH PARAMETERS, QUERY PARAMETERS, AND TYPE CONVERSION
============================================================
Topics: path parameters, type conversion (int, float, str, UUID),
        path validation, Enum parameters, query parameters,
        required vs optional, None defaults, bool conversion,
        combining path + query, path type params, route ordering

WHY THIS MATTERS:
Every real API needs to identify resources (path params) and
filter/sort/paginate them (query params). Getting the type
system right means FastAPI validates inputs for free — no
manual parsing, no try/except on every int() call.
============================================================
"""

# STORY: IRCTC — /trains/{number} vs ?from=Delhi&to=Mumbai
# IRCTC handles over 25 lakh (2.5 million) bookings daily during peak
# season on the Indian Railways network. Their API must identify specific
# trains by number (/trains/12301 for Rajdhani Express) while letting
# users search with filters (?from=NDLS&to=BCT&class=3A&date=2024-12-25).
# Path params identify WHAT resource; query params filter HOW to view it.
# Before structured validation, wrong types (train number as "abc") caused
# cascading database errors. Type-safe parameters eliminated those entirely.

from enum import Enum
from uuid import UUID
from typing import Optional, List
from fastapi import FastAPI, Query, Path
import uvicorn

app = FastAPI(
    title="IRCTC Railway API",
    description="Learning path and query parameters through Indian Railways.",
    version="1.0.0",
)

# ════════════════════════════════════════════════════════════
# SECTION 1 — Path Parameters Basics
# ════════════════════════════════════════════════════════════

# WHY: Path parameters identify a specific resource. They're
# part of the URL itself, making URLs bookmarkable, shareable,
# and meaningful (REST principle).

# --- Basic path parameter ---
# The {train_number} in the URL becomes a function argument.
# FastAPI extracts it from the URL path automatically.

@app.get("/trains/{train_number}", tags=["Trains"])
def get_train(train_number: int):
    """
    Path parameter: {train_number}
    URL example: /trains/12301

    FastAPI sees the type hint `int` and:
    1. Extracts "12301" from the URL
    2. Converts it to Python int (12301)
    3. If conversion fails (e.g., /trains/abc) → automatic 422 error
    """
    trains = {
        12301: {"number": 12301, "name": "Howrah Rajdhani", "from": "NDLS", "to": "HWH"},
        12951: {"number": 12951, "name": "Mumbai Rajdhani", "from": "NDLS", "to": "BCT"},
        12627: {"number": 12627, "name": "Karnataka Express", "from": "NDLS", "to": "SBC"},
    }
    if train_number in trains:
        return trains[train_number]
    return {"error": f"Train {train_number} not found"}


# --- Multiple path parameters ---
@app.get("/trains/{train_number}/coaches/{coach_number}", tags=["Trains"])
def get_coach(train_number: int, coach_number: str):
    """
    Multiple path params: {train_number} and {coach_number}
    URL example: /trains/12301/coaches/B1

    train_number is int (validated as number)
    coach_number is str (accepts anything: B1, S4, H1)
    """
    return {
        "train": train_number,
        "coach": coach_number,
        "seats": 72 if coach_number.startswith("S") else 46,
        "type": "Sleeper" if coach_number.startswith("S") else "AC"
    }


# ════════════════════════════════════════════════════════════
# SECTION 2 — Type Conversion and Validation
# ════════════════════════════════════════════════════════════

# WHY: FastAPI uses Python type hints for automatic conversion.
# This means you write `train_number: int` and FastAPI handles
# parsing, validation, and error messages — zero manual code.

# --- int type: auto-converts string to integer ---
@app.get("/stations/{station_code}", tags=["Stations"])
def get_station(station_code: str):
    """
    str type: no conversion needed, accepts anything.
    URL: /stations/NDLS or /stations/BCT
    """
    stations = {
        "NDLS": {"code": "NDLS", "name": "New Delhi", "zone": "Northern"},
        "BCT": {"code": "BCT", "name": "Mumbai Central", "zone": "Western"},
        "MAS": {"code": "MAS", "name": "Chennai Central", "zone": "Southern"},
        "HWH": {"code": "HWH", "name": "Howrah", "zone": "Eastern"},
        "SBC": {"code": "SBC", "name": "Bangalore City", "zone": "South Western"},
    }
    if station_code.upper() in stations:
        return stations[station_code.upper()]
    return {"error": f"Station {station_code} not found"}


# --- float type ---
@app.get("/fare/{distance_km}", tags=["Fare"])
def calculate_fare(distance_km: float):
    """
    float type: auto-converts "123.5" → 123.5
    URL: /fare/1384.5
    If you send /fare/abc → 422 error automatically.
    """
    # Indian Railways fare calculation (simplified)
    base_fare = distance_km * 0.60                 # ~60 paise per km for sleeper
    gst = base_fare * 0.05                         # 5% GST on rail tickets
    return {
        "distance_km": distance_km,
        "base_fare": round(base_fare, 2),
        "gst": round(gst, 2),
        "total_fare": round(base_fare + gst, 2),
        "class": "Sleeper (SL)"
    }


# --- UUID type ---
@app.get("/bookings/{booking_id}", tags=["Bookings"])
def get_booking(booking_id: UUID):
    """
    UUID type: validates UUID format automatically.
    URL: /bookings/550e8400-e29b-41d4-a716-446655440000
    If you send /bookings/not-a-uuid → 422 error.

    IRCTC PNR numbers aren't UUIDs, but internal booking
    references often are (for deduplication across systems).
    """
    return {
        "booking_id": str(booking_id),
        "pnr": "4512367890",
        "status": "CONFIRMED",
        "train": 12301,
        "passengers": 2
    }


# ════════════════════════════════════════════════════════════
# SECTION 3 — Enum Path Parameters
# ════════════════════════════════════════════════════════════

# WHY: Enums restrict path parameters to a fixed set of values.
# FastAPI generates a dropdown in Swagger UI and rejects invalid
# values automatically.

# --- Define an Enum for travel class ---
class TrainClass(str, Enum):
    """
    Indian Railways travel classes.
    Inheriting from str AND Enum makes it work with FastAPI's
    JSON serialization and OpenAPI schema generation.
    """
    sleeper = "SL"
    ac_three_tier = "3A"
    ac_two_tier = "2A"
    ac_first = "1A"
    general = "GN"
    second_sitting = "2S"


class Zone(str, Enum):
    """Railway zones of India."""
    northern = "NR"
    western = "WR"
    southern = "SR"
    eastern = "ER"
    central = "CR"
    south_western = "SWR"


# --- Use Enum in path parameter ---
@app.get("/classes/{travel_class}/fare-chart", tags=["Fare"])
def fare_chart(travel_class: TrainClass):
    """
    Enum path parameter: only accepts defined values.
    URL: /classes/SL/fare-chart or /classes/3A/fare-chart
    URL: /classes/INVALID → 422 error with allowed values listed!

    Swagger UI will show a dropdown with all valid options.
    """
    fare_multiplier = {
        TrainClass.sleeper: 1.0,
        TrainClass.ac_three_tier: 2.5,
        TrainClass.ac_two_tier: 3.8,
        TrainClass.ac_first: 5.5,
        TrainClass.general: 0.4,
        TrainClass.second_sitting: 0.6,
    }
    return {
        "class": travel_class.value,
        "class_name": travel_class.name,
        "fare_multiplier": fare_multiplier[travel_class],
        "base_rate_per_km": 0.60,
        "effective_rate": 0.60 * fare_multiplier[travel_class]
    }


# --- Enum in zone routes ---
@app.get("/zones/{zone}/stations", tags=["Stations"])
def zone_stations(zone: Zone):
    """
    Another Enum example — restricts to valid railway zones.
    URL: /zones/NR/stations → Northern Railway stations
    """
    zone_data = {
        Zone.northern: ["New Delhi", "Lucknow", "Chandigarh"],
        Zone.western: ["Mumbai Central", "Ahmedabad", "Rajkot"],
        Zone.southern: ["Chennai Central", "Trivandrum", "Coimbatore"],
        Zone.eastern: ["Howrah", "Patna", "Ranchi"],
        Zone.central: ["CSMT Mumbai", "Nagpur", "Bhopal"],
        Zone.south_western: ["Bangalore", "Hubli", "Mysore"],
    }
    return {
        "zone": zone.value,
        "zone_name": zone.name,
        "stations": zone_data.get(zone, [])
    }


# ════════════════════════════════════════════════════════════
# SECTION 4 — Query Parameters Basics
# ════════════════════════════════════════════════════════════

# WHY: Query parameters are for filtering, sorting, pagination,
# and search. They appear after ? in the URL and are the standard
# way to customize a GET request without changing the resource.

# --- Basic query parameters ---
# Any function parameter that's NOT a path parameter becomes
# a query parameter automatically.

@app.get("/search/trains", tags=["Search"])
def search_trains(
    from_station: str,                             # Required (no default)
    to_station: str,                               # Required (no default)
    date: str = "2024-12-25",                      # Optional with default
):
    """
    Query parameters in action.
    URL: /search/trains?from_station=NDLS&to_station=BCT&date=2024-12-25
    URL: /search/trains?from_station=NDLS&to_station=BCT  (date defaults)

    from_station and to_station are REQUIRED — omitting them → 422 error.
    date is OPTIONAL — defaults to "2024-12-25" if not provided.
    """
    return {
        "from": from_station,
        "to": to_station,
        "date": date,
        "trains": [
            {"number": 12951, "name": "Mumbai Rajdhani", "departure": "16:55"},
            {"number": 12953, "name": "August Kranti", "departure": "17:40"},
        ]
    }


# --- Optional query parameters with None ---
@app.get("/search/stations", tags=["Search"])
def search_stations(
    name: Optional[str] = None,                    # Optional, defaults to None
    zone: Optional[str] = None,                    # Optional, defaults to None
    has_wifi: Optional[bool] = None,               # Optional bool
):
    """
    Optional query parameters default to None.
    URL: /search/stations                           → all stations
    URL: /search/stations?name=Delhi                → filter by name
    URL: /search/stations?zone=NR&has_wifi=true     → filter by zone + wifi
    """
    results = [
        {"name": "New Delhi", "zone": "NR", "has_wifi": True},
        {"name": "Mumbai Central", "zone": "WR", "has_wifi": True},
        {"name": "Patna", "zone": "ER", "has_wifi": False},
        {"name": "Chennai Central", "zone": "SR", "has_wifi": True},
    ]
    # Apply filters
    if name:
        results = [s for s in results if name.lower() in s["name"].lower()]
    if zone:
        results = [s for s in results if s["zone"] == zone.upper()]
    if has_wifi is not None:
        results = [s for s in results if s["has_wifi"] == has_wifi]

    return {"stations": results, "count": len(results)}


# ════════════════════════════════════════════════════════════
# SECTION 5 — Bool Query Parameters and Pagination
# ════════════════════════════════════════════════════════════

# WHY: Bool params are surprisingly flexible in FastAPI, and
# pagination is the most common query parameter pattern.

# --- Bool type query parameter ---
@app.get("/trains/available", tags=["Trains"])
def available_trains(
    ac_only: bool = False,
    tatkal: bool = False,
):
    """
    Bool query parameters accept many truthy/falsy values:

    TRUE  values: true, True, 1, yes, on
    FALSE values: false, False, 0, no, off

    URL: /trains/available?ac_only=true&tatkal=yes    → both True
    URL: /trains/available?ac_only=1&tatkal=on        → both True
    URL: /trains/available?ac_only=false               → ac_only=False

    This flexibility is great for forms where different frontends
    may send different boolean representations.
    """
    trains = [
        {"number": 12301, "name": "Rajdhani", "is_ac": True, "is_tatkal": True},
        {"number": 12621, "name": "Tamil Nadu Express", "is_ac": True, "is_tatkal": False},
        {"number": 12561, "name": "Swatantrata Express", "is_ac": False, "is_tatkal": True},
    ]
    if ac_only:
        trains = [t for t in trains if t["is_ac"]]
    if tatkal:
        trains = [t for t in trains if t["is_tatkal"]]
    return {"trains": trains}


# --- Pagination pattern (skip + limit) ---
@app.get("/passengers", tags=["Passengers"])
def list_passengers(
    skip: int = 0,                                 # Offset
    limit: int = 10,                               # Page size
):
    """
    Pagination with skip and limit — the most common pattern.
    URL: /passengers               → first 10 (skip=0, limit=10)
    URL: /passengers?skip=10       → next 10 (items 11-20)
    URL: /passengers?skip=20&limit=5 → 5 items starting from 21

    This is simpler than page-based pagination and works well
    with database OFFSET/LIMIT queries.
    """
    # Simulated passenger list
    all_passengers = [
        {"id": i, "name": f"Passenger {i}", "pnr": f"45123{i:04d}"}
        for i in range(1, 101)                     # 100 passengers
    ]
    paginated = all_passengers[skip: skip + limit]
    return {
        "passengers": paginated,
        "total": len(all_passengers),
        "skip": skip,
        "limit": limit,
        "has_more": (skip + limit) < len(all_passengers),
    }


# ════════════════════════════════════════════════════════════
# SECTION 6 — Combining Path and Query Parameters
# ════════════════════════════════════════════════════════════

# WHY: Real APIs almost always combine both — path params
# identify the resource, query params customize the response.

# --- Path + Query combination ---
@app.get("/trains/{train_number}/schedule", tags=["Trains"])
def train_schedule(
    train_number: int,                             # Path param (from URL)
    date: str = "2024-12-25",                      # Query param (from ?date=...)
    include_stops: bool = True,                    # Query param (optional)
):
    """
    Combining path and query parameters.
    URL: /trains/12301/schedule?date=2024-12-26&include_stops=false

    FastAPI knows:
    - train_number is a PATH param (it's in the URL template)
    - date and include_stops are QUERY params (they're not in the URL)
    """
    schedule = {
        "train_number": train_number,
        "date": date,
    }
    if include_stops:
        schedule["stops"] = [
            {"station": "New Delhi", "arrival": "--", "departure": "16:55"},
            {"station": "Kota", "arrival": "22:30", "departure": "22:35"},
            {"station": "Vadodara", "arrival": "03:45", "departure": "03:50"},
            {"station": "Mumbai Central", "arrival": "08:35", "departure": "--"},
        ]
    return schedule


# --- Complex real-world example: IRCTC seat availability ---
@app.get("/trains/{train_number}/availability", tags=["Trains"])
def check_availability(
    train_number: int,                             # Path: which train
    travel_class: Optional[str] = "SL",            # Query: which class
    quota: Optional[str] = "GN",                   # Query: which quota
    date: Optional[str] = "2024-12-25",            # Query: which date
    from_station: Optional[str] = None,            # Query: boarding point
    to_station: Optional[str] = None,              # Query: destination
):
    """
    Real-world IRCTC-like availability check.
    URL: /trains/12301/availability?travel_class=3A&quota=TQ&date=2024-12-26

    Path identifies THE train.
    Query params filter HOW to check availability.
    This is the pattern IRCTC's actual API follows.
    """
    return {
        "train_number": train_number,
        "class": travel_class,
        "quota": quota,
        "date": date,
        "from": from_station or "Origin",
        "to": to_station or "Destination",
        "availability": "AVAILABLE-42",
        "fare": 1245,
    }


# ════════════════════════════════════════════════════════════
# SECTION 7 — Query and Path with Advanced Validation
# ════════════════════════════════════════════════════════════

# WHY: Query() and Path() let you add validation constraints
# (min, max, regex) and richer documentation to parameters.

@app.get("/validated/trains/{train_number}", tags=["Validated"])
def validated_train(
    train_number: int = Path(
        ...,                                       # ... means required
        title="Train Number",
        description="5-digit Indian Railways train number",
        ge=10000,                                  # Greater than or equal
        le=99999,                                  # Less than or equal
        examples=[12301, 12951],
    ),
):
    """
    Path() adds validation to path parameters.
    /validated/trains/12301   → OK (between 10000-99999)
    /validated/trains/999     → 422 (less than 10000)
    /validated/trains/100000  → 422 (greater than 99999)
    """
    return {"train_number": train_number, "valid": True}


@app.get("/validated/search", tags=["Validated"])
def validated_search(
    q: str = Query(
        ...,                                       # Required
        min_length=2,                              # At least 2 chars
        max_length=50,                             # At most 50 chars
        title="Search Query",
        description="Search for trains, stations, or routes",
        examples=["Rajdhani", "Delhi to Mumbai"],
    ),
    skip: int = Query(
        default=0,
        ge=0,                                      # Cannot be negative
        description="Number of results to skip",
    ),
    limit: int = Query(
        default=10,
        ge=1,                                      # At least 1
        le=100,                                    # At most 100
        description="Max results to return (1-100)",
    ),
):
    """
    Query() adds validation to query parameters.
    /validated/search?q=Ra&skip=0&limit=10         → OK
    /validated/search?q=R&skip=0&limit=10          → 422 (q too short)
    /validated/search?q=Rajdhani&limit=200         → 422 (limit > 100)
    /validated/search?skip=-5                      → 422 (skip < 0)
    """
    return {
        "query": q,
        "skip": skip,
        "limit": limit,
        "results": [f"Result for '{q}' #{i}" for i in range(skip, skip + limit)]
    }


# --- Query parameter with regex pattern ---
@app.get("/validated/pnr/{pnr_number}", tags=["Validated"])
def check_pnr(
    pnr_number: str = Path(
        ...,
        min_length=10,
        max_length=10,
        pattern=r"^\d{10}$",                       # Exactly 10 digits
        title="PNR Number",
        description="10-digit PNR number for checking booking status",
        examples=["4512367890"],
    ),
):
    """
    Pattern validation with regex.
    /validated/pnr/4512367890    → OK (10 digits)
    /validated/pnr/ABC1234567    → 422 (contains letters)
    /validated/pnr/12345         → 422 (too short)
    """
    return {
        "pnr": pnr_number,
        "status": "CONFIRMED",
        "train": "12301 Howrah Rajdhani",
        "class": "3A",
        "passengers": [
            {"name": "Rahul Sharma", "status": "CNF/B2/34"},
            {"name": "Priya Sharma", "status": "CNF/B2/35"},
        ]
    }


# ════════════════════════════════════════════════════════════
# SECTION 8 — Route Ordering with Path Parameters
# ════════════════════════════════════════════════════════════

# WHY: When you have both static routes and parameterized routes,
# order determines which one catches the request.

# --- CORRECT: Static routes before parameterized routes ---

# Static route — defined FIRST
@app.get("/specials/tatkal", tags=["Specials"])
def tatkal_info():
    """
    Static route: matches /specials/tatkal exactly.
    Must be defined BEFORE the parameterized route below.
    """
    return {
        "scheme": "Tatkal",
        "booking_opens": "10:00 AM (AC), 11:00 AM (Non-AC)",
        "extra_charge": "10-30% of base fare",
    }


# Static route — defined SECOND
@app.get("/specials/premium-tatkal", tags=["Specials"])
def premium_tatkal_info():
    """Another static route — also before the generic one."""
    return {
        "scheme": "Premium Tatkal",
        "booking_opens": "10:00 AM (AC), 11:00 AM (Non-AC)",
        "dynamic_pricing": True,
    }


# Parameterized route — defined LAST
@app.get("/specials/{scheme_name}", tags=["Specials"])
def get_special_scheme(scheme_name: str):
    """
    Generic parameterized route — catches everything else.
    /specials/tatkal         → caught by tatkal_info() above
    /specials/premium-tatkal → caught by premium_tatkal_info() above
    /specials/ladies-quota   → caught HERE (not a static match)
    """
    return {
        "scheme": scheme_name,
        "message": f"Details for {scheme_name} scheme",
    }


# --- MULTIPLE query params as list ---
@app.get("/multi-search", tags=["Search"])
def multi_search(
    stations: Optional[List[str]] = Query(
        default=None,
        description="Filter by multiple station codes",
        examples=[["NDLS", "BCT"]],
    ),
):
    """
    List-type query parameter — accepts multiple values.
    URL: /multi-search?stations=NDLS&stations=BCT&stations=MAS

    This sends stations as a list: ["NDLS", "BCT", "MAS"]
    Useful for multi-select filters in UIs.
    """
    if stations:
        return {"filter_stations": stations, "count": len(stations)}
    return {"filter_stations": "all", "count": "unlimited"}


# ════════════════════════════════════════════════════════════
# KEY TAKEAWAYS
# ════════════════════════════════════════════════════════════
# 1. Path parameters identify resources (/trains/12301); query params filter them (?class=3A).
# 2. Type hints (int, float, UUID) give you automatic conversion and 422 errors for free.
# 3. Enum path parameters restrict values to a fixed set — great for API contracts.
# 4. Query parameters without defaults are REQUIRED; with defaults they are OPTIONAL.
# 5. Bool query params accept true/false/1/0/yes/no/on/off — very forgiving.
# 6. Path() and Query() add validation (ge, le, min_length, max_length, pattern).
# 7. Always define static routes (/items/special) BEFORE parameterized ones (/items/{id}).
# 8. Combine path + query params freely — FastAPI figures out which is which from the URL template.
# "Simplicity is the soul of efficiency." — Austin Freeman

if __name__ == "__main__":
    uvicorn.run(
        "03-path-query-parameters:app",
        host="127.0.0.1",
        port=8000,
        reload=True,
    )
