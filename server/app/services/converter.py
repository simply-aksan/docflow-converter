import os
import sys
import uuid
import shutil
import subprocess
import logging
import tempfile
from pathlib import Path
from typing import List, Dict

logger = logging.getLogger(__name__)

def find_libreoffice_binary() -> str | None:
    """Finds the LibreOffice executable in the system if present."""
    for cmd in ["libreoffice", "soffice"]:
        path = shutil.which(cmd)
        if path:
            return path

    windows_paths = [
        r"C:\Program Files\LibreOffice\program\soffice.exe",
        r"C:\Program Files (x86)\LibreOffice\program\soffice.exe",
    ]
    for win_path in windows_paths:
        if os.path.exists(win_path):
            return win_path

    return None

def has_ms_word() -> bool:
    """Checks if Microsoft Word COM is available on Windows."""
    if sys.platform != "win32":
        return False
    try:
        import pythoncom
        import win32com.client
        pythoncom.CoInitialize()
        try:
            word = win32com.client.DispatchEx("Word.Application")
            word.Quit()
            return True
        finally:
            pythoncom.CoUninitialize()
    except Exception:
        return False

def convert_single_with_libreoffice(
    input_file: Path, 
    out_dir: Path, 
    soffice_bin: str, 
    timeout_seconds: int = 180
) -> str:
    """
    Converts a single Word document to PDF using LibreOffice headless.
    Uses an isolated user profile per file to guarantee zero lock collision and independent timeout.
    """
    unique_id = uuid.uuid4().hex[:8]
    temp_profile_dir = Path(tempfile.gettempdir()) / f"lo_prof_{unique_id}"
    temp_profile_dir.mkdir(parents=True, exist_ok=True)
    profile_uri = temp_profile_dir.as_uri()

    try:
        cmd = [
            soffice_bin,
            f"-env:UserInstallation={profile_uri}",
            "--headless",
            "--nologo",
            "--nodefault",
            "--norestore",
            "--nolockcheck",
            "--nofirststartwizard",
            "--convert-to",
            "pdf",
            str(input_file.resolve()),
            "--outdir",
            str(out_dir.resolve()),
        ]

        logger.info(f"Converting {input_file.name} ({input_file.stat().st_size / 1024 / 1024:.1f} MB) with timeout {timeout_seconds}s")
        
        try:
            result = subprocess.run(
                cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                timeout=timeout_seconds,
            )
        except subprocess.TimeoutExpired:
            size_mb = input_file.stat().st_size / (1024 * 1024)
            raise TimeoutError(
                f"Document ({size_mb:.1f} MB) took too long to convert on the server (exceeded {timeout_seconds}s limit)."
            )

        if result.returncode != 0:
            logger.error(f"LibreOffice failed for {input_file.name}. Stderr: {result.stderr}")
            raise RuntimeError(f"Conversion engine error: {result.stderr or 'Unknown error'}")

        expected_pdf = out_dir / f"{input_file.stem}.pdf"
        if not expected_pdf.exists():
            candidates = list(out_dir.glob(f"*{input_file.stem}*.pdf"))
            if candidates:
                expected_pdf = candidates[0]
            else:
                raise RuntimeError(f"PDF output was not generated for {input_file.name}.")

        return str(expected_pdf.resolve())

    finally:
        shutil.rmtree(temp_profile_dir, ignore_errors=True)

def convert_single_with_ms_word(input_file: Path, expected_pdf: Path):
    """Windows native Word automation fallback."""
    import pythoncom
    import win32com.client

    pythoncom.CoInitialize()
    word = None
    doc = None
    try:
        word = win32com.client.DispatchEx("Word.Application")
        word.Visible = False
        word.DisplayAlerts = False

        doc = word.Documents.Open(str(input_file.resolve()), ReadOnly=True)
        # wdFormatPDF = 17
        doc.SaveAs(str(expected_pdf.resolve()), FileFormat=17)
    finally:
        if doc is not None:
            try:
                doc.Close(SaveChanges=False)
            except Exception:
                pass
        if word is not None:
            try:
                word.Quit()
            except Exception:
                pass
        pythoncom.CoUninitialize()

def convert_word_to_pdf(input_path: str, output_dir: str) -> str:
    """Converts a single file to PDF."""
    input_file = Path(input_path)
    out_dir = Path(output_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    # Adaptive timeout based on file size: base 90s + 15s per MB (up to 300s max)
    file_size_mb = input_file.stat().st_size / (1024 * 1024)
    timeout = min(300, max(90, int(90 + (file_size_mb * 15))))

    soffice_bin = find_libreoffice_binary()
    if soffice_bin:
        return convert_single_with_libreoffice(input_file, out_dir, soffice_bin, timeout_seconds=timeout)

    if sys.platform == "win32":
        expected_pdf = out_dir / f"{input_file.stem}.pdf"
        convert_single_with_ms_word(input_file, expected_pdf)
        if expected_pdf.exists():
            return str(expected_pdf.resolve())

    raise RuntimeError("No conversion engine available.")
