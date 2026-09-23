"""Log su file con rotazione (logs/events.log) e a video."""
import logging
from logging.handlers import RotatingFileHandler

from .config import Config


def setup(cfg: Config, verbose: bool = False) -> None:
    cfg.LOGS_DIR.mkdir(parents=True, exist_ok=True)
    handlers = [
        RotatingFileHandler(cfg.LOGS_DIR / "events.log", maxBytes=2_000_000, backupCount=5, encoding="utf-8"),
        logging.StreamHandler(),
    ]
    logging.basicConfig(level=logging.DEBUG if verbose else logging.INFO,
                        format="%(asctime)s %(levelname)s %(name)s: %(message)s",
                        handlers=handlers, force=True)
