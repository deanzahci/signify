import logging
import sys
from config import LOG_LEVEL


def setup_logging():
    """
    Configure logging for the application.
    """
    log_format = '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    
    logging.basicConfig(
        level=getattr(logging, LOG_LEVEL.upper(), logging.INFO),
        format=log_format,
        handlers=[
            logging.StreamHandler(sys.stdout)
        ]
    )
    
    logging.getLogger('mediapipe').setLevel(logging.WARNING)
    logging.getLogger('tensorflow').setLevel(logging.WARNING)
    logging.getLogger('absl').setLevel(logging.WARNING)
    
    logger = logging.getLogger(__name__)
    logger.info(f"Logging configured at {LOG_LEVEL} level")
