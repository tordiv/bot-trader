"""Prova completa dei comandi con dati sintetici, senza rete e senza chiavi."""
import csv

from helpers import small_cfg
from segnali.cli import daily_main, weekly_main


def test_weekly_dry_run_writes_nothing(tmp_path, capsys):
    cfg = small_cfg(tmp_path)
    assert weekly_main(["--source", "synthetic", "--positions", "none", "--dry-run"], cfg) == 0
    out = capsys.readouterr().out
    assert "Report settimanale" in out and "RULE VIOLATIONS" in out
    assert not cfg.TICKETS_DIR.exists() and not cfg.REPORTS_DIR.exists()


def test_weekly_saves_tickets_and_report(tmp_path, monkeypatch):
    monkeypatch.delenv("TELEGRAM_BOT_TOKEN", raising=False)
    cfg = small_cfg(tmp_path)
    assert weekly_main(["--source", "synthetic", "--positions", "none"], cfg) == 0
    assert list(cfg.TICKETS_DIR.glob("*.json")) and list(cfg.REPORTS_DIR.glob("weekly-*.md"))


def test_weekly_submit_paper_requires_explicit_enable(tmp_path, monkeypatch):
    monkeypatch.delenv("PAPER_SUBMIT_ENABLED", raising=False)
    monkeypatch.delenv("TELEGRAM_BOT_TOKEN", raising=False)
    cfg = small_cfg(tmp_path)
    assert weekly_main(["--source", "synthetic", "--positions", "none", "--submit-paper"], cfg) == 3


def test_daily_flags_position_without_stop(tmp_path, monkeypatch):
    monkeypatch.delenv("TELEGRAM_BOT_TOKEN", raising=False)
    cfg = small_cfg(tmp_path)
    cfg.LEDGER_FILE.parent.mkdir(parents=True)
    with cfg.LEDGER_FILE.open("w", newline="") as fh:
        w = csv.writer(fh)
        w.writerow(["date", "action", "symbol", "qty", "price_usd", "commission_usd", "ticket_id", "note"])
        w.writerow(["2026-06-01", "DEPOSIT", "", "", "1150", "", "", ""])
        w.writerow(["2026-06-02", "BUY", "AAA", "3", "50", "9", "20260529-01", ""])
    assert daily_main(["--source", "synthetic", "--positions", "ledger", "--dry-run"], cfg) == 1
