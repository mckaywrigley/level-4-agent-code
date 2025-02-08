"use client"

import { useState, FormEvent } from "react"

interface Recipe {
  id: number
  title: string
  instructions: string
}

export default function RecipeApp() {
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [title, setTitle] = useState("")
  const [instructions, setInstructions] = useState("")

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!title.trim() || !instructions.trim()) {
      return
    }
    const newRecipe: Recipe = {
      id: Date.now(),
      title: title.trim(),
      instructions: instructions.trim()
    }
    setRecipes((prev) => [...prev, newRecipe])
    setTitle("")
    setInstructions("")
  }

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Recipe App</h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4 mb-6">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Recipe Title"
          className="border p-2 rounded"
        />
        
        <textarea
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          placeholder="Recipe Instructions"
          className="border p-2 rounded h-24"
        />

        <button type="submit" className="bg-primary text-primary-foreground px-4 py-2 rounded">
          Add Recipe
        </button>
      </form>

      <div>
        <h2 className="text-xl font-semibold mb-2">Recipes List</h2>
        {recipes.length === 0 ? (
          <div>No recipes available. Create one!</div>
        ) : (
          <ul className="space-y-4">
            {recipes.map((recipe) => (
              <li key={recipe.id} className="border p-4 rounded">
                <h3 className="font-bold">{recipe.title}</h3>
                <p>{recipe.instructions}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
