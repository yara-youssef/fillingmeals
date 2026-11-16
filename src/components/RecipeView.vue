<script setup lang="ts">
import type { Recipe } from '@/lib/types'
defineProps<{ recipe: Recipe }>()
const emit = defineEmits<{ edit: []; remove: []; back: [] }>()
</script>

<template>
  <article class="recipe">
    <button class="link" @click="emit('back')">← All recipes</button>
    <p class="eyebrow">{{ recipe.category }}<span v-if="recipe.source === 'mine'"> · My recipe</span></p>
    <h2>{{ recipe.title }}</h2>
    <p class="meta">
      <span v-if="recipe.servings">Serves {{ recipe.servings }}</span>
      <span v-if="recipe.time">{{ recipe.time }}</span>
    </p>
    <p v-if="recipe.intro" class="intro">{{ recipe.intro }}</p>
    <div class="cols">
      <section v-if="recipe.ingredients.length">
        <h3>Ingredients</h3>
        <ul class="ings"><li v-for="(i, k) in recipe.ingredients" :key="k">{{ i }}</li></ul>
      </section>
      <section v-if="recipe.method">
        <h3>Method</h3>
        <p v-for="(p, k) in recipe.method.split(/\n+/)" :key="k">{{ p }}</p>
      </section>
    </div>
    <aside v-if="recipe.tip" class="tip"><strong>Tip</strong> {{ recipe.tip }}</aside>
    <div class="actions">
      <button class="ghost" @click="emit('edit')">Edit</button>
      <button class="ghost danger" @click="emit('remove')">Delete</button>
    </div>
  </article>
</template>
