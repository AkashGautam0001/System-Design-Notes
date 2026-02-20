"""
============================================================
FILE 09: JINJA2 TEMPLATES, HTML RESPONSES, AND STATIC FILES
============================================================
Topics: HTMLResponse, Jinja2Templates, TemplateResponse,
        template variables, control flow, inheritance,
        filters, includes, StaticFiles, RedirectResponse,
        StreamingResponse, PlainTextResponse, FileResponse

WHY THIS MATTERS:
Not every API returns JSON. Server-rendered HTML is still the
backbone of admin panels, email templates, PNR status pages,
and any SEO-critical content. Understanding templates is key
to building full-stack applications with FastAPI.
============================================================
"""

# STORY: IRCTC PNR Status Page — Server-Rendered HTML with Booking Data
# Indian Railway Catering and Tourism Corporation (IRCTC) serves
# 25+ million bookings per month. When passengers check PNR status,
# they get a server-rendered HTML page showing coach, berth, waiting
# list position, and journey details. This page must load fast, work
# on 2G connections, and be SEO-indexable. JSON APIs power the mobile
# app, but the web experience is pure server-side Jinja2 rendering.
# This pattern — data from backend, rendered to HTML via templates —
# is how most of India's railway information reaches its travelers.

# Requires: pip install jinja2

from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import (
    HTMLResponse,
    RedirectResponse,
    PlainTextResponse,
    StreamingResponse,
    FileResponse,
    JSONResponse,
)
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from pydantic import BaseModel
from typing import Optional
import os
import io
from datetime import datetime, date

app = FastAPI(title="IRCTC-Style Templates Demo")


# ════════════════════════════════════════════════════════════
# SECTION 1 — HTMLResponse for Simple HTML
# ════════════════════════════════════════════════════════════

# WHY: For small, static HTML snippets you do not need a full template
# engine. HTMLResponse lets you return HTML directly from a function.

@app.get("/", response_class=HTMLResponse)
def home_page():
    """Return simple HTML without a template engine."""
    return """
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <title>IRCTC PNR Status</title>
        <style>
            body { font-family: Arial, sans-serif; max-width: 800px; margin: 50px auto; }
            .header { background: #003580; color: white; padding: 20px; text-align: center; }
            .form-box { padding: 30px; border: 1px solid #ddd; margin-top: 20px; }
            input[type=text] { padding: 10px; width: 200px; font-size: 16px; }
            button { padding: 10px 30px; background: #e65100; color: white; border: none; cursor: pointer; }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>Indian Railways PNR Status</h1>
            <p>Check your booking status</p>
        </div>
        <div class="form-box">
            <form action="/pnr" method="get">
                <label>Enter 10-digit PNR Number:</label><br><br>
                <input type="text" name="pnr" pattern="[0-9]{10}" required>
                <button type="submit">Check Status</button>
            </form>
        </div>
    </body>
    </html>
    """


# ════════════════════════════════════════════════════════════
# SECTION 2 — Jinja2Templates Setup
# ════════════════════════════════════════════════════════════

# WHY: Real applications have dozens of pages. Templates separate
# HTML structure from Python logic, enabling reuse and maintainability.

# --- Template directory setup ---
# In production, you would have a templates/ folder with .html files.
# For this demo, we create templates programmatically so this .py
# file compiles and runs without external files.

TEMPLATE_DIR = "/tmp/irctc_templates"
STATIC_DIR = "/tmp/irctc_static"

