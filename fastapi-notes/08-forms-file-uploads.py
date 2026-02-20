"""
============================================================
FILE 08: FORM DATA, FILE UPLOADS, AND MULTIPART REQUESTS
============================================================
Topics: Form(), File(), UploadFile, multipart/form-data,
        file validation, saving files, StaticFiles, combining
        form fields with file uploads

WHY THIS MATTERS:
Not every API accepts JSON. Job portals need resume PDFs,
e-commerce needs product images, and government portals need
document scans. Understanding form data and file uploads is
essential for building real-world applications.
============================================================
"""

# STORY: Naukri.com — Resume PDF + Profile Photo + Form Fields
# Naukri.com is India's largest job portal with 80+ million registered
# users. When a job seeker updates their profile, they fill out form
# fields (name, experience, skills), upload a resume PDF (max 5 MB),
# and optionally add a profile photo (JPEG/PNG, max 2 MB). This is
# a classic multipart request — form data AND files in the same HTTP
# call. Naukri processes millions of resume uploads per day, each one
# needing validation for file type, size, and virus scanning before
# storage. Requires: pip install python-multipart

from fastapi import (
    FastAPI,
    Form,
    File,
    UploadFile,
    HTTPException,
    Request,
)
from fastapi.responses import HTMLResponse, JSONResponse
from pydantic import BaseModel
from typing import Optional
import os
import shutil
import uuid
from datetime import datetime, timezone

app = FastAPI(title="Naukri-Style File Uploads")

# --- Configuration ---
UPLOAD_DIR = "/tmp/naukri_uploads"
MAX_RESUME_SIZE = 5 * 1024 * 1024     # 5 MB
MAX_PHOTO_SIZE = 2 * 1024 * 1024      # 2 MB
ALLOWED_RESUME_TYPES = {
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
}
ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp"}
ALLOWED_RESUME_EXTENSIONS = {".pdf", ".doc", ".docx"}
ALLOWED_IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}

# Ensure upload directory exists
os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(os.path.join(UPLOAD_DIR, "resumes"), exist_ok=True)
os.makedirs(os.path.join(UPLOAD_DIR, "photos"), exist_ok=True)


# ════════════════════════════════════════════════════════════
# SECTION 1 — Form() for Form Data (vs JSON Body)
# ════════════════════════════════════════════════════════════

# WHY: HTML forms submit data as application/x-www-form-urlencoded,
# NOT as JSON. FastAPI's Form() handles this content type.
# You MUST install python-multipart: pip install python-multipart

# --- Basic form fields ---
@app.post("/login")
def login(
    # Form() tells FastAPI to expect form-encoded data, not JSON
    username: str = Form(min_length=3, max_length=50),
    password: str = Form(min_length=8, max_length=100),
):
    """
    Accepts: Content-Type: application/x-www-form-urlencoded
    Body: username=rahul&password=secret1234

    NOTE: This is NOT JSON. Form data uses key=value&key=value format.
    HTML <form> tags send data this way by default.
    """
    # Never return passwords in real apps!
    return {"username": username, "message": "Login processing..."}


# --- Multiple form fields ---
@app.post("/feedback")
def submit_feedback(
    name: str = Form(min_length=2, max_length=100),
    email: str = Form(pattern=r"^[\w.+-]+@[\w-]+\.[\w.]+$"),
    rating: int = Form(ge=1, le=5),
    message: str = Form(max_length=2000),
    # Optional form field
    company: Optional[str] = Form(default=None, max_length=100),
):
    """Multiple form fields with validation — same as Query() params."""
    return {
        "name": name,
        "email": email,
        "rating": rating,
        "message_length": len(message),
        "company": company,
    }


# ════════════════════════════════════════════════════════════
# SECTION 2 — Form Data with Pydantic Models (Workaround)
# ════════════════════════════════════════════════════════════

# WHY: FastAPI does NOT natively support Pydantic models for form data
# (unlike JSON bodies). Here is a clean workaround using a classmethod.

class JobApplication(BaseModel):
    """Pydantic model for form data — used for validation and docs."""
    full_name: str
    email: str
    phone: str
    experience_years: int
    current_company: Optional[str] = None
    expected_ctc: Optional[float] = None

    @classmethod
    def as_form(
        cls,
        full_name: str = Form(min_length=2, max_length=100),
        email: str = Form(pattern=r"^[\w.+-]+@[\w-]+\.[\w.]+$"),
        phone: str = Form(pattern=r"^[6-9]\d{9}$"),
        experience_years: int = Form(ge=0, le=50),
        current_company: Optional[str] = Form(default=None, max_length=100),
        expected_ctc: Optional[float] = Form(default=None, gt=0),
    ):
        """Factory classmethod that accepts Form() params and returns model."""
        return cls(
            full_name=full_name,
            email=email,
            phone=phone,
            experience_years=experience_years,
            current_company=current_company,
            expected_ctc=expected_ctc,
        )


