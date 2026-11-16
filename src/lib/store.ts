import { reactive, watch } from 'vue'
import type { Recipe } from './types'

const KEY = 'filling-meals-recipes-v1'

function load(): Recipe[] {
  try {
    const raw = localStorage.getItem(KEY)
    const data = raw ? JSON.parse(raw) : []
    return Array.isArray(data) ? data : []
  } catch {
    return []
  }
}

export const store = reactive({ recipes: load(), saveError: '' })

watch(
  () => store.recipes,
  (recipes) => {
    try {
      localStorage.setItem(KEY, JSON.stringify(recipes))
      store.saveError = ''
    } catch {
      store.saveError = 'Could not save to this browser (storage full or blocked). Export a backup to keep your changes.'
    }
  },
  { deep: true },
)

export const newId = () => `mine-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`

export function upsert(r: Recipe) {
  const i = store.recipes.findIndex((x) => x.id === r.id)
  if (i >= 0) store.recipes[i] = r
  else store.recipes.unshift(r)
}

export function remove(id: string) {
  store.recipes = store.recipes.filter((r) => r.id !== id)
}

/** Replace the book recipes, keeping the user's own ones. */
export function setBookRecipes(book: Recipe[]) {
  store.recipes = [...store.recipes.filter((r) => r.source !== 'book'), ...book]
}

export function exportJson(): string {
  return JSON.stringify({ app: 'filling-meals', version: 1, recipes: store.recipes }, null, 2)
}

export function importJson(text: string): number {
  const data = JSON.parse(text)
  const list: unknown = Array.isArray(data) ? data : data?.recipes
  if (!Array.isArray(list)) throw new Error('This file does not contain recipes.')
  let n = 0
  for (const x of list as Partial<Recipe>[]) {
    if (!x || typeof x.title !== 'string') continue
    upsert({
      id: typeof x.id === 'string' ? x.id : newId(),
      title: x.title,
      category: x.category ?? '',
      servings: x.servings ?? '',
      time: x.time ?? '',
      intro: x.intro ?? '',
      ingredients: Array.isArray(x.ingredients) ? x.ingredients.map(String) : [],
      method: x.method ?? '',
      tip: x.tip ?? '',
      source: x.source === 'book' ? 'book' : 'mine',
    })
    n++
  }
  return n
}