def setup_template_files():
    """
    Create template files on disk. In a real project, these would be
    .html files in your templates/ directory, created by hand.
    """
    os.makedirs(TEMPLATE_DIR, exist_ok=True)
    os.makedirs(os.path.join(STATIC_DIR, "css"), exist_ok=True)
    os.makedirs(os.path.join(STATIC_DIR, "js"), exist_ok=True)

    # --- base.html: Template Inheritance (parent layout) ---
    # {% block %} defines overridable sections
    base_html = """<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{% block title %}IRCTC{% endblock %}</title>
    <link rel="stylesheet" href="/static/css/style.css">
    {% block head %}{% endblock %}
</head>
<body>
    <nav class="navbar">
        <span class="logo">IRCTC</span>
        <a href="/">Home</a>
        <a href="/trains">Trains</a>
        <a href="/about">About</a>
    </nav>

    <div class="container">
        {% block content %}
        <p>Default content — override this block in child templates.</p>
        {% endblock %}
    </div>

    <footer class="footer">
        <p>Indian Railways &copy; {{ year }}</p>
    </footer>

    {% block scripts %}{% endblock %}
</body>
</html>"""

    # --- pnr_status.html: Child template with variables and control flow ---
    pnr_html = """{% extends "base.html" %}

{% block title %}PNR Status - {{ pnr_number }}{% endblock %}

{% block content %}
<h1>PNR Status: {{ pnr_number }}</h1>

{% if error %}
    <div class="error">{{ error }}</div>
{% else %}
    <div class="booking-info">
        <h2>{{ train_name }} ({{ train_number }})</h2>
        <table>
            <tr><td>From:</td><td>{{ from_station }}</td></tr>
            <tr><td>To:</td><td>{{ to_station }}</td></tr>
            <tr><td>Date:</td><td>{{ journey_date }}</td></tr>
            <tr><td>Class:</td><td>{{ travel_class }}</td></tr>
        </table>

        <h3>Passenger Details</h3>
        <table class="passenger-table">
            <tr>
                <th>No.</th>
                <th>Booking Status</th>
                <th>Current Status</th>
            </tr>
            {% for passenger in passengers %}
            <tr>
                <td>{{ loop.index }}</td>
                <td>{{ passenger.booking_status }}</td>
                <td class="{{ 'confirmed' if 'CNF' in passenger.current_status else 'waiting' }}">
                    {{ passenger.current_status }}
                </td>
            </tr>
            {% endfor %}
        </table>

        {% if chart_prepared %}
            <p class="chart-status prepared">Chart Prepared</p>
        {% else %}
            <p class="chart-status not-prepared">Chart Not Prepared</p>
        {% endif %}
    </div>
{% endif %}
{% endblock %}"""

    # --- trains.html: List page with for loop and filters ---
    trains_html = """{% extends "base.html" %}

{% block title %}Available Trains{% endblock %}

{% block content %}
<h1>Available Trains ({{ trains | length }} found)</h1>

{% if trains %}
    <table class="train-table">
        <tr>
            <th>Train No.</th>
            <th>Name</th>
            <th>From</th>
            <th>To</th>
            <th>Departure</th>
            <th>Days</th>
        </tr>
        {% for train in trains %}
        <tr>
            <td>{{ train.number }}</td>
            <td>{{ train.name | upper }}</td>
            <td>{{ train.from_station }}</td>
            <td>{{ train.to_station }}</td>
            <td>{{ train.departure }}</td>
            <td>{{ train.days | join(", ") }}</td>
        </tr>
        {% endfor %}
    </table>
{% else %}
    <p>No trains found for this route.</p>
{% endif %}
{% endblock %}"""

    # --- about.html: Simple static content with include ---
    about_html = """{% extends "base.html" %}

{% block title %}About IRCTC{% endblock %}

{% block content %}
<h1>About Indian Railways</h1>
<p>Indian Railways is the fourth-largest railway network in the world,
   with {{ stats.total_stations | default("8,000+") }} stations and
   {{ stats.daily_trains | default("13,000+") }} daily trains.</p>

{% include "helpline.html" %}
{% endblock %}"""

    # --- helpline.html: Partial template for {% include %} ---
    helpline_html = """<div class="helpline-box">
    <h3>Helpline Numbers</h3>
    <ul>
        <li>General Enquiry: 139</li>
        <li>IRCTC Customer Care: 14646</li>
        <li>Railway Police: 182</li>
    </ul>
</div>"""

    # --- CSS file ---
    css_content = """body { font-family: Arial, sans-serif; margin: 0; padding: 0; background: #f5f5f5; }
.navbar { background: #003580; color: white; padding: 15px 30px; display: flex; gap: 20px; align-items: center; }
.navbar a { color: #cce5ff; text-decoration: none; }
.navbar .logo { font-weight: bold; font-size: 20px; margin-right: 30px; }
.container { max-width: 900px; margin: 30px auto; padding: 20px; background: white; border-radius: 5px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
.footer { text-align: center; padding: 20px; color: #666; margin-top: 40px; }
.error { background: #ffebee; color: #c62828; padding: 15px; border-radius: 5px; }
table { border-collapse: collapse; width: 100%; margin: 15px 0; }
th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
th { background: #003580; color: white; }
.confirmed { color: green; font-weight: bold; }
.waiting { color: #e65100; font-weight: bold; }
.chart-status { padding: 10px; border-radius: 5px; font-weight: bold; }
.prepared { background: #e8f5e9; color: #2e7d32; }
.not-prepared { background: #fff3e0; color: #e65100; }
.helpline-box { background: #e3f2fd; padding: 15px; border-radius: 5px; margin-top: 20px; }"""

    # --- JavaScript file ---
    js_content = """document.addEventListener('DOMContentLoaded', function() {
    console.log('IRCTC page loaded');
});"""

    # Write all files
    files_to_write = {
        os.path.join(TEMPLATE_DIR, "base.html"): base_html,
        os.path.join(TEMPLATE_DIR, "pnr_status.html"): pnr_html,
        os.path.join(TEMPLATE_DIR, "trains.html"): trains_html,
        os.path.join(TEMPLATE_DIR, "about.html"): about_html,
        os.path.join(TEMPLATE_DIR, "helpline.html"): helpline_html,
        os.path.join(STATIC_DIR, "css", "style.css"): css_content,
        os.path.join(STATIC_DIR, "js", "app.js"): js_content,
    }

    for file_path, content in files_to_write.items():
        with open(file_path, "w") as f:
            f.write(content)


