import os
import sys
import uuid
import shutil
import queue
import threading
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

# Thread-safe slot pool for warm LibreOffice profiles
class ProfilePool:
    def __init__(self, size: int = 2):
        self.size = size
        self.pool: queue.Queue = queue.Queue()
        for i in range(size):
            self.pool.put(i)
        self._init_slots()

    def _init_slots(self):
        """Pre-seeds slot directories from pre-warmed template if available."""
        template_dir = Path("/tmp/lo_profile_template")
        for i in range(self.size):
            slot_dir = Path(tempfile.gettempdir()) / f"lo_slot_{i}"
            if not slot_dir.exists():
                if template_dir.exists():
                    try:
                        shutil.copytree(template_dir, slot_dir)
                    except Exception as e:
                        logger.warning(f"Failed to copy template to {slot_dir}: {e}")
                        slot_dir.mkdir(parents=True, exist_ok=True)
                else:
                    slot_dir.mkdir(parents=True, exist_ok=True)

    def acquire(self, timeout: float = 300) -> int:
        return self.pool.get(timeout=timeout)

    def release(self, slot_id: int):
        slot_dir = Path(tempfile.gettempdir()) / f"lo_slot_{slot_id}"
        # Ensure stale .lock is removed before returning slot to pool
        for lock_name in [".lock", ".~lock"]:
            lock_path = slot_dir / lock_name
            if lock_path.exists():
                try:
                    lock_path.unlink(missing_ok=True)
                except Exception:
                    pass
        self.pool.put(slot_id)

profile_pool = ProfilePool(size=2)
windows_office_lock = threading.Lock()

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
    Converts any Office document to PDF using pre-warmed LibreOffice slot profiles.
    Reusing warm profile slots saves 2-4 seconds of configuration initialization per file.
    """
    slot_id = profile_pool.acquire(timeout=timeout_seconds)
    slot_dir = Path(tempfile.gettempdir()) / f"lo_slot_{slot_id}"
    profile_uri = slot_dir.as_uri()

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
            "--quickstart=no",
            "--convert-to",
            "pdf",
            str(input_file.resolve()),
            "--outdir",
            str(out_dir.resolve()),
        ]

        logger.info(f"Converting {input_file.name} using warm slot {slot_id}")
        
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
        profile_pool.release(slot_id)

def convert_with_ms_office_windows(input_file: Path, expected_pdf: Path):
    """Native Microsoft Office conversion on Windows for Word, Excel, and PowerPoint."""
    import pythoncom
    import win32com.client

    ext = input_file.suffix.lower()
    abs_input = str(input_file.resolve())
    abs_output = str(expected_pdf.resolve())

    with windows_office_lock:
        pythoncom.CoInitialize()
        app = None
        doc = None

        try:
            if ext in WORD_EXTENSIONS:
                app = win32com.client.DispatchEx("Word.Application")
                app.Visible = False
                app.DisplayAlerts = False
                doc = app.Documents.Open(abs_input, ReadOnly=True)
                doc.SaveAs(abs_output, FileFormat=17)

            elif ext in EXCEL_EXTENSIONS:
                app = win32com.client.DispatchEx("Excel.Application")
                app.Visible = False
                app.DisplayAlerts = False
                doc = app.Workbooks.Open(abs_input, ReadOnly=True)
                doc.ExportAsFixedFormat(0, abs_output)

            elif ext in PPT_EXTENSIONS:
                app = win32com.client.DispatchEx("PowerPoint.Application")
                doc = app.Presentations.Open(abs_input, ReadOnly=True, Untitled=False, WithWindow=False)
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
