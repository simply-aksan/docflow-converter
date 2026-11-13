import os
import shutil
import subprocess
import logging
from pathlib import Path

logger = logging.getLogger(__name__)

def find_libreoffice_binary() -> str | None:
    """Finds the LibreOffice executable in the system."""
    # 1. Check standard PATH (Linux / Render Docker container / Mac)
    for cmd in ["libreoffice", "soffice"]:
        path = shutil.which(cmd)
        if path:
            return path

    # 2. Check common Windows installation paths
    windows_paths = [
        r"C:\Program Files\LibreOffice\program\soffice.exe",
        r"C:\Program Files (x86)\LibreOffice\program\soffice.exe",
    ]
    for win_path in windows_paths:
        if os.path.exists(win_path):
            return win_path

    return None

def convert_word_to_pdf(input_path: str, output_dir: str, timeout_seconds: int = 60) -> str:
    """
    Converts a Word file (.docx or .doc) to PDF using LibreOffice headless.
    Returns the absolute path to the generated PDF.
    """
    input_file = Path(input_path)
    out_dir = Path(output_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    if not input_file.exists():
        raise FileNotFoundError(f"Input file not found: {input_path}")

    soffice_bin = find_libreoffice_binary()
    if not soffice_bin:
        raise RuntimeError(
            "LibreOffice executable not found. On production (Docker / Render), "
            "it is automatically installed. For local Windows dev, install LibreOffice or run via Docker."
        )

    # Command: soffice --headless --convert-to pdf <input> --outdir <outdir>
    cmd = [
        soffice_bin,
        "--headless",
        "--convert-to",
        "pdf",
        str(input_file.resolve()),
        "--outdir",
        str(out_dir.resolve()),
    ]

    logger.info(f"Executing conversion: {' '.join(cmd)}")
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

    # Expected output file has the same stem as input with .pdf extension
    expected_pdf = out_dir / f"{input_file.stem}.pdf"
    if not expected_pdf.exists():
        # Fallback check if case or spaces altered name
        pdfs = list(out_dir.glob("*.pdf"))
        if pdfs:
            expected_pdf = pdfs[0]
        else:
            raise RuntimeError("LibreOffice finished but output PDF file was not generated.")

    return str(expected_pdf.resolve())
