import os
import time
import shutil
import logging
from pathlib import Path
from app.config import settings

logger = logging.getLogger(__name__)

def cleanup_old_files():
    """
    Deletes files and folders in STORAGE_DIR that are older than FILE_RETENTION_MINUTES.
    """
    storage_path = Path(settings.STORAGE_DIR)
    if not storage_path.exists():
        return

    now = time.time()
    cutoff = now - (settings.FILE_RETENTION_MINUTES * 60)
    
    count = 0
    for item in storage_path.iterdir():
        try:
            mtime = item.stat().st_mtime
            if mtime < cutoff:
                if item.is_dir():
                    shutil.rmtree(item, ignore_errors=True)
                else:
                    item.unlink(missing_ok=True)
                count += 1
        except Exception as e:
            logger.warning(f"Failed to cleanup item {item}: {e}")
            
    if count > 0:
        logger.info(f"Cleaned up {count} expired files/directories.")
