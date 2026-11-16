import { extractLines } from './pdfLines'
import { parseBook } from './parseBook'
import type { Recipe } from './types'

/** Reads the cookbook PDF entirely in the browser – nothing is uploaded anywhere. */
export async function importBookPdf(file: File, onProgress: (pct: number) => void): Promise<Recipe[]> {
  const pdfjs = await import('pdfjs-dist')
  const workerUrl = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl
  const data = new Uint8Array(await file.arrayBuffer())
  const doc = await pdfjs.getDocument({ data }).promise
  const lines = await extractLines(doc, (d, t) => onProgress(Math.round((d / t) * 100)))
  return parseBook(lines)
}
