"use server"

import RecipeApp from "@/app/recipes/_components/recipe-app";

export default async function RecipesPage() {
  return (
    <div className="p-4">
      <RecipeApp />
    </div>
  );
}
