#!/usr/bin/env python3
"""Export an editable, page-referenced text manuscript from the approved interior PDF.

The Python layout source remains the authoritative editable design/layout file.
This DOCX is a text-editable transcript with the PDF's print-page numbers retained;
vector rules, checkboxes, diagrams, and spacing are intentionally represented by
editable labels/instructions rather than reproduced as editable page geometry.
"""
from pathlib import Path
import fitz
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.section import WD_SECTION
from docx.oxml import OxmlElement
from docx.oxml.ns import qn

ROOT = Path(__file__).resolve().parent
PDF = ROOT / "espresso-dial-in-fieldbook-interior.pdf"
OUT = ROOT / "espresso-dial-in-fieldbook-editable-manuscript.docx"


def set_cell_shading(cell, fill):
    shd = OxmlElement("w:shd")
    shd.set(qn("w:fill"), fill)
    cell._tc.get_or_add_tcPr().append(shd)


def main():
    pdf = fitz.open(PDF)
    doc = Document()
    sec = doc.sections[0]
    sec.top_margin = Inches(0.72)
    sec.bottom_margin = Inches(0.68)
    sec.left_margin = Inches(0.85)
    sec.right_margin = Inches(0.75)

    normal = doc.styles["Normal"]
    normal.font.name = "Aptos"
    normal.font.size = Pt(9.5)
    normal.font.color.rgb = RGBColor(35, 38, 35)
    normal.paragraph_format.space_after = Pt(3)
    normal.paragraph_format.line_spacing = 1.05
    for stylename in ("Heading 1", "Heading 2"):
        s = doc.styles[stylename]
        s.font.name = "Aptos Display"
        s.font.color.rgb = RGBColor(37, 44, 39)
    doc.styles["Heading 1"].font.size = Pt(24)
    doc.styles["Heading 2"].font.size = Pt(14)

    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.space_before = Pt(92)
    r = p.add_run("ESPRESSO DIAL-IN FIELDBOOK\nFOR HOME BARISTAS")
    r.bold = True
    r.font.name = "Aptos Display"
    r.font.size = Pt(26)
    r.font.color.rgb = RGBColor(38, 44, 39)
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r = p.add_run("Compare 4 Shots per Bean, Track Grind, Dose, Yield, Time & Taste, and Save Your Repeatable Recipes")
    r.italic = True
    r.font.size = Pt(12)
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.space_before = Pt(16)
    p.add_run("Editable manuscript transcript · 116 print-page references · US Letter edition")
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(54)
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r = p.add_run("EDITING NOTE")
    r.bold = True
    r.font.size = Pt(10)
    p = doc.add_paragraph(
        "This document contains the editable text and field labels in page order. It is a flowing manuscript transcript, "
        "not a page-faithful replacement for the print interior. The complete vector layout, form rules, checkbox geometry, "
        "and diagram construction are maintained in build_book.py; edit that source and regenerate the PDF when changing print design."
    )
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.left_indent = Inches(0.65)
    p.paragraph_format.right_indent = Inches(0.65)
    doc.add_page_break()

    for index, page in enumerate(pdf, 1):
        if index > 1:
            doc.add_page_break()
        text = page.get_text("text", sort=True)
        lines = [line.rstrip() for line in text.splitlines()]
        # Remove only empty extracted lines; all actual text and field labels remain.
        lines = [line for line in lines if line.strip()]
        title = ""
        if index == 1:
            title = "Title page"
        elif index == 2:
            title = "Copyright & use note"
        else:
            title = next((s.strip() for s in lines if s.strip() and len(s.strip()) > 4), "Page content")
            # Find the largest likely page heading without changing or dropping text.
            blocks = page.get_text("dict", sort=True)["blocks"]
            candidates = []
            for b in blocks:
                if "lines" not in b:
                    continue
                for ln in b["lines"]:
                    for sp in ln["spans"]:
                        t = sp.get("text", "").strip()
                        if t and sp.get("size", 0) >= 15 and t not in ("ESPRESSO  /  FIELDWORK",):
                            candidates.append((sp.get("size", 0), t))
            if candidates:
                title = max(candidates, key=lambda x: x[0])[1]
        heading = doc.add_paragraph(style="Heading 2")
        heading.paragraph_format.keep_with_next = True
        heading.add_run(f"PRINT PAGE {index:03d}  ·  {title}")
        for line in lines:
            p = doc.add_paragraph(line)
            p.paragraph_format.keep_together = True
            p.paragraph_format.widow_control = True
    doc.core_properties.title = "Espresso Dial-In Fieldbook for Home Baristas — Editable Manuscript"
    doc.core_properties.subject = "Page-referenced editable text transcript; see build_book.py for print layout source"
    doc.core_properties.author = "Parth Gosara"
    doc.save(OUT)
    print(f"Wrote {OUT} from {len(pdf)} print pages")


if __name__ == "__main__":
    main()
