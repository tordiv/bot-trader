"""Stima semplificata dell'imposta in regime amministrato (azioni: redditi diversi).

Serve SOLO per confrontare le varianti al netto delle imposte nel backtest e nei report.
Il calcolo vero lo fa il broker. Semplificazioni dichiarate:
- aliquota unica (26%), niente effetti del cambio EUR/USD, niente dividendi;
- le commissioni riducono la plusvalenza (sono costi inerenti all'operazione);
- una minusvalenza è compensabile fino al 31/12 del quarto anno successivo ("zainetto fiscale").
"""
from dataclasses import dataclass, field


@dataclass
class TaxAccount:
    rate: float = 0.26
    carry_years: int = 4
    losses: list = field(default_factory=list)   # [anno di origine, importo residuo]
    paid: float = 0.0

    def on_realized(self, gain: float, year: int) -> float:
        """Registra una plusvalenza/minusvalenza realizzata e ritorna l'imposta dovuta subito."""
        self.losses = [[y, amt] for y, amt in self.losses if y + self.carry_years >= year and amt > 0]
        if gain <= 0:
            if gain < 0:
                self.losses.append([year, -gain])
            return 0.0
        taxable = gain
        for item in sorted(self.losses, key=lambda x: x[0]):   # usa prima le perdite più vecchie
            used = min(item[1], taxable)
            item[1] -= used
            taxable -= used
            if taxable <= 0:
                break
        tax = round(taxable * self.rate, 2)
        self.paid += tax
        return tax

    @property
    def carried_losses(self) -> float:
        return round(sum(amt for _, amt in self.losses), 2)
