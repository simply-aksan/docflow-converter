import os
import sys
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

def convert_batch_with_libreoffice(
    input_files: List[Path], 
    out_dir: Path, 
    soffice_bin: str, 
    job_id: str,
    timeout_seconds: int = 120
) -> Dict[str, str]:
    """
    Converts multiple Word documents in a single LibreOffice invocation.
    Uses an isolated user profile per job to prevent lock collisions and maximize speed.
    """
    # Create an isolated temporary user profile directory
    temp_profile_dir = Path(tempfile.gettempdir()) / f"lo_profile_{job_id}"
    temp_profile_dir.mkdir(parents=True, exist_ok=True)
    profile_uri = temp_profile_dir.as_uri()

    try:
        # Optimized headless command: loads all files at once, no splash, no lock check
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
        ]
        # Append all input files
        for f in input_files:
            cmd.append(str(f.resolve()))

        cmd.extend(["--outdir", str(out_dir.resolve())])

        logger.info(f"Running optimized LibreOffice batch command for {len(input_files)} file(s)")
        result = subprocess.run(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            timeout=timeout_seconds,
        )

        if result.returncode != 0:
            logger.warning(f"LibreOffice returned code {result.returncode}. Stderr: {result.stderr}")

        # Map input files to their generated output PDF
        out_map = {}
        for f in input_files:
            expected_pdf = out_dir / f"{f.stem}.pdf"
            if expected_pdf.exists():
                out_map[f.name] = str(expected_pdf.resolve())
            else:
                # Case-insensitive or space-adjusted fallback search
                candidates = list(out_dir.glob(f"*{f.stem}*.pdf"))
                if candidates:
                    out_map[f.name] = str(candidates[0].resolve())

        return out_map

    finally:
        # Cleanup temporary user profile directory
        shutil.rmtree(temp_profile_dir, ignore_errors=True)

def convert_batch_with_ms_word(input_files: List[Path], out_dir: Path) -> Dict[str, str]:
    """
    Converts multiple Word files on Windows using a single Microsoft Word Application instance.
    Keeps Word in memory for the duration of the batch, which is 10x faster than restarting Word.
    """
    import pythoncom
    import win32com.client

    out_map = {}
    pythoncom.CoInitialize()
    word = None

    try:
        word = win32com.client.DispatchEx("Word.Application")
        word.Visible = False
        word.DisplayAlerts = False

        for f in input_files:
            doc = None
            try:
                abs_input = str(f.resolve())
                expected_pdf = out_dir / f"{f.stem}.pdf"
                abs_output = str(expected_pdf.resolve())

                doc = word.Documents.Open(abs_input, ReadOnly=True)
                # wdFormatPDF = 17
                doc.SaveAs(abs_output, FileFormat=17)
                doc.Close(SaveChanges=False)
                doc = None

                if expected_pdf.exists():
                    out_map[f.name] = str(expected_pdf.resolve())
            except Exception as e:
                logger.error(f"Failed to convert {f.name} with MS Word: {e}")
                if doc is not None:
                    try:
                        doc.Close(SaveChanges=False)
                    except Exception:
                        pass
    finally:
        if word is not None:
            try:
                word.Quit()
            except Exception:
                pass
        pythoncom.CoUninitialize()

    return out_map

def convert_batch_documents(
    input_files: List[Path], 
    output_dir: str, 
    job_id: str,
    timeout_seconds: int = 120
) -> Dict[str, str]:
    """
    Unified batch converter:
    1. LibreOffice headless with single-invocation batching and profile isolation (Docker / Render / Linux).
    2. Microsoft Word COM instance reuse (Windows Local Dev).
    """
    if not input_files:
        return {}

    out_dir = Path(output_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    soffice_bin = find_libreoffice_binary()
    if soffice_bin:
        return convert_batch_with_libreoffice(input_files, out_dir, soffice_bin, job_id, timeout_seconds)

    if sys.platform == "win32":
        return convert_batch_with_ms_word(input_files, out_dir)

    raise RuntimeError("No conversion engine (LibreOffice or MS Word) available.")

def convert_word_to_pdf(input_path: str, output_dir: str, timeout_seconds: int = 60) -> str:
    """Single file wrapper around convert_batch_documents."""
    f = Path(input_path)
    res = convert_batch_documents([f], output_dir, job_id=f.stem, timeout_seconds=timeout_seconds)
    if f.name in res:
        return res[f.name]
    raise RuntimeError("Failed to generate PDF.")
