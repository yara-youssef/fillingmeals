<script setup lang="ts">
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'
import { store, upsert, remove, setBookRecipes, exportJson, importJson, isFavorite, toggleFavorite } from '@/lib/store'
import { search } from '@/lib/search'
import type { Recipe } from '@/lib/types'
import RecipeForm from '@/components/RecipeForm.vue'
import RecipeView from '@/components/RecipeView.vue'
import logoUrl from '@/assets/logo.svg'

// --- simple hash routing: #/ , #/r/<id> , #/new , #/edit/<id>
const route = ref(location.hash)
const onHash = () => {
  route.value = location.hash
  window.scrollTo(0, 0)
}
onMounted(() => window.addEventListener('hashchange', onHash))
onUnmounted(() => window.removeEventListener('hashchange', onHash))
const go = (h: string) => (location.hash = h)
const goBack = () => history.back()

const view = computed(() => {
  const h = route.value.replace(/^#\/?/, '')
  if (h === 'new') return { name: 'new' as const }
  const m = h.match(/^(r|edit)\/(.+)$/)
  if (m) {
    const recipe = store.recipes.find((r) => r.id === decodeURIComponent(m[2]!))
    if (recipe) return { name: m[1] === 'r' ? ('recipe' as const) : ('edit' as const), recipe }
  }
  return { name: 'list' as const }
})

// --- search & filter
const query = ref('')
const category = ref('')
const categories = computed(() => {
  const seen = new Set<string>()
  store.recipes.forEach((r) => r.category && seen.add(r.category))
  return [...seen]
})
const FAVORITES = '♥ Favorites'
const hits = computed(() =>
  search(store.recipes, query.value).filter((h) =>
    category.value === FAVORITES ? isFavorite(h.recipe.id) : !category.value || h.recipe.category === category.value,
  ),
)
const hasBook = computed(() => store.recipes.some((r) => r.source === 'book'))

// --- PDF import
const importing = ref(false)
const progress = ref(0)
const message = ref('')
const pdfInput = ref<HTMLInputElement>()
async function onPdf(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  importing.value = true
  message.value = ''
  try {
    const { importBookPdf } = await import('@/lib/importPdf')
    const recipes = await importBookPdf(file, (p) => (progress.value = p))
    if (!recipes.length) throw new Error('No recipes were found in that PDF.')
    setBookRecipes(recipes)
    message.value = `Imported ${recipes.length} recipes from the book.`
  } catch (err) {
    message.value = `Import failed: ${(err as Error).message}`
  } finally {
    importing.value = false
    if (pdfInput.value) pdfInput.value.value = ''
  }
}

// --- backup
const jsonInput = ref<HTMLInputElement>()
function download() {
  const blob = new Blob([exportJson()], { type: 'application/json' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = 'filling-meals-recipes.json'
  a.click()
  URL.revokeObjectURL(a.href)
}
async function onJson(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  try {
    message.value = `Restored ${importJson(await file.text())} recipes.`
  } catch (err) {
    message.value = `Restore failed: ${(err as Error).message}`
  }
  if (jsonInput.value) jsonInput.value.value = ''
}

function save(r: Recipe) {
  upsert(r)
  go(`#/r/${encodeURIComponent(r.id)}`)
}
function del(r: Recipe) {
  if (confirm(`Delete "${r.title}"?`)) {
    remove(r.id)
    go('#/')
  }
}
const brokenImages = reactive(new Set<string>())
const pickTag = (t: string) => (category.value = category.value === t ? '' : t)
</script>

<template>
  <header class="top">
    <a href="#/" class="brand"><img :src="logoUrl" alt="" class="logo" width="30" height="30" /> Filling Meals</a>
    <button @click="go('#/new')">+ Add recipe</button>
  </header>

  <main>
    <p v-if="store.saveError" class="notice error">{{ store.saveError }}</p>

    <RecipeView
      v-if="view.name === 'recipe'"
      :recipe="view.recipe"
      @back="go('#/')"
      @edit="go(`#/edit/${encodeURIComponent(view.recipe.id)}`)"
      @remove="del(view.recipe)"
    />
    <RecipeForm v-else-if="view.name === 'new'" :categories="categories" @save="save" @cancel="go('#/')" />
    <RecipeForm
      v-else-if="view.name === 'edit'"
      :key="view.recipe.id"
      :recipe="view.recipe"
      :categories="categories"
      @save="save"
      @cancel="goBack"
    />

    <template v-else>
      <div class="search">
        <input
          v-model="query"
          type="search"
          placeholder="Search recipes or ingredients – try “tofu” or “chicken spinach”"
          aria-label="Search recipes"
          autofocus
        />
      </div>
      <div v-if="categories.length" class="tags">
        <button class="tag" :class="{ on: !category }" @click="category = ''">All</button>
        <button class="tag fav-tag" :class="{ on: category === FAVORITES }" @click="pickTag(FAVORITES)">
          {{ FAVORITES }} ({{ store.favorites.length }})
        </button>
        <button v-for="c in categories" :key="c" class="tag" :class="{ on: category === c }" @click="pickTag(c)">
          {{ c }}
        </button>
      </div>

      <section v-if="!hasBook" class="notice">
        <h2>Load your cookbook</h2>
        <p>
          Choose your <em>Filling Meals</em> PDF and the app will pull out every recipe. The file is read on
          this device only – it is never uploaded – and the recipes are saved in this browser.
        </p>
        <label class="file" :class="{ busy: importing }">
          <input ref="pdfInput" type="file" accept="application/pdf" :disabled="importing" @change="onPdf" />
          {{ importing ? `Reading the book… ${progress}%` : 'Choose PDF' }}
        </label>
      </section>
      <p v-if="message" class="notice">{{ message }}</p>

      <p class="count" v-if="store.recipes.length">
        {{ hits.length }} {{ hits.length === 1 ? 'recipe' : 'recipes' }}<span v-if="query"> for “{{ query }}”</span>
      </p>
      <ul class="grid">
        <li v-for="h in hits" :key="h.recipe.id" class="cell">
          <button
            class="heart"
            :class="{ on: isFavorite(h.recipe.id) }"
            :aria-pressed="isFavorite(h.recipe.id)"
            :aria-label="isFavorite(h.recipe.id) ? `Remove ${h.recipe.title} from favorites` : `Add ${h.recipe.title} to favorites`"
            @click="toggleFavorite(h.recipe.id)"
          >
            {{ isFavorite(h.recipe.id) ? '♥' : '♡' }}
          </button>
          <a :href="`#/r/${encodeURIComponent(h.recipe.id)}`" class="card" :class="{ 'has-img': h.recipe.image && !brokenImages.has(h.recipe.id) }">
            <img
              v-if="h.recipe.image && !brokenImages.has(h.recipe.id)"
              :src="h.recipe.image"
              alt=""
              class="thumb"
              loading="lazy"
              referrerpolicy="no-referrer"
              @error="brokenImages.add(h.recipe.id)"
            />
            <span class="eyebrow">{{ h.recipe.category }}<span v-if="h.recipe.source === 'mine'"> · Mine</span></span>
            <strong>{{ h.recipe.title }}</strong>
            <span class="meta">
              <span v-if="h.recipe.servings">Serves {{ h.recipe.servings }}</span>
              <span v-if="h.recipe.ingredients.length">{{ h.recipe.ingredients.length }} ingredients</span>
            </span>
            <span v-if="h.matchedIngredients.length" class="matched">
              {{ h.matchedIngredients.slice(0, 3).join(' · ') }}
            </span>
          </a>
        </li>
      </ul>
      <p v-if="store.recipes.length && !hits.length && category === FAVORITES && !query" class="empty">
        No favorites yet. Tap the ♡ on any recipe to save it here.
      </p>
      <p v-else-if="store.recipes.length && !hits.length" class="empty">
        Nothing matches. <a href="#/new">Add a recipe?</a>
      </p>

      <footer class="tools">
        <button class="ghost" :disabled="!store.recipes.length" @click="download">Export backup</button>
        <label class="file ghost">
          <input ref="jsonInput" type="file" accept="application/json,.json" @change="onJson" />Restore backup
        </label>
        <label v-if="hasBook" class="file ghost" :class="{ busy: importing }">
          <input ref="pdfInput" type="file" accept="application/pdf" :disabled="importing" @change="onPdf" />
          {{ importing ? `Reading… ${progress}%` : 'Re-import book PDF' }}
        </label>
      </footer>
    </template>
  </main>
</template>
