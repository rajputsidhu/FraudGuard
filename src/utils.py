import os
import sys
import logging
from typing import Optional

def setup_logger(name: str, log_file: Optional[str] = None) -> logging.Logger:
    """
    Sets up a structured logger for the fraud detection pipeline.
    It formats messages with progress symbols (✔, ⚠, ✖) and prints to stdout.
    
    Args:
        name: Name of the logger (usually __name__).
        log_file: Optional path to a file to save the logs to.
        
    Returns:
        A configured logging.Logger instance.
    """
    logger = logging.getLogger(name)
    logger.setLevel(logging.INFO)
    
    # Avoid duplicate handlers if logger is re-initialized
    if not logger.handlers:
        # Create formatter
        formatter = logging.Formatter(
            '[%(asctime)s] [%(levelname)s] [%(name)s]: %(message)s',
            datefmt='%Y-%m-%d %H:%M:%S'
        )
        
        # Stream Handler (stdout)
        stream_handler = logging.StreamHandler(sys.stdout)
        stream_handler.setFormatter(formatter)
        logger.addHandler(stream_handler)
        
        # File Handler (optional)
        if log_file:
            # Ensure the directories for log_file exist
            ensure_dir(os.path.dirname(log_file))
            file_handler = logging.FileHandler(log_file, encoding='utf-8')
            file_handler.setFormatter(formatter)
            logger.addHandler(file_handler)
            
    return logger

def ensure_dir(path: str) -> None:
    """
    Ensures that a directory exists, creating it if necessary.
    Uses os.makedirs with exist_ok=True as required.
    
    Args:
        path: Path to the directory or file whose directory needs to exist.
    """
    if not path:
        return
    # If the path has an extension, we assume it's a file path and extract the dir name
    _, ext = os.path.splitext(path)
    if ext:
        dir_path = os.path.dirname(path)
    else:
        dir_path = path
        
    if dir_path:
        os.makedirs(dir_path, exist_ok=True)
