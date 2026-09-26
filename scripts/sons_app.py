#!/usr/bin/env python3
"""Synthétise les sons d'interface de l'app iPhone.

    python3 scripts/sons_app.py            # écrit ios/App/App/Sons/
    python3 scripts/sons_app.py --verifier # échoue si un fichier n'est plus à jour

Ne pas confondre avec `sons.py`, qui dessine les signaux sonores du RIPAM pour
la banque. Ici, ce sont les bruitages de l'app : ce qu'on entend quand on coche,
quand la correction tombe, quand une leçon ou un examen blanc se termine.

Ce qu'ils doivent être
----------------------
Courts, doux, et qui disent le résultat d'un geste. La grammaire est celle des
apps d'apprentissage, sans rien leur emprunter : une montée claire pour juste,
une note grave et brève pour faux, jamais punitive. Aucun fichier ni motif
n'est repris d'ailleurs, tout est calculé ici, et la licence du dépôt vaut
pour ces fichiers comme pour le code.

La signature est maritime : une cloche de bord ouvre le son de l'examen reçu.
Elle se fait comme une vraie cloche, une fondamentale et des partiels
inharmoniques (2, 2,76 et 5,4 fois la fondamentale) qui s'éteignent chacun à
sa vitesse, les aigus d'abord. Le reste est en sinus et en triangle adouci.

Tout est en la majeur, pour que deux sons qui se suivent (la dernière
correction, puis la fin de série) ne jurent pas entre eux.

Les règles de fabrication
-------------------------
- Crête fixée pour chaque son, au plus -9 dBFS : volume bas, jamais plus fort
  qu'une notification. Le lecteur natif joue à plein, le niveau est ici.
- Attaque en demi-cosinus de 5 ms au moins : pas de clic au départ.
- Chaque note finit à zéro, et le fichier aussi : pas de clic à la fin.
- WAV 44,1 kHz, mono, 16 bits. Le calcul n'emploie que `math` et `wave`, et
  il est déterministe : `--verifier` régénère en mémoire et compare octet à
  octet, comme les scripts de visuels.
"""
from __future__ import annotations

import argparse
import io
import math
import sys
import wave
from pathlib import Path

RACINE = Path(__file__).resolve().parents[1]
SORTIE = RACINE / "ios" / "App" / "App" / "Sons"

TAUX = 44_100
ATTAQUE = 0.005   # secondes, demi-cosinus
FONDU = 0.012     # secondes, fondu de fin de chaque note


def hz(demi_tons_depuis_la4: int) -> float:
    """Fréquence tempérée, à partir du la 440."""
    return 440.0 * 2 ** (demi_tons_depuis_la4 / 12)


# Les notes employées, en la majeur.
LA4, DO_D5, MI5, LA5, DO_D6, MI6 = (hz(n) for n in (0, 4, 7, 12, 16, 19))
RE4 = hz(-7)


def vide(duree: float) -> list[float]:
    return [0.0] * round(duree * TAUX)


def enveloppe(i: int, n: int, decroissance: float) -> float:
    """Attaque en demi-cosinus, décroissance exponentielle, fondu final à zéro."""
    t = i / TAUX
    a = round(ATTAQUE * TAUX)
    f = round(FONDU * TAUX)
    niveau = math.exp(-t / decroissance)
    if i < a:
        niveau *= 0.5 - 0.5 * math.cos(math.pi * i / a)
    reste = n - 1 - i
    if reste < f:
        niveau *= 0.5 - 0.5 * math.cos(math.pi * reste / f)
    return niveau


def note(freq: float, duree: float, decroissance: float, partiels: tuple[tuple[float, float], ...],
         glisse: float = 0.0) -> list[float]:
    """Une note : une somme de partiels (rapport, amplitude) sous une enveloppe.

    `glisse` fait descendre la hauteur d'autant de demi-tons sur la durée : une
    note qui s'affaisse un peu est plus douce qu'une note droite.
    """
    n = round(duree * TAUX)
    sortie = []
    phase = 0.0
    for i in range(n):
        f = freq * 2 ** (-glisse * (i / n) / 12)
        phase += 2 * math.pi * f / TAUX
        v = sum(amp * math.sin(rapport * phase) for rapport, amp in partiels)
        sortie.append(v * enveloppe(i, n, decroissance))
    return sortie


def cloche(freq: float, duree: float) -> list[float]:
    """Une cloche de bord : partiels inharmoniques, chacun sa décroissance.

    Les aigus meurent vite, la fondamentale tient : c'est ce qui fait sonner
    la cloche plutôt que le carillon.
    """
    partiels = (  # rapport, amplitude, décroissance en secondes
        (1.0, 1.0, 0.55),
        (2.0, 0.55, 0.32),
        (2.76, 0.40, 0.20),
        (5.4, 0.22, 0.08),
    )
    n = round(duree * TAUX)
    sortie = []
    for i in range(n):
        t = i / TAUX
        v = sum(amp * math.exp(-t / dec) * math.sin(2 * math.pi * freq * r * t)
                for r, amp, dec in partiels)
        sortie.append(v * enveloppe(i, n, 1e9))
    return sortie


