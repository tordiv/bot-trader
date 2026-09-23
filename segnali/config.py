"""Tutte le costanti del motore di segnali, in un unico posto.

Nessun altro file deve contenere numeri "magici": se vuoi cambiare un parametro, lo cambi qui.
ATTENZIONE: cambiare un parametro durante un periodo di test invalida il test. Annota ogni
modifica in CHANGELOG.md e riparti dal backtest.

Le funzioni pure ricevono un oggetto Config come argomento (non leggono variabili globali):
così i test possono provare configurazioni diverse con dataclasses.replace(CONFIG, ...).
"""
from dataclasses import dataclass, field
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

# Universo di partenza: azioni USA grandi e liquide di settori diversi.
# Il filtro MAX_PRICE_USD scarta automaticamente, settimana per settimana, quelle troppo care
# per un conto da ~1.000 €. ATTENZIONE: una lista scelta oggi contiene solo aziende
# "sopravvissute": nel backtest gonfia i risultati del passato (bias di sopravvivenza).
DEFAULT_UNIVERSE = (
    "KO", "PEP", "PFE", "MRK", "BMY", "CSCO", "INTC", "ORCL", "QCOM", "MU",
    "BAC", "WFC", "C", "SCHW", "T", "VZ", "CMCSA", "DIS", "NKE", "SBUX",
    "XOM", "CVX", "SLB", "F", "GM", "DAL", "UBER", "PYPL", "WMT", "KHC",
)


@dataclass(frozen=True)
class Config:
    # --- Universo e dati ---
    UNIVERSE: tuple = DEFAULT_UNIVERSE
    SIGNAL_SYMBOL: str = "SPY"          # usato SOLO come filtro di mercato, mai comprato
    DATA_FEED: str = "sip"              # barre giornaliere storiche: il piano gratuito le consente
    BACKTEST_START: str = "2016-01-01"  # lo storico SIP gratuito di Alpaca parte dal 2016
    HISTORY_DAYS_LIVE: int = 450        # giorni di calendario scaricati per weekly/daily

    # --- Capitale e valuta ---
    START_EQUITY_EUR: float = 1000.0
    EURUSD: float = 1.15                # cambio indicativo: aggiornalo quando cambia molto

    # --- Strategia (variante A: rotazione momentum settimanale) ---
    MAX_POSITIONS: int = 1
    EXIT_RANK: int = 8                  # esci se il titolo scende oltre questa posizione
    MOMENTUM_DAYS: int = 126            # ~6 mesi di borsa
    SKIP_DAYS: int = 5                  # esclude l'ultima settimana dal momentum
    SMA_DAYS: int = 200
    ATR_DAYS: int = 20
    ATR_MULT: float = 3.0
    TRAILING_STOP: bool = True          # alza lo stop quando il prezzo sale, mai abbassarlo
    MIN_STOP_MOVE_PCT: float = 0.01     # sposta lo stop solo se sale almeno dell'1%
    MAX_PRICE_USD: float = 150.0

    # --- Rischio e costi ---
    MAX_POSITION_PCT: float = 0.95
    RISK_PER_TRADE_MAX: float = 0.05
    COMMISSION_PER_ORDER_USD: float = 9.0
    MAX_COMMISSION_R: float = 0.35      # niente ticket se le commissioni superano 0,35 R
    SLIPPAGE: float = 0.001             # 0,1% per lato nel backtest
    LIMIT_BUFFER_PCT: float = 0.01      # prezzo limite = chiusura + 1% (non si insegue oltre)

    # --- Ticket ---
    TICKET_VALID_TRADING_DAYS: int = 2  # validi fino alla chiusura del 2° giorno di borsa
    PROXIMITY_ATR: float = 1.0          # avviso se il prezzo è entro 1 ATR dallo stop

    # --- Limiti dell'esperimento (in euro, convertiti con EURUSD) ---
    EXPERIMENT_PAUSE_EQUITY_EUR: float = 800.0
    EXPERIMENT_STOP_EQUITY_EUR: float = 650.0

    # --- Fisco (stima semplificata del regime amministrato, solo per i report) ---
    TAX_RATE: float = 0.26
    TAX_LOSS_CARRY_YEARS: int = 4

    # --- Benchmark (solo confronto, non negoziati) ---
    INDEX_SMA_WEEKS: int = 40
    BENCHMARK_COMMISSION_USD: float = 9.0
    IN_SAMPLE_FRACTION: float = 2 / 3

    # --- Da dove leggere le posizioni ---
    # "paper"  durante il test: posizioni e stop dal conto paper Alpaca
    # "ledger" in live: dalle tue esecuzioni manuali registrate in ledger/fills.csv
    POSITIONS_FROM: str = "paper"

    # --- Fusi orari ---
    TZ_MARKET: str = "America/New_York"
    TZ_LOCAL: str = "Europe/Rome"
    MARKET_CLOSE_HOUR: int = 16

    # --- Percorsi ---
    CACHE_DIR: Path = field(default=ROOT / "data" / "cache")
    TICKETS_DIR: Path = field(default=ROOT / "tickets")
    REPORTS_DIR: Path = field(default=ROOT / "reports")
    LOGS_DIR: Path = field(default=ROOT / "logs")
    LEDGER_FILE: Path = field(default=ROOT / "ledger" / "fills.csv")

    @property
    def start_equity_usd(self) -> float:
        return self.START_EQUITY_EUR * self.EURUSD

    @property
    def pause_equity_usd(self) -> float:
        return self.EXPERIMENT_PAUSE_EQUITY_EUR * self.EURUSD

    @property
    def stop_equity_usd(self) -> float:
        return self.EXPERIMENT_STOP_EQUITY_EUR * self.EURUSD

    @property
    def all_symbols(self) -> list:
        return list(self.UNIVERSE) + [self.SIGNAL_SYMBOL]


CONFIG = Config()
