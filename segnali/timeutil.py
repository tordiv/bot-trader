"""Date e fusi orari. Il bot ragiona in ora di New York per il mercato e in ora di Roma per te.

Su Windows serve il pacchetto `tzdata` (in requirements.txt): Windows non include il database
dei fusi orari che Python usa.
"""
from datetime import date, datetime, time, timedelta
from zoneinfo import ZoneInfo

from .config import Config


def next_weekdays(start: date, n: int) -> list:
    """I prossimi `n` giorni feriali dopo `start` (le festività USA non sono considerate)."""
    days, current = [], start
    while len(days) < n:
        current += timedelta(days=1)
        if current.weekday() < 5:
            days.append(current)
    return days


def ticket_valid_until(asof: date, cfg: Config) -> datetime:
    """Scadenza del ticket: chiusura di Wall Street del N-esimo giorno feriale dopo `asof`,
    espressa in ora italiana. Gestisce da sola le settimane in cui l'ora legale USA ed europea
    non coincidono (in quei giorni la chiusura è alle 21:00 invece che alle 22:00)."""
    last_day = next_weekdays(asof, cfg.TICKET_VALID_TRADING_DAYS)[-1]
    close_ny = datetime.combine(last_day, time(cfg.MARKET_CLOSE_HOUR), ZoneInfo(cfg.TZ_MARKET))
    return close_ny.astimezone(ZoneInfo(cfg.TZ_LOCAL))


def now_local(cfg: Config) -> datetime:
    return datetime.now(ZoneInfo(cfg.TZ_LOCAL))


def market_today(cfg: Config) -> date:
    """La data di oggi secondo New York (a mezzanotte italiana a New York è ancora ieri)."""
    return datetime.now(ZoneInfo(cfg.TZ_MARKET)).date()