# Run setup on import (creates template files)
setup_template_files()

# --- Initialize Jinja2Templates ---
templates = Jinja2Templates(directory=TEMPLATE_DIR)

# --- Mount static files ---
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")


# ════════════════════════════════════════════════════════════
# SECTION 3 — Template Rendering with TemplateResponse
# ════════════════════════════════════════════════════════════

# WHY: TemplateResponse combines a template file with context data
# to produce the final HTML. The Request object is ALWAYS required.

# --- Sample PNR data (simulating a database) ---
PNR_DATABASE: dict[str, dict] = {
    "2401234567": {
        "train_number": "12301",
        "train_name": "Howrah Rajdhani Express",
        "from_station": "New Delhi (NDLS)",
        "to_station": "Howrah (HWH)",
        "journey_date": "2025-03-15",
        "travel_class": "3A - AC 3 Tier",
        "chart_prepared": False,
        "passengers": [
            {"booking_status": "S5/32/L", "current_status": "CNF S5/32"},
            {"booking_status": "S5/33/M", "current_status": "CNF S5/33"},
        ],
    },
    "2409876543": {
        "train_number": "12951",
        "train_name": "Mumbai Rajdhani Express",
        "from_station": "New Delhi (NDLS)",
        "to_station": "Mumbai Central (BCT)",
        "journey_date": "2025-03-20",
        "travel_class": "2A - AC 2 Tier",
        "chart_prepared": True,
        "passengers": [
            {"booking_status": "B1/15/L", "current_status": "CNF B1/15"},
            {"booking_status": "WL/5", "current_status": "WL/3"},
        ],
    },
}


@app.get("/pnr", response_class=HTMLResponse)
def check_pnr_status(request: Request, pnr: str = ""):
    """
    PNR Status page — the core IRCTC feature.

    TemplateResponse requires:
    1. request: Request — ALWAYS needed (Jinja2 uses it for url_for etc.)
    2. Template filename
    3. Context dict — all variables the template will use
    """
    context = {
        "request": request,  # REQUIRED by Jinja2Templates
        "year": datetime.now().year,
        "pnr_number": pnr,
    }

    if not pnr or len(pnr) != 10 or not pnr.isdigit():
        context["error"] = "Please enter a valid 10-digit PNR number."
        return templates.TemplateResponse("pnr_status.html", context)

    pnr_data = PNR_DATABASE.get(pnr)
    if not pnr_data:
        context["error"] = f"PNR {pnr} not found. It may be expired or invalid."
        return templates.TemplateResponse("pnr_status.html", context)

    # Merge PNR data into context
    context.update(pnr_data)
    return templates.TemplateResponse("pnr_status.html", context)


# ════════════════════════════════════════════════════════════
# SECTION 4 — Template Variables, Control Flow, and Filters
# ════════════════════════════════════════════════════════════

# WHY: Templates are not just about inserting variables. Loops, conditionals,
# and filters let you build complex UIs without JavaScript frameworks.

