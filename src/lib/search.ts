import type { Recipe } from './types'

export const norm = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[’']/g, "'")

export interface Hit {
  recipe: Recipe
  score: number
  matchedIngredients: string[]
}

/** Every word in the query must appear somewhere in the recipe. Title and ingredient matches rank higher. */
export function search(recipes: Recipe[], query: string): Hit[] {
  const terms = norm(query).split(/[\s,]+/).filter(Boolean)
  const hits: Hit[] = []
  for (const recipe of recipes) {
    const title = norm(recipe.title)
    const ings = recipe.ingredients.map(norm)
    const rest = norm([recipe.category, recipe.intro, recipe.method, recipe.tip].join(' '))
    let score = 0
    let ok = true
    for (const t of terms) {
      const inTitle = title.includes(t)
      const inIng = ings.some((i) => i.includes(t))
      if (inTitle) score += 10
      if (inIng) score += 5
      if (!inTitle && !inIng) {
        if (rest.includes(t)) score += 1
        else {
          ok = false
          break
        }
      }
    }
    if (!ok) continue
    const matchedIngredients = terms.length
      ? recipe.ingredients.filter((_, k) => terms.some((t) => ings[k]!.includes(t)))
      : []
    hits.push({ recipe, score, matchedIngredients })
  }
  if (terms.length) hits.sort((a, b) => b.score - a.score || a.recipe.title.localeCompare(b.recipe.title))
  return hits
}
