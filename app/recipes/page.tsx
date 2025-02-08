"use server"

import RecipeCreator from "./_components/recipe-creator"

export default function RecipesPage() {
  return (
    <div className="p-4">
      <h1 className="text-3xl font-bold mb-4">My Recipes</h1>
      <RecipeCreator />
    </div>
  );
}
