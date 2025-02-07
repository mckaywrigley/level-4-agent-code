"use client"

import React, { useState } from "react"

interface Recipe {
  title: string
  ingredients: string
  instructions: string
}

interface RecipeFormProps {
  onAddRecipe: (recipe: Recipe) => void
}

export default function RecipeForm({ onAddRecipe }: RecipeFormProps) {
  const [title, setTitle] = useState("")
  const [ingredients, setIngredients] = useState("")
  const [instructions, setInstructions] = useState("")

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const newRecipe: Recipe = { title, ingredients, instructions }
    onAddRecipe(newRecipe)
    setTitle("")
    setIngredients("")
    setInstructions("")
  }

  return (
    <div className="p-4">
      <form onSubmit={handleSubmit} className="flex flex-col space-y-4">
        <div>
          <div className="mb-1 text-sm font-medium">Title</div>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full border rounded px-2 py-1"
            placeholder="Enter recipe title"
          />
        </div>
        
        <div>
          <div className="mb-1 text-sm font-medium">Ingredients</div>
          <textarea
            value={ingredients}
            onChange={(e) => setIngredients(e.target.value)}
            className="w-full border rounded px-2 py-1"
            rows={4}
            placeholder="List ingredients here"
          />
        </div>
        
        <div>
          <div className="mb-1 text-sm font-medium">Instructions</div>
          <textarea
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            className="w-full border rounded px-2 py-1"
            rows={6}
            placeholder="Describe preparation steps"
          />
        </div>
        
        <div>
          <button type="submit" className="self-end bg-primary text-primary-foreground px-4 py-2 rounded">
            Add Recipe
          </button>
        </div>
      </form>
    </div>
  )
}
