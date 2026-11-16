// Turn a PDF (loaded with pdf.js) into plain text lines, page by page.
// Works in both the browser and Node, as long as the caller passes the pdf.js document.

interface TextItemLike {
  str: string
  transform: number[]
  width: number
  hasEOL?: boolean
}

interface PageLike {
  getTextContent(): Promise<{ items: unknown[] }>
}

interface DocLike {
  numPages: number
  getPage(n: number): Promise<PageLike>
}

export async function extractLines(
  doc: DocLike,
  onProgress?: (done: number, total: number) => void,
): Promise<string[]> {
  const out: string[] = []
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p)
    const content = await page.getTextContent()
    const items = (content.items as TextItemLike[]).filter((i) => typeof i.str === 'string')

    // Group items into rows by their baseline (y), tolerant to tiny offsets.
    const rows: { y: number; items: TextItemLike[] }[] = []
    for (const it of items) {
      if (!it.str.trim()) continue
      const y = it.transform[5] ?? 0
      let row = rows.find((r) => Math.abs(r.y - y) < 2.5)
      if (!row) {
        row = { y, items: [] }
        rows.push(row)
      }
      row.items.push(it)
    }
    rows.sort((a, b) => b.y - a.y)
    for (const row of rows) {
      row.items.sort((a, b) => (a.transform[4] ?? 0) - (b.transform[4] ?? 0))
      let line = ''
      let lastEnd: number | null = null
      for (const it of row.items) {
        const x = it.transform[4] ?? 0
        if (lastEnd !== null && x - lastEnd > 1 && !line.endsWith(' ') && !it.str.startsWith(' ')) {
          line += ' '
        }
        line += it.str
        lastEnd = x + it.width
      }
      out.push(line.replace(/\s+/g, ' ').trim())
    }
    out.push('') // page break
    onProgress?.(p, doc.numPages)
  }
  return out
}
