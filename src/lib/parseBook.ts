import type { Recipe } from './types'

// Parses the plain-text lines of the "Filling Meals" PDF into recipes.
// Every recipe in the book has a "Serves N | Prep: … | Cook: …" line, which we use as an anchor.

const CHAPTERS = ['Oats', 'Eggs', 'Yogurt', 'Potatoes', 'Salad', 'Soup', 'Veggies', 'Pasta', 'Fish', 'Meat']
const WATERMARK = /OceanofPDF\.com/gi
const SERVES = /^(Serves|Makes)\s+\d+.*\|/i

const isCapsTitle = (s: string) => s.length > 2 && /[A-Z]/.test(s) && s === s.toUpperCase()

function isMethodLine(s: string): boolean {
  // Ingredients start with a quantity or a lowercase word ("a pinch of…", "handful of…").
  if (/^[\d½¼¾⅓a-z]/.test(s)) return /\.$/.test(s) && s.length >= 70
  if (s.length >= 70) return true
  if (/^[A-Z]/.test(s) && (/\.$/.test(s) || s.length >= 60)) return true
  return false
}

function joinParagraphs(lines: string[]): string {
  // Lines are wrapped text; join them back, keeping a paragraph break where a line ended a sentence
  // and the next one starts a new sentence.
  const paras: string[] = []
  let cur = ''
  for (const l of lines) {
    if (!l) {
      if (cur) paras.push(cur)
      cur = ''
      continue
    }
    cur = cur ? `${cur} ${l}` : l
    if (/[.!?)]$/.test(l) && l.length < 62) {
      paras.push(cur)
      cur = ''
    }
  }
  if (cur) paras.push(cur)
  return paras
    .map((p) => p.replace(/(\w)- (\w)/g, (m, a, b) => (/[a-z]/.test(b) ? `${a}-${b}` : m)).trim())
    .filter(Boolean)
    .join('\n\n')
}

function titleCase(s: string): string {
  return s
    .toLowerCase()
    .replace(/(^|[\s(\-–])([a-z])/g, (_m, p: string, c: string) => p + c.toUpperCase())
}

export function parseBook(rawLines: string[]): Recipe[] {
  // The PDF's font maps the "ff"/"ffi" ligatures to a NUL character ("di\0erent", "mu\0ns").
  const lines = rawLines.map((l) =>
    l.replace(WATERMARK, '').replace(/\u0000(?=n)/g, 'ffi').replace(/\u0000/g, 'ff').trim(),
  )
  const recipes: Recipe[] = []

  // Chapter boundaries: each chapter has a "RECIPE LIST" page.
  const chapterStarts = lines.flatMap((l, i) => (l === 'RECIPE LIST' ? [i] : []))
  const chapterAt = (i: number) => {
    let c = -1
    chapterStarts.forEach((s, k) => {
      if (s < i) c = k
    })
    return CHAPTERS[c] ?? 'Other'
  }

  const anchors = lines.flatMap((l, i) => (SERVES.test(l) ? [i] : []))
  for (const a of anchors) {
    // Walk back to the title: contiguous non-empty lines above the anchor.
    let s = a - 1
    while (s > 0 && lines[s - 1] !== '') s--
    const header = lines.slice(s, a)
    const titleLines: string[] = []
    while (header.length && isCapsTitle(header[0]!)) titleLines.push(header.shift()!)
    if (!titleLines.length) continue
    const intro = joinParagraphs(header)

    // Ingredients until the first sentence-like line.
    let j = a + 1
    const ingredients: string[] = []
    while (j < lines.length && (lines[j] === '' || !isMethodLine(lines[j]!))) {
      if (lines[j]) ingredients.push(lines[j]!)
      j++
      if (ingredients.length > 40) break
    }

    // Method until Top Tip or the photo caption / next recipe.
    const method: string[] = []
    const nextAnchor = anchors.find((x) => x > a) ?? lines.length
    const nextChapter = chapterStarts.find((x) => x > a) ?? lines.length
    while (j < nextAnchor && !/^Top Tip:/i.test(lines[j]!)) {
      // Last recipe of a chapter: don't run on into the next chapter's introduction.
      if (
        lines[j] === '' &&
        nextChapter < nextAnchor &&
        method.some((m) => /\.$/.test(m)) &&
        !lines.slice(j, nextChapter).some((l) => /^Top Tip:/i.test(l))
      )
        break
      // a page break followed by a short Title-Case line is the photo caption
      if (lines[j] === '' && lines[j + 1] && !isCapsTitle(lines[j + 1]!) && lines[j + 1]!.length < 45 && lines[j + 2] === '' && !/[.:]$/.test(lines[j + 1]!)) break
      method.push(lines[j]!)
      j++
    }
    const tipLines: string[] = []
    if (j < nextAnchor && /^Top Tip:/i.test(lines[j]!)) {
      tipLines.push(lines[j]!.replace(/^Top Tip:\s*/i, ''))
      j++
      while (j < nextAnchor && lines[j] !== '') tipLines.push(lines[j++]!)
    }

    const meta = lines[a]!
    const title = titleCase(titleLines.join(' '))
    recipes.push({
      id: `book-${recipes.length + 1}`,
      title,
      category: chapterAt(a),
      servings: meta.match(/(?:Serves|Makes)\s+(\d+)/i)?.[1] ?? '',
      time: meta.split('|').slice(1).map((x) => x.trim()).join(' · '),
      intro,
      ingredients,
      method: joinParagraphs(method),
      tip: joinParagraphs(tipLines).replace(/\n\n/g, ' '),
      source: 'book',
    })
  }
  return recipes
}
