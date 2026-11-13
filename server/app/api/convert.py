import os
import uuid
import zipfile
import aiofiles
from pathlib import Path
from typing import List
from fastapi import APIRouter, UploadFile, File, HTTPException, BackgroundTasks, status
from fastapi.responses import FileResponse
from app.config import settings
from app.services.converter import (
    convert_word_to_pdf, 
    find_libreoffice_binary, 
    has_ms_office,
    ALL_SUPPORTED_EXTENSIONS
)
from app.services.cleaner import cleanup_old_files

router = APIRouter(prefix="/api", tags=["Converter"])

def validate_office_file(file: UploadFile):
    ext = Path(file.filename or "").suffix.lower()
    if ext not in ALL_SUPPORTED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported format '{ext}'. Supported: Word (.docx, .doc), Excel (.xlsx, .xls, .csv), PowerPoint (.pptx, .ppt)",
        )

@router.get("/status")
def get_service_status():
    """Checks service health and reports active conversion engine."""
    lo_bin = find_libreoffice_binary()
    office_available = has_ms_office()
    
    if lo_bin:
        engine = "LibreOffice Headless (Docker)"
    elif office_available:
        engine = "Microsoft Office (Windows Native)"
    else:
        engine = "None (Ready for Docker / Render)"

    return {
        "status": "online",
        "engine": engine,
        "engine_installed": lo_bin is not None or office_available,
        "libreoffice_path": lo_bin,
        "ms_office_available": office_available,
        "supported_formats": sorted(list(ALL_SUPPORTED_EXTENSIONS))
    }

@router.post("/convert/single")
async def convert_single(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...)
):
    """Converts a single Office document to PDF and streams the PDF directly."""
    validate_office_file(file)
    background_tasks.add_task(cleanup_old_files)

    job_id = str(uuid.uuid4())
    job_dir = Path(settings.STORAGE_DIR) / job_id
    input_dir = job_dir / "input"
    output_dir = job_dir / "output"
    input_dir.mkdir(parents=True, exist_ok=True)
    output_dir.mkdir(parents=True, exist_ok=True)

    input_filename = file.filename or f"document{Path(file.filename or 'file.docx').suffix}"
    input_path = input_dir / input_filename

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
    Converts multiple Office files (Word, Excel, PPT) with isolated execution per file.
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

        if ext not in ALL_SUPPORTED_EXTENSIONS:
            results.append({
                "original_name": original_name,
                "status": "failed",
                "error": f"Invalid format '{ext}'. Supported: Word, Excel, PowerPoint.",
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
                    "error": f"File exceeds maximum allowed size of {settings.MAX_FILE_SIZE_MB}MB.",
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