# Un triangle adouci : la fondamentale et un soupçon d'harmoniques impairs.
DOUX = ((1.0, 1.0), (3.0, 0.08), (5.0, 0.02))
PUR = ((1.0, 1.0),)
# Une note grave a besoin de son octave pour s'entendre sur le haut-parleur
# d'un téléphone, qui ne descend pas bien en dessous de 400 Hz.
GRAVE = ((1.0, 1.0), (2.0, 0.45), (3.0, 0.12))


def poser(piste: list[float], son: list[float], debut: float) -> None:
    """Additionne `son` dans `piste` à partir de `debut` secondes."""
    k = round(debut * TAUX)
    for i, v in enumerate(son):
        piste[k + i] += v


def normaliser(piste: list[float], crete_dbfs: float) -> list[float]:
    crete = max(abs(v) for v in piste)
    gain = 10 ** (crete_dbfs / 20) / crete
    return [v * gain for v in piste]


def sequence(duree: float, notes: list[tuple[float, list[float]]], crete_dbfs: float) -> list[float]:
    piste = vide(duree)
    for debut, son in notes:
        poser(piste, son, debut)
    return normaliser(piste, crete_dbfs)


# Chaque son : sa durée, ses notes (départ en secondes, note), sa crête.
def sons() -> dict[str, list[float]]:
    return {
        # Un clic tonal : quarante millisecondes d'un mi aigu qui s'éteint.
        "choix": sequence(0.045, [
            (0.0, note(MI6, 0.045, 0.012, PUR)),
        ], -20.0),
        # Deux notes qui montent d'une quinte, la seconde tient un peu.
        "juste": sequence(0.26, [
            (0.0, note(LA5, 0.11, 0.08, DOUX)),
            (0.08, note(MI6, 0.18, 0.09, DOUX)),
        ], -12.0),
        # Une seule note grave qui s'affaisse d'un demi-ton. Pas de buzzer.
        "faux": sequence(0.20, [
            (0.0, note(RE4, 0.20, 0.09, GRAVE, glisse=1.0)),
        ], -14.0),
        # Trois notes de l'accord, en montant.
        "lecon": sequence(0.50, [
            (0.0, note(LA5, 0.14, 0.08, DOUX)),
            (0.10, note(DO_D6, 0.14, 0.08, DOUX)),
            (0.20, note(MI6, 0.30, 0.12, DOUX)),
        ], -12.0),
        # Un arpège serré de quatre notes, plus bref que la leçon par note.
        "fin-serie": sequence(0.50, [
            (0.0, note(MI5, 0.12, 0.07, DOUX)),
            (0.065, note(LA5, 0.12, 0.07, DOUX)),
            (0.13, note(DO_D6, 0.12, 0.07, DOUX)),
            (0.195, note(MI6, 0.305, 0.12, DOUX)),
        ], -12.0),
        # La cloche de bord, puis l'accord qui monte par-dessus sa résonance.
        "reussi": sequence(1.15, [
            (0.0, cloche(LA4, 1.15)),
            (0.22, note(LA5, 0.30, 0.18, DOUX)),
            (0.32, note(DO_D6, 0.30, 0.18, DOUX)),
            (0.42, note(MI6, 0.73, 0.24, DOUX)),
        ], -9.0),
        # Deux notes qui descendent d'une tierce, lentement et bas.
        "echoue": sequence(0.50, [
            (0.0, note(MI5, 0.22, 0.14, PUR)),
            (0.18, note(DO_D5, 0.32, 0.16, PUR)),
        ], -14.0),
    }


def en_wav(piste: list[float]) -> bytes:
    """WAV 16 bits mono. L'en-tête de `wave` ne porte aucune date : stable."""
    tampon = io.BytesIO()
    with wave.open(tampon, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(TAUX)
        w.writeframes(b"".join(
            max(-32768, min(32767, round(v * 32767))).to_bytes(2, "little", signed=True)
            for v in piste
        ))
    return tampon.getvalue()


def main(argv: list[str] | None = None) -> int:
    parseur = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parseur.add_argument("--verifier", action="store_true", help="échoue au lieu d'écrire")
    args = parseur.parse_args(argv)

    fichiers = {nom: en_wav(piste) for nom, piste in sons().items()}
    SORTIE.mkdir(parents=True, exist_ok=True)

    if args.verifier:
        perimes = [n for n, contenu in fichiers.items()
                   if not (SORTIE / f"{n}.wav").is_file() or (SORTIE / f"{n}.wav").read_bytes() != contenu]
        attendus = {f"{n}.wav" for n in fichiers}
        orphelins = sorted(p.name for p in SORTIE.glob("*.wav") if p.name not in attendus)
        for n in perimes:
            print(f"{(SORTIE / f'{n}.wav').relative_to(RACINE)} n'est plus à jour, "
                  "lance `python3 scripts/sons_app.py`", file=sys.stderr)
        for nom in orphelins:
            print(f"{nom} n'est produit par aucun son de sons_app.py", file=sys.stderr)
        if perimes or orphelins:
            return 1
        print(f"{len(fichiers)} son(s) de l'app à jour.")
        return 0

    for n, contenu in fichiers.items():
        chemin = SORTIE / f"{n}.wav"
        chemin.write_bytes(contenu)
        print(f"écrit {chemin.relative_to(RACINE)}")
    print(f"\n{len(fichiers)} son(s) dans {SORTIE.relative_to(RACINE)}/")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
