# Filling Meals

A small web app for searching and keeping recipes – including the recipes from your own copy of the
*Filling Meals* cookbook.

**Live site:** https://yara-youssef.github.io/fillingmeals/

## How it works

- **Load the book:** on first visit, choose the cookbook PDF. It is read *in your browser* with
  [pdf.js](https://mozilla.github.io/pdf.js/) and split into recipes (title, chapter, servings, time,
  ingredients, method, tip). Nothing is uploaded, and no book content is stored in this repository or
  on the website.
- **Search:** type ingredients or names, e.g. `tofu` or `chicken spinach`. Every word must match;
  title and ingredient matches rank first, and matching ingredients are shown on each card.
  Filter by chapter with the chips.
- **Pictures:** any recipe can have an optional picture link (Edit → "Picture link"). It shows at the top of
  the recipe and as a thumbnail on its card; recipes without one look as before. Picture links on book
  recipes are kept when the book is re-imported.
- **Add your own:** "+ Add recipe". Any recipe (book ones too) can be edited or deleted.
- **Storage:** everything is saved in your browser (`localStorage`), so each device/browser has its own
  copy. Use **Export backup** / **Restore backup** to move recipes between devices.

## Code

- `src/lib/pdfLines.ts` – turns PDF pages into text lines
- `src/lib/parseBook.ts` – splits those lines into recipes (anchored on the "Serves N | Prep …" line)
- `src/lib/search.ts` – search and ranking
- `src/lib/store.ts` – saving, add/edit/delete, backup import/export
- `src/App.vue`, `src/components/` – the UI

## Development

```sh
npm install
npm run dev      # local dev server
npm run build    # type-check + production build into dist/
```

Pushing to `main` deploys to GitHub Pages via `.github/workflows/deploy.yml`
(repository Settings → Pages → Source must be **GitHub Actions**).
