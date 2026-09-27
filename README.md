# IndoPak tajweed — review site (temporary)

**This is a throwaway review surface, not a product.** It exists so a team of
Huffaz can read the candidate IndoPak text with its tajweed colouring in a browser
and mark what is wrong, without needing a device or an Apple Developer account.

Live: https://takasurazeem.github.io/quran-indopak-review/

## What the reviewer does

Open the URL, pick a surah from `☰`, and work through the ayat tinted for review
(2,162 of 6,236). Each has **Correct** / **Wrong** and an optional note, kept in the
browser; **Export review** downloads their marks as JSON.

Ayat are flagged because their letters or word splits still differ from the licensed
reference text, compared letter-by-letter and ignoring IndoPak orthographic variants
(ڪ ک, ٮ, ى ی, ـ). 98.91% of letters already read identically. Spans using rule ids
the reader cannot colour appear with a dotted underline rather than being hidden.

## Provenance

The text and its tajweed annotations come from the `al_quran_v3` project's paired
digitisation of a printed IndoPak tajweed mushaf, pinned at commit
`810101c052db32ed245506bf6f1f6dd5f7823d54`. Its licence is **non-commercial with
attribution** — this site carries no advertising and no charge, and must stay that
way. Nothing here is the Qur'anic text of the final app: the text is *under review*,
which is the entire point of this repository.

`build.py` regenerates `data/` from that pinned source:

```bash
python3 build.py
```

It is deliberately self-contained (its rule table is a copy of the one in the app's
`Tools/build_tajweed.py`) because this repository is temporary and will be deleted
once the review closes.
