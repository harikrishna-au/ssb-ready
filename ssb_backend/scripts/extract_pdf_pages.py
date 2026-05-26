#!/usr/bin/env python3
"""
Extract each PDF page as a PNG image for OIR import.

Usage:
  python3 scripts/extract_pdf_pages.py \
    --pdf "/Users/you/Downloads/OIR-1.pdf" \
    --out "./tmp/oir1_images" \
    --prefix "oir1_q" \
    --dpi 220
"""

from __future__ import annotations

import argparse
from pathlib import Path
import fitz  # PyMuPDF


def extract_pages(pdf_path: Path, out_dir: Path, prefix: str, dpi: int) -> int:
    out_dir.mkdir(parents=True, exist_ok=True)

    with fitz.open(pdf_path) as doc:
        for idx, page in enumerate(doc):
            # 72 DPI is default. Scale matrix to requested DPI.
            zoom = dpi / 72.0
            mat = fitz.Matrix(zoom, zoom)
            pix = page.get_pixmap(matrix=mat, alpha=False)
            filename = f"{prefix}{idx + 1:03d}.png"
            pix.save(out_dir / filename)

        return len(doc)


def main() -> None:
    parser = argparse.ArgumentParser(description="Extract PDF pages to PNG images.")
    parser.add_argument("--pdf", required=True, help="Absolute path to source PDF")
    parser.add_argument("--out", required=True, help="Output directory")
    parser.add_argument("--prefix", default="q", help="File prefix, default: q")
    parser.add_argument("--dpi", type=int, default=220, help="Render DPI, default: 220")
    args = parser.parse_args()

    pdf_path = Path(args.pdf).expanduser().resolve()
    out_dir = Path(args.out).expanduser().resolve()

    if not pdf_path.exists():
        raise SystemExit(f"PDF not found: {pdf_path}")

    count = extract_pages(pdf_path, out_dir, args.prefix, args.dpi)
    print(f"Extracted {count} pages -> {out_dir}")


if __name__ == "__main__":
    main()

