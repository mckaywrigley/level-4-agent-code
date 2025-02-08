"use client"

import React, { useState, FormEvent } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface Recipe {
  id: number
  title: string
  description: string
}

export default function RecipeCreator() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    const newRecipe: Recipe = {
      id: Date.now(),
      title: title.trim(),
      description: description.trim()
    };
    setRecipes(prev => [newRecipe, ...prev]);
    setTitle("");
    setDescription("");
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Recipe Title</label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter recipe title"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">Description</label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Enter recipe description"
          />
        </div>
        
        <Button type="submit">Add Recipe</Button>
      </form>

      <div className="space-y-4">
        {recipes.length === 0 ? (
          <p className="text-muted-foreground">No recipes yet.</p>
        ) : (
          recipes.map(recipe => (
            <Card key={recipe.id}>
              <CardHeader>
                <CardTitle>{recipe.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p>{recipe.description}</p>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
