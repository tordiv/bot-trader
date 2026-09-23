"""Notifiche Telegram (facoltative). Un errore di notifica non deve mai fermare il programma."""
import json
import logging
import os
import urllib.request

log = logging.getLogger(__name__)
MAX_LEN = 3900  # Telegram accetta messaggi fino a 4096 caratteri


def send(text: str) -> bool:
    token, chat_id = os.getenv("TELEGRAM_BOT_TOKEN"), os.getenv("TELEGRAM_CHAT_ID")
    if not token or not chat_id:
        log.info("Telegram non configurato: messaggio solo nel log")
        return False
    ok = True
    for start in range(0, len(text), MAX_LEN):
        payload = json.dumps({"chat_id": chat_id, "text": text[start:start + MAX_LEN]}).encode()
        request = urllib.request.Request(f"https://api.telegram.org/bot{token}/sendMessage", data=payload,
                                         headers={"Content-Type": "application/json"})
        try:
            urllib.request.urlopen(request, timeout=15).read()
        except Exception as exc:
            log.error("Invio Telegram fallito: %s", exc)
            ok = False
    return ok