# Sample train data
TRAINS = [
    {
        "number": "12301",
        "name": "Howrah Rajdhani Express",
        "from_station": "New Delhi",
        "to_station": "Howrah",
        "departure": "16:55",
        "days": ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    },
    {
        "number": "12951",
        "name": "Mumbai Rajdhani Express",
        "from_station": "New Delhi",
        "to_station": "Mumbai Central",
        "departure": "16:35",
        "days": ["Mon", "Wed", "Fri"],
    },
    {
        "number": "12259",
        "name": "Sealdah Duronto Express",
        "from_station": "New Delhi",
        "to_station": "Sealdah",
        "departure": "20:15",
        "days": ["Tue", "Sat"],
    },
    {
        "number": "12627",
        "name": "Karnataka Express",
        "from_station": "New Delhi",
        "to_station": "Bangalore",
        "departure": "21:30",
        "days": ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    },
]


@app.get("/trains", response_class=HTMLResponse)
def list_trains(request: Request):
    """
    Train listing page demonstrating Jinja2 features:
    - {{ variable }} — output a variable
    - {{ trains | length }} — apply the 'length' filter
    - {{ train.name | upper }} — uppercase filter
    - {{ train.days | join(", ") }} — join list with separator
    - {% for train in trains %} — loop
    - {% if trains %} — conditional
    - {{ loop.index }} — loop counter (1-based)
    """
    context = {
        "request": request,
        "year": datetime.now().year,
        "trains": TRAINS,
    }
    return templates.TemplateResponse("trains.html", context)


# ════════════════════════════════════════════════════════════
# SECTION 5 — Template Inheritance and Includes
# ════════════════════════════════════════════════════════════

# WHY: Without inheritance, you copy-paste the same <head>, navbar, and
# footer into every page. Template inheritance is the DRY principle for HTML.

# Template inheritance structure:
#
# base.html (parent)
#   |- {% block title %}     -> overridden by children
#   |- {% block head %}      -> for extra CSS/meta
#   |- {% block content %}   -> main page content
#   |- {% block scripts %}   -> for extra JS
#
# pnr_status.html (child)
#   |- {% extends "base.html" %}
#   |- {% block title %}PNR Status{% endblock %}
#   |- {% block content %}...PNR data...{% endblock %}
#
# {% include "helpline.html" %} — inserts a partial template inline.
# Use includes for reusable components: headers, footers, sidebars, cards.

@app.get("/about", response_class=HTMLResponse)
def about_page(request: Request):
    """About page using template inheritance + include."""
    context = {
        "request": request,
        "year": datetime.now().year,
        "stats": {
            "total_stations": "7,325",
            "daily_trains": "13,523",
        },
    }
    return templates.TemplateResponse("about.html", context)


# ════════════════════════════════════════════════════════════
# SECTION 6 — Custom Template Filters
# ════════════════════════════════════════════════════════════

# WHY: Built-in filters (upper, lower, length) cover basics, but
# Indian apps need custom filters for currency, dates, etc.

# --- Register custom filters ---
def format_inr(value: float) -> str:
    """Format a number as Indian Rupees with commas (Indian numbering)."""
    # Indian numbering: 1,00,000 (not 100,000)
    if value < 1000:
        return f"Rs. {value:,.2f}"
    # Split into last 3 digits and rest
    s = f"{value:.2f}"
    parts = s.split(".")
    integer_part = parts[0]
    decimal_part = parts[1]
    # Last 3 digits
    last_three = integer_part[-3:]
    remaining = integer_part[:-3]
    if remaining:
        # Add commas every 2 digits for the remaining part
        result = ""
        for i, digit in enumerate(reversed(remaining)):
            if i > 0 and i % 2 == 0:
                result = "," + result
            result = digit + result
        return f"Rs. {result},{last_three}.{decimal_part}"
    return f"Rs. {last_three}.{decimal_part}"


def format_indian_date(value: str) -> str:
    """Convert YYYY-MM-DD to DD Mon YYYY (Indian format)."""
    try:
        dt = datetime.strptime(value, "%Y-%m-%d")
        return dt.strftime("%d %b %Y")
    except (ValueError, TypeError):
        return str(value)


# Add custom filters to Jinja2 environment
templates.env.filters["inr"] = format_inr
templates.env.filters["indian_date"] = format_indian_date

# Now in templates you can use:
# {{ 1500000 | inr }}  ->  Rs. 15,00,000.00
# {{ "2025-03-15" | indian_date }}  ->  15 Mar 2025


# ════════════════════════════════════════════════════════════
# SECTION 7 — Other Response Types
# ════════════════════════════════════════════════════════════

# WHY: FastAPI is not just JSON and HTML. You may need to redirect
# users, stream large files, return plain text, or serve downloads.

