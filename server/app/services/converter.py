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

WORD_EXTENSIONS = {".docx", ".doc", ".rtf", ".odt", ".txt"}
EXCEL_EXTENSIONS = {".xlsx", ".xls", ".csv", ".ods"}
PPT_EXTENSIONS = {".pptx", ".ppt", ".odp"}
ALL_SUPPORTED_EXTENSIONS = WORD_EXTENSIONS | EXCEL_EXTENSIONS | PPT_EXTENSIONS

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

def has_ms_office() -> bool:
    """Checks if Microsoft Office COM is available on Windows."""
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
    Converts any Office document (Word, Excel, PowerPoint) to PDF using LibreOffice headless.
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

        logger.info(f"Converting {input_file.name} via LibreOffice (timeout: {timeout_seconds}s)")
        
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

def convert_with_ms_office_windows(input_file: Path, expected_pdf: Path):
    """Native Microsoft Office conversion on Windows for Word, Excel, and PowerPoint."""
    import pythoncom
    import win32com.client

    ext = input_file.suffix.lower()
    abs_input = str(input_file.resolve())
    abs_output = str(expected_pdf.resolve())

    pythoncom.CoInitialize()
    app = None
    doc = None

    try:
        if ext in WORD_EXTENSIONS:
            app = win32com.client.DispatchEx("Word.Application")
            app.Visible = False
            app.DisplayAlerts = False
            doc = app.Documents.Open(abs_input, ReadOnly=True)
            # wdFormatPDF = 17
            doc.SaveAs(abs_output, FileFormat=17)

        elif ext in EXCEL_EXTENSIONS:
            app = win32com.client.DispatchEx("Excel.Application")
            app.Visible = False
            app.DisplayAlerts = False
            doc = app.Workbooks.Open(abs_input, ReadOnly=True)
            # xlTypePDF = 0
            doc.ExportAsFixedFormat(0, abs_output)

        elif ext in PPT_EXTENSIONS:
            app = win32com.client.DispatchEx("PowerPoint.Application")
            # PowerPoint Requires WithWindow=False for headless
            doc = app.Presentations.Open(abs_input, ReadOnly=True, Untitled=False, WithWindow=False)
            # ppSaveAsPDF = 32
            doc.SaveAs(abs_output, 32)

        else:
            raise ValueError(f"Unsupported format for MS Office conversion: {ext}")

    finally:
        if doc is not None:
            try:
                doc.Close()
            except Exception:
                pass
        if app is not None:
            try:
                app.Quit()
            except Exception:
                pass
        pythoncom.CoUninitialize()

def convert_word_to_pdf(input_path: str, output_dir: str) -> str:
    """
    Universal Office Document to PDF converter (Word, Excel, PowerPoint).
    """
    input_file = Path(input_path)
    out_dir = Path(output_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    file_size_mb = input_file.stat().st_size / (1024 * 1024)
    timeout = min(300, max(90, int(90 + (file_size_mb * 15))))

    soffice_bin = find_libreoffice_binary()
    if soffice_bin:
        return convert_single_with_libreoffice(input_file, out_dir, soffice_bin, timeout_seconds=timeout)

    if sys.platform == "win32":
        expected_pdf = out_dir / f"{input_file.stem}.pdf"
        convert_with_ms_office_windows(input_file, expected_pdf)
        if expected_pdf.exists():
            return str(expected_pdf.resolve())

    raise RuntimeError("No conversion engine available.")
