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
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Recipe Creator</h1>

      <form onSubmit={handleSubmit} className="space-y-6 mb-8">
        <div className="flex flex-col">
          <label className="mb-1 text-sm font-medium text-gray-700">Recipe Title</label>
          <Input
            type="text"
            placeholder="Enter recipe title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        <div className="flex flex-col">
          <label className="mb-1 text-sm font-medium text-gray-700">Ingredients</label>
          <Textarea
            placeholder="List ingredients, separated by commas"
            value={ingredients}
            onChange={(e) => setIngredients(e.target.value)}
            rows={3}
          />
        </div>

        <div className="flex flex-col">
          <label className="mb-1 text-sm font-medium text-gray-700">Instructions</label>
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
          <p className="text-gray-500">No recipes added yet.</p>
        ) : (
          <div className="space-y-4">
            {recipes.map((recipe) => (
              <div key={recipe.id} className="border p-4 rounded-md hover:shadow-lg transition-shadow duration-200">
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
