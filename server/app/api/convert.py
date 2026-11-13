import os
import uuid
import zipfile
import aiofiles
from pathlib import Path
from typing import List
from fastapi import APIRouter, UploadFile, File, HTTPException, BackgroundTasks, status
from fastapi.responses import FileResponse, StreamingResponse
from app.config import settings
from app.services.converter import convert_word_to_pdf, find_libreoffice_binary, has_ms_word

router = APIRouter(prefix="/api", tags=["Converter"])

ALLOWED_EXTENSIONS = {".docx", ".doc"}

def validate_word_file(file: UploadFile):
    ext = Path(file.filename or "").suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file format '{ext}'. Allowed: .docx, .doc",
        )

@router.get("/status")
def get_service_status():
    """Checks service health and reports active conversion engine."""
    lo_bin = find_libreoffice_binary()
    word_available = has_ms_word()
    
    if lo_bin:
        engine = "LibreOffice Headless"
    elif word_available:
        engine = "Microsoft Word (Windows Native)"
    else:
        engine = "None (Ready for Docker / Render)"

    return {
        "status": "online",
        "engine": engine,
        "engine_installed": lo_bin is not None or word_available,
        "libreoffice_path": lo_bin,
        "ms_word_available": word_available
    }

@router.post("/convert/single")
async def convert_single(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...)
):
    """
    Converts a single Word document to PDF and streams the PDF directly.
    """
    validate_word_file(file)
    background_tasks.add_task(cleanup_old_files)

    job_id = str(uuid.uuid4())
    job_dir = Path(settings.STORAGE_DIR) / job_id
    input_dir = job_dir / "input"
    output_dir = job_dir / "output"
    input_dir.mkdir(parents=True, exist_ok=True)
    output_dir.mkdir(parents=True, exist_ok=True)

    input_filename = file.filename or f"document{Path(file.filename or 'file.docx').suffix}"
    input_path = input_dir / input_filename

    # Save uploaded file
    async with aiofiles.open(input_path, "wb") as out_file:
        content = await file.read()
        if len(content) > settings.MAX_FILE_SIZE_MB * 1024 * 1024:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=f"File exceeds maximum allowed size of {settings.MAX_FILE_SIZE_MB}MB",
            )
        await out_file.write(content)

    try:
        pdf_path = convert_word_to_pdf(str(input_path), str(output_dir))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Conversion failed: {str(e)}"
        )

    out_name = f"{Path(input_filename).stem}.pdf"
    return FileResponse(
        pdf_path,
        media_type="application/pdf",
        filename=out_name,
        headers={"Content-Disposition": f'attachment; filename="{out_name}"'}
    )

@router.post("/convert/batch")
async def convert_batch(
    background_tasks: BackgroundTasks,
    files: List[UploadFile] = File(...)
):
    """
    Converts multiple Word files in batch.
    Returns status for each file along with download URLs.
    """
    if not files:
        raise HTTPException(status_code=400, detail="No files uploaded.")

    background_tasks.add_task(cleanup_old_files)
    job_id = str(uuid.uuid4())
    job_dir = Path(settings.STORAGE_DIR) / job_id
    input_dir = job_dir / "input"
    output_dir = job_dir / "output"
    input_dir.mkdir(parents=True, exist_ok=True)
    output_dir.mkdir(parents=True, exist_ok=True)

    results = []

    for file in files:
        original_name = file.filename or "document.docx"
        ext = Path(original_name).suffix.lower()

        if ext not in ALLOWED_EXTENSIONS:
            results.append({
                "original_name": original_name,
                "status": "failed",
                "error": f"Invalid extension '{ext}'. Only .doc and .docx allowed.",
                "download_url": None
            })
            continue

        file_input_path = input_dir / original_name
        async with aiofiles.open(file_input_path, "wb") as f_out:
            content = await file.read()
            if len(content) > settings.MAX_FILE_SIZE_MB * 1024 * 1024:
                results.append({
                    "original_name": original_name,
                    "status": "failed",
                    "error": f"File exceeds {settings.MAX_FILE_SIZE_MB}MB limit.",
                    "download_url": None
                })
                continue
            await f_out.write(content)

        try:
            pdf_path = convert_word_to_pdf(str(file_input_path), str(output_dir))
            pdf_filename = Path(pdf_path).name
            results.append({
                "original_name": original_name,
                "converted_name": pdf_filename,
                "status": "success",
                "download_url": f"/api/download/{job_id}/{pdf_filename}"
            })
        except Exception as e:
            results.append({
                "original_name": original_name,
                "status": "failed",
                "error": str(e),
                "download_url": None
            })

    # Check if at least one succeeded to generate zip download link
    has_success = any(r["status"] == "success" for r in results)
    zip_url = f"/api/download-zip/{job_id}" if has_success else None

    return {
        "job_id": job_id,
        "total_files": len(files),
        "results": results,
        "zip_download_url": zip_url
    }

@router.get("/download/{job_id}/{filename}")
async def download_file(job_id: str, filename: str):
    """Downloads a single converted PDF from a job directory."""
    file_path = Path(settings.STORAGE_DIR) / job_id / "output" / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found or expired.")

    return FileResponse(
        str(file_path),
        media_type="application/pdf",
        filename=filename,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )

@router.get("/download-zip/{job_id}")
async def download_batch_zip(job_id: str):
    """Packages all converted PDFs in a job into a ZIP archive and streams it."""
    output_dir = Path(settings.STORAGE_DIR) / job_id / "output"
    if not output_dir.exists():
        raise HTTPException(status_code=404, detail="Job directory not found or expired.")

    pdf_files = list(output_dir.glob("*.pdf"))
    if not pdf_files:
        raise HTTPException(status_code=404, detail="No converted PDFs found for this job.")

    zip_path = Path(settings.STORAGE_DIR) / job_id / "converted_documents.zip"
    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zipf:
        for pdf in pdf_files:
            zipf.write(pdf, arcname=pdf.name)

    return FileResponse(
        str(zip_path),
        media_type="application/zip",
        filename="converted_documents.zip",
        headers={"Content-Disposition": 'attachment; filename="converted_documents.zip"'}
    )
