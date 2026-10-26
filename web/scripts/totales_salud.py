"""Totales por día calculados por scripts/salud.py, en JSON, para el test de paridad de la web."""
import json
import math
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "scripts"))
from salud import Base  # noqa: E402

db = Base()
out = {}
for fecha in sorted({c["fecha"] for c in db.t["comidas"] if c["estado"] != "anulada"}):
    tot, cob, n_items, errs = {}, {}, 0, []
    for c in db.comidas_de(fecha):
        _, t, cb, n, err, _, _ = db.totales_comida(c)
        n_items += n
        errs.append(err)
        for k, v in t.items():
            tot[k] = tot.get(k, 0.0) + v
            cob[k] = cob.get(k, 0) + cb[k]
    out[fecha] = {"tot": tot, "cob": cob, "n_items": n_items,
                  "err_kcal": math.sqrt(sum(e * e for e in errs)), "comidas": len(db.comidas_de(fecha))}
print(json.dumps(out))
