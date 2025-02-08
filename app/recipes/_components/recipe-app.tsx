"use client"

import { useState, FormEvent } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

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
    <div className="p-4 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold text-center mb-6">Recipe App</h1>

      <div className="bg-card p-6 rounded-lg shadow-md">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Recipe Title"
          />
          <Textarea
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            placeholder="Recipe Instructions"
          />
          <Button type="submit" className="self-end">
            Add Recipe
          </Button>
        </form>
      </div>

      <div className="mt-8">
        <h2 className="text-2xl font-semibold mb-4">Recipes List</h2>
        {recipes.length === 0 ? (
          <div className="text-center text-muted-foreground">
            No recipes available. Create one!
          </div>
        ) : (
          <ul className="space-y-4">
            {recipes.map((recipe) => (
              <li key={recipe.id} className="border rounded-lg p-4 shadow-sm">
                <h3 className="text-xl font-bold mb-2">{recipe.title}</h3>
                <p className="text-base text-foreground">{recipe.instructions}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
