"use client"

import { useState } from "react"

interface RecipeAppProps {
  initialRecipes: any[]
}

export default function RecipeApp({ initialRecipes }: RecipeAppProps) {
  const [recipes, setRecipes] = useState(initialRecipes)

  return (
    <div className="flex flex-col gap-4 p-4">
      <h1 className="text-2xl font-bold">Recipe App</h1>
      {recipes.length === 0 ? (
        <div>No recipes available. Create one!</div>
      ) : (
        <ul>
          {recipes.map((recipe, index) => (
            <li key={index}>{recipe.name || `Recipe ${index + 1}`}</li>
          ))}
        </ul>
      )}
      <button className="bg-primary text-primary-foreground px-4 py-2 rounded">
        Create Recipe
      </button>
    </div>
  )
}
