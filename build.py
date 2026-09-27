#!/usr/bin/env python3
"""Regenerate data/ from the pinned IndoPak source.

Self-contained on purpose: this repository is temporary and will be deleted when the
review closes. The canonical rule table lives in the app repository's
Tools/build_tajweed.py; keep the two in step if the mapping changes.
"""
import json, os, re, unicodedata, urllib.request

SOURCE = ("https://raw.githubusercontent.com/IsmailHosenIsmailJames/al_quran_v3/"
          "810101c052db32ed245506bf6f1f6dd5f7823d54/assets/quran_script/Indopak.json")
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data")

# Source rule id -> the app's rule name. Derived by cross-tabulating the source's
# spans against quran.com's annotations on the same words. Ids above 18 are
# madd/alef sub-kinds the app does not distinguish and are emitted as null.
RULES = {
    "0": "hamzat_wasl", "1": "lam_shamsiyyah", "2": "madd_2", "3": "madd_246",
    "4": "madd_2", "5": "madd_2", "6": "madd_2", "7": "madd_6",
    "8": "idghaam_no_ghunnah", "9": "silent", "10": "ghunnah", "11": "qalqalah",
    "12": "ikhfa", "13": "madd_munfasil", "14": "madd_muttasil",
    "15": "idghaam_ghunnah", "16": "ikhfa_shafawi", "17": "idghaam_shafawi",
    "18": "iqlab", "29": "idghaam_mutajanisayn", "31": "idghaam_mutaqaribayn",
}
SEGMENT = re.compile(r"r(\d+)(.*?)</rule>", re.S)
TAG = re.compile(r"</?rule[^>]*>")
DIGITS = re.compile(r"^[\u0660-\u0669]+$")


def is_mark(char):
    # Must match the renderer: every combining mark belongs to the cluster it
    # follows, so cluster offsets line up with Intl.Segmenter in the browser.
    return unicodedata.category(char).startswith("M")


def clusters(word):
    bounds, start = [], 0
    for index, char in enumerate(word):
        if index and not is_mark(char):
            bounds.append((start, index))
            start = index
    bounds.append((start, len(word)))
    return bounds


def split_word(raw):
    """(plain text, [(rule id or None, codepoint start, codepoint end)])."""
    out, plain, cursor = [], "", 0
    for match in SEGMENT.finditer(raw):
        if match.start() > cursor:
            text = TAG.sub("", raw[cursor:match.start()])
            if text:
                out.append((None, len(plain), len(plain) + len(text)))
                plain += text
        text = match.group(2)
        if text:
            out.append((match.group(1), len(plain), len(plain) + len(text)))
            plain += text
        cursor = match.end()
    tail = TAG.sub("", raw[cursor:])
    if tail:
        out.append((None, len(plain), len(plain) + len(tail)))
        plain += tail
    return plain, out


def main():
    os.makedirs(OUT, exist_ok=True)
    with urllib.request.urlopen(SOURCE) as response:
        asset = json.loads(response.read().decode("utf-8"))

    index, words_total, spans_total = [], 0, 0
    for surah in sorted((int(k) for k in asset), key=int):
        ayahs = []
        for ayah in sorted((int(a) for a in asset[str(surah)]), key=int):
            words = []
            for raw in [w for w in asset[str(surah)][str(ayah)] if not DIGITS.match(w)]:
                text, segments = split_word(raw)
                bounds = clusters(text)
                spans = []
                for rule_id, start, end in segments:
                    if rule_id is None:
                        continue
                    touched = [i for i, (a, b) in enumerate(bounds) if start < b and end > a]
                    if touched:
                        spans.append([touched[0], touched[-1] + 1, RULES.get(rule_id)])
                words_total += 1
                spans_total += len(spans)
                words.append({"t": text, "s": spans})
            ayahs.append({"a": ayah, "w": words})
        with open(os.path.join(OUT, f"{surah}.json"), "w", encoding="utf-8") as handle:
            json.dump({"surah": surah, "ayahs": ayahs}, handle, ensure_ascii=False, separators=(",", ":"))
        index.append({"surah": surah, "name": f"Surah {surah}", "ayahs": len(ayahs),
                      "spans": sum(len(w["s"]) for a in ayahs for w in a["w"])})
    with open(os.path.join(OUT, "index.json"), "w", encoding="utf-8") as handle:
        json.dump(index, handle, ensure_ascii=False, separators=(",", ":"))
    print(f"wrote {OUT}: {len(index)} suwar, {words_total} words, {spans_total} spans")


if __name__ == "__main__":
    main()