# --- RedirectResponse: send user to another URL ---
@app.get("/old-pnr-page")
def redirect_old_pnr():
    """Redirect from old URL to new URL (301 permanent or 307 temporary)."""
    return RedirectResponse(url="/", status_code=301)


@app.get("/redirect-to-pnr/{pnr}")
def redirect_to_pnr(pnr: str):
    """Redirect with dynamic URL."""
    return RedirectResponse(url=f"/pnr?pnr={pnr}")


# --- PlainTextResponse: for health checks, robots.txt, etc. ---
@app.get("/health", response_class=PlainTextResponse)
def health_check():
    """Simple health check returning plain text."""
    return "OK"


@app.get("/robots.txt", response_class=PlainTextResponse)
def robots_txt():
    """Serve robots.txt as plain text."""
    return """User-agent: *
Disallow: /api/
Allow: /pnr
Allow: /trains
Sitemap: https://www.irctc.co.in/sitemap.xml"""


# --- StreamingResponse: for large data without loading all into memory ---
@app.get("/export/trains")
def export_trains_csv():
    """
    Stream train data as CSV. StreamingResponse sends data in chunks,
    ideal for large datasets that would consume too much memory.
    """
    def generate_csv():
        # Yield header row
        yield "Train No,Name,From,To,Departure,Days\n"
        # Yield data rows one at a time
        for train in TRAINS:
            days = "|".join(train["days"])
            row = f"{train['number']},{train['name']},{train['from_station']},{train['to_station']},{train['departure']},{days}\n"
            yield row

    return StreamingResponse(
        content=generate_csv(),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=trains.csv"},
    )


# --- StreamingResponse with bytes for binary data ---
@app.get("/export/trains-report")
def export_trains_text_report():
    """Generate a plain text report using StreamingResponse with BytesIO."""
    report_lines = []
    report_lines.append("=" * 60)
    report_lines.append("INDIAN RAILWAYS - TRAIN REPORT")
    report_lines.append(f"Generated: {datetime.now().strftime('%d %b %Y %H:%M')}")
    report_lines.append("=" * 60)
    report_lines.append("")
    for train in TRAINS:
        report_lines.append(f"Train: {train['number']} - {train['name']}")
        report_lines.append(f"  Route: {train['from_station']} -> {train['to_station']}")
        report_lines.append(f"  Departure: {train['departure']}")
        report_lines.append(f"  Days: {', '.join(train['days'])}")
        report_lines.append("")

    content = "\n".join(report_lines)
    buffer = io.BytesIO(content.encode("utf-8"))

    return StreamingResponse(
        content=buffer,
        media_type="text/plain",
        headers={"Content-Disposition": "attachment; filename=trains_report.txt"},
    )


# --- FileResponse: serve a specific file from disk ---
@app.get("/download/stylesheet")
def download_stylesheet():
    """Serve a file directly from disk."""
    css_path = os.path.join(STATIC_DIR, "css", "style.css")
    if not os.path.exists(css_path):
        raise HTTPException(status_code=404, detail="Stylesheet not found")
    return FileResponse(
        path=css_path,
        filename="irctc-style.css",
        media_type="text/css",
    )


# ════════════════════════════════════════════════════════════
# KEY TAKEAWAYS
# ════════════════════════════════════════════════════════════
# 1. HTMLResponse returns raw HTML strings — good for tiny pages.
#    Jinja2Templates is the proper solution for real applications.
# 2. TemplateResponse ALWAYS needs request: Request in the context.
#    This is how Jinja2 generates URLs and accesses request data.
# 3. Template inheritance ({% extends %}) eliminates HTML duplication.
#    Define blocks in base.html, override them in child templates.
# 4. {% include "partial.html" %} inserts reusable components —
#    navigation bars, footers, card widgets, helpline boxes.
# 5. Custom filters (templates.env.filters["inr"] = format_inr) let
#    you format currency, dates, and data the Indian way.
# 6. RedirectResponse (301/307) handles URL migrations gracefully.
#    StreamingResponse handles large exports without memory explosion.
# 7. StaticFiles mounts CSS/JS/images at a URL path. Templates
#    reference them via /static/css/style.css in <link> tags.
# 8. For production: templates go in templates/, static files in
#    static/, and you NEVER hardcode HTML in Python functions.
# "A page that loads in 2 seconds on a Jio network in rural Bihar
#  is worth more than a React SPA that needs 5 MB of JavaScript."
#  — IRCTC Performance Team Philosophy
