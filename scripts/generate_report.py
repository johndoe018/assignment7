"""Render docs/REPORT.md as the required single-page A4 PDF."""
from html import escape
from pathlib import Path
import re

from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle

ROOT = Path(__file__).resolve().parents[1]
FONT_ROOT = Path('/usr/share/fonts/truetype/dejavu')
pdfmetrics.registerFont(TTFont('DejaVu', str(FONT_ROOT / 'DejaVuSans.ttf')))
pdfmetrics.registerFont(TTFont('DejaVu-Bold', str(FONT_ROOT / 'DejaVuSans-Bold.ttf')))
pdfmetrics.registerFontFamily('DejaVu', normal='DejaVu', bold='DejaVu-Bold')

GREEN = colors.HexColor('#174d3e')
TEXT = colors.HexColor('#40523c')
body = ParagraphStyle('body', fontName='DejaVu', fontSize=9.0, leading=12.6, textColor=TEXT, spaceAfter=7, alignment=TA_LEFT)
heading = ParagraphStyle('heading', parent=body, fontName='DejaVu-Bold', fontSize=10.0, leading=13, textColor=GREEN, spaceBefore=5, spaceAfter=6)
cell = ParagraphStyle('cell', parent=body, fontSize=8.1, leading=11.2, spaceAfter=0)
quote = ParagraphStyle('quote', parent=body, fontSize=8.6, leading=12, leftIndent=10, borderColor=colors.HexColor('#bfd2a7'), borderWidth=1, borderPadding=8, spaceBefore=3, spaceAfter=10)


def inline(text):
    return re.sub(r'\*\*(.*?)\*\*', r'<b>\1</b>', escape(text))


def decorate(canvas, doc):
    width, height = A4
    canvas.setFillColor(GREEN)
    canvas.rect(0, height - 112, width, 112, fill=1, stroke=0)
    canvas.setFillColor(colors.HexColor('#d9eeab'))
    canvas.setFont('DejaVu-Bold', 8)
    canvas.drawString(43, height - 29, 'LEVELLY  /  PROJECT REPORT')
    canvas.setFillColor(colors.white)
    canvas.setFont('DejaVu-Bold', 20)
    canvas.drawString(42, height - 60, 'AI for Differentiated Learning')
    canvas.setFont('DejaVu', 9)
    canvas.drawString(43, height - 83, 'Maizhanov Zhalgas  ·  Topic 8  ·  Educational Technology & AI')
    canvas.setStrokeColor(colors.HexColor('#dce5d2'))
    canvas.line(43, 35, width - 43, 35)
    canvas.setFont('DejaVu', 7)
    canvas.setFillColor(colors.HexColor('#62715b'))
    canvas.drawString(43, 22, 'One core relationship. Three learning paths. Verified mathematical guidance.')
    canvas.drawRightString(width - 43, 22, str(doc.page))


lines = (ROOT / 'docs/REPORT.md').read_text().splitlines()
story = []
index = next(i for i, line in enumerate(lines) if line.startswith('## '))
while index < len(lines):
    line = lines[index].strip()
    if not line:
        index += 1
        continue
    if line.startswith('## '):
        story.append(Paragraph(inline(line[3:]), heading))
        index += 1
    elif line.startswith('|'):
        rows = []
        while index < len(lines) and lines[index].strip().startswith('|'):
            row = [value.strip() for value in lines[index].strip().strip('|').split('|')]
            if not all(re.fullmatch(r'[-: ]+', value) for value in row):
                rows.append([Paragraph(inline(value), cell) for value in row])
            index += 1
        table = Table(rows, colWidths=[65, 173, A4[0] - 86 - 238], hAlign='LEFT')
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#e7efdd')),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.HexColor('#f6f8f2'), colors.white]),
            ('LINEBELOW', (0, 0), (-1, 0), .5, colors.HexColor('#d0ddc3')),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('LEFTPADDING', (0, 0), (-1, -1), 8),
            ('RIGHTPADDING', (0, 0), (-1, -1), 8),
            ('TOPPADDING', (0, 0), (-1, -1), 7),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 7),
        ]))
        story.extend([table, Spacer(1, 7)])
    else:
        is_quote = line.startswith('>')
        chunk = []
        while index < len(lines) and lines[index].strip() and not lines[index].startswith(('## ', '|')):
            chunk.append(lines[index].lstrip('> ').strip() if is_quote else lines[index].strip())
            index += 1
        story.append(Paragraph(inline(' '.join(chunk)), quote if is_quote else body))

output = ROOT / 'public/report.pdf'
document = SimpleDocTemplate(str(output), pagesize=A4, rightMargin=43, leftMargin=43, topMargin=127, bottomMargin=45, title='Levelly — AI for Differentiated Learning', author='Maizhanov Zhalgas', subject='Topic 8: AI Math Differentiator')
document.build(story, onFirstPage=decorate, onLaterPages=decorate)
print(output)
