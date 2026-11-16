<script setup lang="ts">
import { reactive, computed, ref, watch } from 'vue'
import type { Recipe } from '@/lib/types'
import { newId, cleanImageUrl } from '@/lib/store'

const props = defineProps<{ recipe?: Recipe; categories: string[] }>()
const emit = defineEmits<{ save: [Recipe]; cancel: [] }>()

const f = reactive({
  title: props.recipe?.title ?? '',
  category: props.recipe?.category ?? 'My recipes',
  servings: props.recipe?.servings ?? '',
  time: props.recipe?.time ?? '',
  intro: props.recipe?.intro ?? '',
  ingredients: (props.recipe?.ingredients ?? []).join('\n'),
  method: props.recipe?.method ?? '',
  tip: props.recipe?.tip ?? '',
  image: props.recipe?.image ?? '',
})
const imageOk = computed(() => !f.image.trim() || cleanImageUrl(f.image) !== '')
const previewFailed = ref(false)
watch(() => f.image, () => (previewFailed.value = false))
const valid = computed(() => f.title.trim().length > 0 && imageOk.value)

function submit() {
  if (!valid.value) return
  emit('save', {
    id: props.recipe?.id ?? newId(),
    source: props.recipe?.source ?? 'mine',
    title: f.title.trim(),
    category: f.category.trim() || 'My recipes',
    servings: f.servings.trim(),
    time: f.time.trim(),
    intro: f.intro.trim(),
    ingredients: f.ingredients.split('\n').map((s) => s.trim()).filter(Boolean),
    method: f.method.trim(),
    tip: f.tip.trim(),
    image: cleanImageUrl(f.image) || undefined,
  })
}
</script>

<template>
  <form class="form" @submit.prevent="submit">
    <h2>{{ recipe ? 'Edit recipe' : 'Add a recipe' }}</h2>
    <label>Title <input v-model="f.title" required placeholder="e.g. Crispy tofu rice bowl" /></label>
    <div class="row">
      <label>Category
        <input v-model="f.category" list="cats" />
        <datalist id="cats"><option v-for="c in categories" :key="c" :value="c" /></datalist>
      </label>
      <label>Serves <input v-model="f.servings" inputmode="numeric" placeholder="2" /></label>
      <label>Time <input v-model="f.time" placeholder="Prep: 10 min · Cook: 20 min" /></label>
    </div>
    <label>Picture link <small>(optional – paste the address of an image, starting with https://)</small>
      <input v-model="f.image" type="url" inputmode="url" placeholder="https://…/my-dish.jpg" />
    </label>
    <p v-if="!imageOk" class="field-error">That doesn't look like a web link – it should start with http:// or https://.</p>
    <div v-else-if="f.image.trim()" class="img-preview">
      <img v-if="!previewFailed" :src="f.image.trim()" alt="Picture preview" @error="previewFailed = true" />
      <p v-else class="field-error">Couldn't load a picture from that link. Make sure it points directly to an image (right-click the picture → "Copy image address").</p>
    </div>
    <label>Short description <textarea v-model="f.intro" rows="2" /></label>
    <label>Ingredients <small>(one per line)</small>
      <textarea v-model="f.ingredients" rows="8" placeholder="200g firm tofu&#10;1 tbsp soy sauce" />
    </label>
    <label>Method <textarea v-model="f.method" rows="8" /></label>
    <label>Tip <textarea v-model="f.tip" rows="2" /></label>
    <div class="actions">
      <button type="button" class="ghost" @click="emit('cancel')">Cancel</button>
      <button type="submit" :disabled="!valid">Save recipe</button>
    </div>
  </form>
</template>
