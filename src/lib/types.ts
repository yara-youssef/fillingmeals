export interface Recipe {
  id: string
  title: string
  category: string
  servings: string
  time: string
  intro: string
  ingredients: string[]
  method: string
  tip: string
  source: 'book' | 'mine'
}