@app.post("/apply")
def apply_for_job(application: JobApplication = Form()):
    """
    NOTE: As of FastAPI 0.113+, you can use Pydantic models directly
    with Form(). For older versions use the as_form classmethod pattern:
        application: JobApplication = Depends(JobApplication.as_form)
    """
    return {"received": application.model_dump()}


# ════════════════════════════════════════════════════════════
# SECTION 3 — File vs UploadFile: Understanding the Difference
# ════════════════════════════════════════════════════════════

# WHY: FastAPI offers two ways to handle uploads. Understanding when
# to use each saves you from memory issues with large files.

# --- bytes (File) — reads entire file into memory ---
@app.post("/upload/small")
def upload_small_file(
    # File() reads the ENTIRE file content into a bytes variable
    # Good for small files (< 1 MB) — profile photos, icons
    file_content: bytes = File(description="Small file as bytes"),
):
    """
    File(bytes) loads the entire file into memory.
    Fine for small files, dangerous for large ones.
    """
    return {
        "size_bytes": len(file_content),
        "first_20_bytes": file_content[:20].hex(),
    }


# --- UploadFile — memory-efficient, async-capable ---
@app.post("/upload/efficient")
async def upload_efficient(
    # UploadFile keeps the file on disk (SpooledTemporaryFile)
    # Only loads chunks into memory as you read them
    file: UploadFile,
):
    """
    UploadFile attributes:
    - file.filename  -> original filename (e.g., "resume.pdf")
    - file.content_type -> MIME type (e.g., "application/pdf")
    - file.size -> file size in bytes (may be None for streaming)
    - file.file -> the actual SpooledTemporaryFile object
    - file.read() -> read content (async)
    - file.seek(0) -> reset read position
    - file.close() -> close the file
    """
    content = await file.read()
    await file.seek(0)  # reset for potential re-read

    return {
        "filename": file.filename,
        "content_type": file.content_type,
        "size_bytes": len(content),
    }


# ════════════════════════════════════════════════════════════
# SECTION 4 — Single File Upload with Validation
# ════════════════════════════════════════════════════════════

# WHY: Accepting any file without validation is a security risk.
# Always validate file type, extension, and size before processing.

def get_file_extension(filename: str) -> str:
    """Extract lowercase file extension from filename."""
    if not filename:
        return ""
    _, ext = os.path.splitext(filename)
    return ext.lower()


def generate_unique_filename(original_filename: str) -> str:
    """Generate a unique filename preserving the original extension."""
    ext = get_file_extension(original_filename)
    unique_name = f"{uuid.uuid4().hex}{ext}"
    return unique_name


@app.post("/upload/resume")
async def upload_resume(
    resume: UploadFile = File(description="Resume file (PDF/DOC/DOCX, max 5MB)"),
):
    """
    Upload a resume with full validation:
    1. Check file extension
    2. Check MIME content type
    3. Check file size
    4. Save to disk with unique name
    """
    # Step 1: Validate extension
    ext = get_file_extension(resume.filename or "")
    if ext not in ALLOWED_RESUME_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file extension '{ext}'. Allowed: {ALLOWED_RESUME_EXTENSIONS}",
        )

    # Step 2: Validate content type
    if resume.content_type not in ALLOWED_RESUME_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid content type '{resume.content_type}'. Must be PDF or DOC.",
        )

    # Step 3: Read and validate size
    content = await resume.read()
    if len(content) > MAX_RESUME_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"File too large ({len(content)} bytes). Max: {MAX_RESUME_SIZE} bytes (5 MB).",
        )

    # Step 4: Save to disk with unique filename
    unique_name = generate_unique_filename(resume.filename or "resume.pdf")
    save_path = os.path.join(UPLOAD_DIR, "resumes", unique_name)

    with open(save_path, "wb") as f:
        f.write(content)

    return {
        "message": "Resume uploaded successfully",
        "original_name": resume.filename,
        "saved_as": unique_name,
        "size_bytes": len(content),
        "path": save_path,
    }


# ════════════════════════════════════════════════════════════
# SECTION 5 — Multiple File Uploads
# ════════════════════════════════════════════════════════════

# WHY: Portfolio uploads, bulk document submission, product image
# galleries — many real features need multiple file uploads at once.

