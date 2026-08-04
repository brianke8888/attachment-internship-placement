// pdf.js — server-side PDF report generator (pdfkit)
const PDFDocument = require('pdfkit')

const BRAND = '#059669'
const DARK = '#065f46'
const TEXT = '#111827'
const MUTED = '#6b7280'
const LINE = '#e5e7eb'

function buildPdf(title, subtitle, build, opts = {}) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40, size: 'A4', ...opts })
    const chunks = []
    doc.on('data', (c) => chunks.push(c))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    doc.rect(0, 0, doc.page.width, 10).fill(BRAND)
    doc.y = 50
    doc.fontSize(18).fillColor(DARK).text(title)
    doc.fontSize(10).fillColor(MUTED).text(subtitle, { lineGap: 2 })
    doc.moveDown()

    build(doc)

    doc.end()
  })
}

function sectionTitle(doc, text) {
  doc.moveDown(0.5)
  doc.fontSize(12).fillColor(DARK).text(text)
  doc.moveTo(doc.page.margins.left, doc.y + 2)
    .lineTo(doc.page.width - doc.page.margins.right, doc.y + 2)
    .lineWidth(1).strokeColor(BRAND).stroke()
  doc.moveDown(0.7)
}

function statsGrid(doc, items, cols = 3) {
  const margin = doc.page.margins.left
  const pageWidth = doc.page.width - margin - doc.page.margins.right
  const colWidth = pageWidth / cols
  const cellH = 50
  const startY = doc.y

  items.forEach((item, i) => {
    const col = i % cols
    const row = Math.floor(i / cols)
    const x = margin + col * colWidth
    const y = startY + row * cellH
    doc.fontSize(8).fillColor(MUTED).text(String(item.label), x, y, { width: colWidth - 8 })
    doc.fontSize(15).fillColor(item.color || BRAND).text(String(item.value), x, y + 11, { width: colWidth - 8 })
  })

  doc.y = startY + Math.ceil(items.length / cols) * cellH
}

function drawTable(doc, headers, rows, columnWidths) {
  const margin = doc.page.margins.left
  const right = doc.page.width - doc.page.margins.right
  const pageWidth = right - margin
  let widths = columnWidths || Array(headers.length).fill(1 / headers.length)
  if (widths.every((w) => w <= 1)) widths = widths.map((w) => w * pageWidth)

  const cellText = (cell, i, yPos) => {
    doc.text(String(cell), margin + widths.slice(0, i).reduce((a, b) => a + b, 0) + 4, yPos, {
      width: widths[i] - 8,
      lineGap: 1,
    })
  }

  const rowHeightFor = (cells) => {
    doc.fontSize(8)
    let max = 0
    cells.forEach((cell, i) => {
      const h = doc.heightOfString(String(cell), { width: widths[i] - 8 })
      if (h > max) max = h
    })
    return max + 8
  }

  let y = doc.y

  const drawHeader = () => {
    const hh = rowHeightFor(headers)
    if (y + hh > doc.page.height - doc.page.margins.bottom) {
      doc.addPage()
      y = doc.page.margins.top
    }
    doc.rect(margin, y, pageWidth, hh).fill(BRAND)
    headers.forEach((h, i) => {
      doc.fontSize(8).fillColor('#ffffff')
      cellText(String(h).toUpperCase(), i, y + 4)
    })
    y += hh
  }

  drawHeader()

  rows.forEach((r) => {
    const rh = rowHeightFor(r)
    if (y + rh > doc.page.height - doc.page.margins.bottom) {
      doc.addPage()
      y = doc.page.margins.top
      drawHeader()
    }
    r.forEach((cell, i) => {
      doc.fontSize(8).fillColor(TEXT)
      cellText(cell, i, y + 4)
    })
    y += rh
    doc.moveTo(margin, y).lineTo(right, y).lineWidth(0.4).strokeColor(LINE).stroke()
  })

  doc.y = y
}

module.exports = { buildPdf, sectionTitle, statsGrid, drawTable }
