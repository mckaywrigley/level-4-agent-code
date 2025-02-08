"use client"

import React, { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

// Define a Recipe interface
interface Recipe {
  id: string
  title: string
  ingredients: string
  instructions: string
}

export default function RecipesPage() {
  // State for the list of recipes
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  // State for form fields
  const [title, setTitle] = useState("");
  const [ingredients, setIngredients] = useState("");
  const [instructions, setInstructions] = useState("");

  // Handler for form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return; // simple validation
    const newRecipe: Recipe = {
      id: Date.now().toString(),
      title,
      ingredients,
      instructions
    };
    setRecipes(prev => [...prev, newRecipe]);
    // Clear form fields
    setTitle("");
    setIngredients("");
    setInstructions("");
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Recipe Creator</h1>

      <form onSubmit={handleSubmit} className="space-y-4 mb-8">
        <div className="flex flex-col">
          <label className="mb-1 font-medium">Recipe Title</label>
          <Input
            type="text"
            placeholder="Enter recipe title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        <div className="flex flex-col">
          <label className="mb-1 font-medium">Ingredients</label>
          <Textarea
            placeholder="List ingredients, separated by commas"
            value={ingredients}
            onChange={(e) => setIngredients(e.target.value)}
            rows={3}
          />
        </div>

        <div className="flex flex-col">
          <label className="mb-1 font-medium">Instructions</label>
          <Textarea
            placeholder="Enter cooking instructions"
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            rows={4}
          />
        </div>

        <Button type="submit">Add Recipe</Button>
      </form>

      <div>
        <h2 className="text-xl font-bold mb-4">My Recipes</h2>
        {recipes.length === 0 ? (
          <p>No recipes added yet.</p>
        ) : (
          <div className="space-y-4">
            {recipes.map((recipe) => (
              <div key={recipe.id} className="border p-4 rounded-md">
                <h3 className="text-lg font-semibold">{recipe.title}</h3>
                <p><strong>Ingredients:</strong> {recipe.ingredients}</p>
                <p><strong>Instructions:</strong> {recipe.instructions}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