@app.post("/upload/documents")
async def upload_multiple_documents(
    # List[UploadFile] accepts multiple files under the same form field
    files: list[UploadFile] = File(description="Multiple documents"),
):
    """
    Upload multiple files at once.
    curl -X POST -F "files=@doc1.pdf" -F "files=@doc2.pdf" URL
    """
    if len(files) > 10:
        raise HTTPException(
            status_code=400,
            detail="Maximum 10 files per upload",
        )

    results = []
    total_size = 0

    for file in files:
        content = await file.read()
        file_size = len(content)
        total_size += file_size

        # Check individual file size (5 MB each)
        if file_size > MAX_RESUME_SIZE:
            raise HTTPException(
                status_code=400,
                detail=f"File '{file.filename}' exceeds 5 MB limit",
            )

        # Save each file
        unique_name = generate_unique_filename(file.filename or "document")
        save_path = os.path.join(UPLOAD_DIR, "resumes", unique_name)
        with open(save_path, "wb") as f:
            f.write(content)

        results.append({
            "original_name": file.filename,
            "saved_as": unique_name,
            "size_bytes": file_size,
            "content_type": file.content_type,
        })

    return {
        "message": f"Uploaded {len(results)} files",
        "total_size_bytes": total_size,
        "files": results,
    }


# ════════════════════════════════════════════════════════════
# SECTION 6 — Combining Form Data + File Uploads (Multipart)
# ════════════════════════════════════════════════════════════

# WHY: This is the Naukri.com use case — form fields (name, experience)
# AND files (resume, photo) in a SINGLE request. This requires
# multipart/form-data encoding.

@app.post("/profile/complete")
async def complete_profile(
    # --- Form fields ---
    full_name: str = Form(min_length=2, max_length=100),
    email: str = Form(pattern=r"^[\w.+-]+@[\w-]+\.[\w.]+$"),
    phone: str = Form(pattern=r"^[6-9]\d{9}$"),
    experience_years: int = Form(ge=0, le=50),
    skills: str = Form(
        min_length=2, max_length=500,
        description="Comma-separated skills",
    ),
    current_ctc: Optional[float] = Form(default=None, gt=0),
    # --- File uploads ---
    resume: UploadFile = File(description="Resume PDF (max 5 MB)"),
    photo: Optional[UploadFile] = File(default=None, description="Profile photo (max 2 MB)"),
):
    """
    Naukri.com-style profile update: form fields + files together.

    IMPORTANT: When mixing Form() and File() in the same endpoint,
    the request MUST be multipart/form-data. You CANNOT use JSON body
    with file uploads — this is an HTTP protocol limitation.

    curl example:
    curl -X POST http://localhost:8000/profile/complete \
      -F "full_name=Priya Sharma" \
      -F "email=priya@email.com" \
      -F "phone=9876543210" \
      -F "experience_years=5" \
      -F "skills=Python,FastAPI,MongoDB" \
      -F "resume=@resume.pdf" \
      -F "photo=@photo.jpg"
    """
    result = {
        "full_name": full_name,
        "email": email,
        "phone": phone,
        "experience_years": experience_years,
        "skills": [s.strip() for s in skills.split(",")],
        "current_ctc": current_ctc,
    }

    # --- Validate and save resume ---
    ext = get_file_extension(resume.filename or "")
    if ext not in ALLOWED_RESUME_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"Resume must be PDF/DOC/DOCX, got '{ext}'")

    resume_content = await resume.read()
    if len(resume_content) > MAX_RESUME_SIZE:
        raise HTTPException(status_code=400, detail="Resume exceeds 5 MB limit")

    resume_name = generate_unique_filename(resume.filename or "resume.pdf")
    resume_path = os.path.join(UPLOAD_DIR, "resumes", resume_name)
    with open(resume_path, "wb") as f:
        f.write(resume_content)
    result["resume_file"] = resume_name

    # --- Validate and save photo (optional) ---
    if photo and photo.filename:
        photo_ext = get_file_extension(photo.filename)
        if photo_ext not in ALLOWED_IMAGE_EXTENSIONS:
            raise HTTPException(status_code=400, detail=f"Photo must be JPG/PNG/WebP, got '{photo_ext}'")

        photo_content = await photo.read()
        if len(photo_content) > MAX_PHOTO_SIZE:
            raise HTTPException(status_code=400, detail="Photo exceeds 2 MB limit")

        photo_name = generate_unique_filename(photo.filename)
        photo_path = os.path.join(UPLOAD_DIR, "photos", photo_name)
        with open(photo_path, "wb") as f:
            f.write(photo_content)
        result["photo_file"] = photo_name
    else:
        result["photo_file"] = None

    return {"message": "Profile updated successfully", "profile": result}


# ════════════════════════════════════════════════════════════
# SECTION 7 — Serving Uploaded Files with StaticFiles
# ════════════════════════════════════════════════════════════

# WHY: After uploading files, users need to download/view them.
# StaticFiles mounts a directory as a static file server.

from fastapi.staticfiles import StaticFiles

