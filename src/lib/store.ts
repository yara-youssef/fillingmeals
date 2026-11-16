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

const FAV_KEY = 'filling-meals-favorites-v1'

function loadFavorites(): string[] {
  try {
    const data = JSON.parse(localStorage.getItem(FAV_KEY) ?? '[]')
    return Array.isArray(data) ? data.filter((x) => typeof x === 'string') : []
  } catch {
    return []
  }
}

export const store = reactive({ recipes: load(), favorites: loadFavorites(), saveError: '' })

// Favorites are kept as a separate list of recipe ids, so re-importing the book keeps them.
watch(
  () => store.favorites,
  (ids) => {
    try {
      localStorage.setItem(FAV_KEY, JSON.stringify(ids))
    } catch {
      store.saveError = 'Could not save favorites to this browser.'
    }
  },
  { deep: true },
)

export const isFavorite = (id: string) => store.favorites.includes(id)

export function toggleFavorite(id: string) {
  store.favorites = isFavorite(id) ? store.favorites.filter((x) => x !== id) : [...store.favorites, id]
}

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
  store.favorites = store.favorites.filter((x) => x !== id)
}

/** Replace the book recipes, keeping the user's own ones. */
export function setBookRecipes(book: Recipe[]) {
  // Keep any photo links you added to book recipes when the book is imported again.
  const images = new Map(store.recipes.filter((r) => r.source === 'book' && r.image).map((r) => [r.id, r.image]))
  const merged = book.map((r) => (images.has(r.id) ? { ...r, image: images.get(r.id) } : r))
  store.recipes = [...store.recipes.filter((r) => r.source !== 'book'), ...merged]
}

/** Only allow web links (http/https) as picture sources. */
export function cleanImageUrl(url: unknown): string {
  if (typeof url !== 'string') return ''
  const u = url.trim()
  try {
    const parsed = new URL(u)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? u : ''
  } catch {
    return ''
  }
}

export function exportJson(): string {
  return JSON.stringify({ app: 'filling-meals', version: 1, recipes: store.recipes, favorites: store.favorites }, null, 2)
}

export function importJson(text: string): number {
  const data = JSON.parse(text)
  const list: unknown = Array.isArray(data) ? data : data?.recipes
  if (!Array.isArray(list)) throw new Error('This file does not contain recipes.')
  if (Array.isArray(data?.favorites)) {
    const ids = (data.favorites as unknown[]).filter((x): x is string => typeof x === 'string')
    store.favorites = [...new Set([...store.favorites, ...ids])]
  }
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
      image: cleanImageUrl(x.image) || undefined,
      source: x.source === 'book' ? 'book' : 'mine',
    })
    n++
  }
  return n
}
