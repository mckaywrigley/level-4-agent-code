"use server"

import RecipeForm from "./_components/recipe-form"
import RecipeList from "./_components/recipe-list"
import { getRecipesAction } from "@/actions/db/recipes-actions"

export default async function RecipesPage() {
  const result = await getRecipesAction()
  const recipes = result.isSuccess ? result.data : []

  return (
    <div className="p-4 space-y-6">
      <h1 className="text-3xl font-bold">Recipes</h1>

      <RecipeForm />

      <RecipeList initialData={recipes} />
    </div>
  )
}