# Mount the uploads directory so files are accessible via URL
# After this, a file at /tmp/naukri_uploads/photos/abc.jpg
# is accessible at http://localhost:8000/uploads/photos/abc.jpg
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

# --- Manual file download endpoint with custom headers ---
from fastapi.responses import FileResponse

@app.get("/download/resume/{filename}")
def download_resume(filename: str):
    """
    Download a resume file with proper Content-Disposition header.
    FileResponse sets the right headers for browser download.
    """
    # Security: prevent directory traversal attacks
    safe_filename = os.path.basename(filename)
    file_path = os.path.join(UPLOAD_DIR, "resumes", safe_filename)

    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found")

    return FileResponse(
        path=file_path,
        filename=safe_filename,  # This sets Content-Disposition
        media_type="application/octet-stream",
    )


# --- Listing uploaded files ---
@app.get("/files/list")
def list_uploaded_files():
    """List all uploaded files organized by type."""
    resume_dir = os.path.join(UPLOAD_DIR, "resumes")
    photo_dir = os.path.join(UPLOAD_DIR, "photos")

    resumes = os.listdir(resume_dir) if os.path.exists(resume_dir) else []
    photos = os.listdir(photo_dir) if os.path.exists(photo_dir) else []

    return {
        "resumes": {
            "count": len(resumes),
            "files": resumes[:50],  # limit for safety
        },
        "photos": {
            "count": len(photos),
            "files": photos[:50],
        },
    }


# --- Cleanup endpoint (for development/testing) ---
@app.delete("/files/cleanup")
def cleanup_uploads():
    """Remove all uploaded files. USE ONLY IN DEVELOPMENT."""
    removed = 0
    for subdir in ["resumes", "photos"]:
        dir_path = os.path.join(UPLOAD_DIR, subdir)
        if os.path.exists(dir_path):
            for filename in os.listdir(dir_path):
                file_path = os.path.join(dir_path, filename)
                if os.path.isfile(file_path):
                    os.remove(file_path)
                    removed += 1

    return {"message": f"Removed {removed} files"}


# ════════════════════════════════════════════════════════════
# SECTION 8 — Upload Form HTML (Simple Frontend)
# ════════════════════════════════════════════════════════════

# WHY: To test file uploads without curl, here is a minimal HTML form
# that sends multipart/form-data to our endpoint.

@app.get("/upload-form", response_class=HTMLResponse)
def get_upload_form():
    """Serve a simple HTML form for testing file uploads."""
    return """
    <!DOCTYPE html>
    <html>
    <head><title>Naukri Profile Upload</title></head>
    <body>
        <h1>Complete Your Profile</h1>
        <form action="/profile/complete" method="post" enctype="multipart/form-data">
            <p>Name: <input name="full_name" required minlength="2"></p>
            <p>Email: <input name="email" type="email" required></p>
            <p>Phone: <input name="phone" required pattern="[6-9][0-9]{9}"></p>
            <p>Experience (years): <input name="experience_years" type="number" min="0" max="50" required></p>
            <p>Skills (comma-separated): <input name="skills" required></p>
            <p>Current CTC (optional): <input name="current_ctc" type="number" step="0.01"></p>
            <p>Resume (PDF): <input name="resume" type="file" accept=".pdf,.doc,.docx" required></p>
            <p>Photo (optional): <input name="photo" type="file" accept=".jpg,.jpeg,.png,.webp"></p>
            <p><button type="submit">Submit Profile</button></p>
        </form>
    </body>
    </html>
    """


# ════════════════════════════════════════════════════════════
# KEY TAKEAWAYS
# ════════════════════════════════════════════════════════════
# 1. Form() handles application/x-www-form-urlencoded data (HTML forms).
#    File()/UploadFile handles multipart/form-data (file uploads).
# 2. bytes = File() loads entire file into memory — use only for small
#    files. UploadFile uses disk-backed temp files — safe for large files.
# 3. Always validate uploads: check extension, content_type, and size
#    BEFORE saving. Never trust the client-reported content type alone.
# 4. Generate unique filenames (UUID) — never save with original names
#    to prevent conflicts and directory traversal attacks.
# 5. When mixing Form() + File() in one endpoint, the request MUST be
#    multipart/form-data. You cannot use JSON body with file uploads.
# 6. StaticFiles mounts a directory for serving uploaded content.
#    FileResponse gives you control over download headers.
# 7. python-multipart is REQUIRED for both Form() and File() to work.
#    Install it: pip install python-multipart
# 8. Security checklist: validate extension + MIME type, enforce size
#    limits, sanitize filenames, prevent path traversal, and consider
#    virus scanning for production systems.
# "Every resume upload on Naukri is someone's career on the line.
#  Handle their files with care." — Naukri Engineering Philosophy
