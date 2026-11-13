import os
import sys
import shutil
import subprocess
import logging
from pathlib import Path

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

def convert_with_ms_word(input_file: Path, output_pdf: Path):
    """Converts a Word file to PDF using native Microsoft Word automation on Windows."""
    import pythoncom
    import win32com.client

    pythoncom.CoInitialize()
    word = None
    doc = None
    try:
        word = win32com.client.DispatchEx("Word.Application")
        word.Visible = False
        word.DisplayAlerts = False

        abs_input = str(input_file.resolve())
        abs_output = str(output_pdf.resolve())

        doc = word.Documents.Open(abs_input, ReadOnly=True)
        # wdFormatPDF = 17
        doc.SaveAs(abs_output, FileFormat=17)
        logger.info(f"Successfully converted via MS Word: {abs_output}")
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

def convert_with_libreoffice(input_file: Path, out_dir: Path, soffice_bin: str, timeout_seconds: int = 60) -> str:
    """Converts using LibreOffice headless (standard on Linux/Docker/Render)."""
    cmd = [
        soffice_bin,
        "--headless",
        "--convert-to",
        "pdf",
        str(input_file.resolve()),
        "--outdir",
        str(out_dir.resolve()),
    ]

    logger.info(f"Executing conversion via LibreOffice: {' '.join(cmd)}")
    result = subprocess.run(
        cmd,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        timeout=timeout_seconds,
    )

    if result.returncode != 0:
        logger.error(f"LibreOffice conversion failed. Stderr: {result.stderr}")
        raise RuntimeError(f"Conversion failed: {result.stderr or result.stdout}")

    expected_pdf = out_dir / f"{input_file.stem}.pdf"
    if not expected_pdf.exists():
        pdfs = list(out_dir.glob("*.pdf"))
        if pdfs:
            expected_pdf = pdfs[0]
        else:
            raise RuntimeError("LibreOffice finished but output PDF file was not generated.")

    return str(expected_pdf.resolve())

def convert_word_to_pdf(input_path: str, output_dir: str, timeout_seconds: int = 60) -> str:
    """
    Dual-engine converter:
    1. Uses LibreOffice headless if found (Linux / Docker / Render).
    2. Fallbacks to Microsoft Word COM if on Windows (Local Development).
    """
    input_file = Path(input_path)
    out_dir = Path(output_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    if not input_file.exists():
        raise FileNotFoundError(f"Input file not found: {input_path}")

    expected_pdf = out_dir / f"{input_file.stem}.pdf"

    # 1. Try LibreOffice first
    soffice_bin = find_libreoffice_binary()
    if soffice_bin:
        return convert_with_libreoffice(input_file, out_dir, soffice_bin, timeout_seconds)

    # 2. Try MS Word on Windows
    if sys.platform == "win32":
        try:
            convert_with_ms_word(input_file, expected_pdf)
            if expected_pdf.exists():
                return str(expected_pdf.resolve())
        except Exception as e:
            logger.warning(f"MS Word conversion failed: {e}. Checking other options...")

    raise RuntimeError(
        "No conversion engine available. Please ensure either LibreOffice (Docker/Linux) "
        "or Microsoft Word (Windows) is available."
    )
