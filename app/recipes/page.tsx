"use client"

import React, { useState } from "react"
import RecipeForm from "./_components/recipe-form"

interface Recipe {
  title: string
  instructions: string
}

export default function RecipePage() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);

  const handleAddRecipe = (recipe: Recipe) => {
    setRecipes(prev => [...prev, recipe]);
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Recipes</h1>

      <RecipeForm onAddRecipe={handleAddRecipe} />

      <div className="mt-6">
        {recipes.length === 0 && <div>No recipes yet.</div>}
        {recipes.map((recipe, index) => (
          <div key={index} className="border border-gray-200 rounded p-4 mb-4">
            <h2 className="text-xl font-semibold">{recipe.title}</h2>
            <p className="mt-2 text-gray-700">{recipe.instructions}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
