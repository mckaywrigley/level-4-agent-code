"use client"

import React, { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

interface RecipeFormProps {}

export default function RecipeForm(props: RecipeFormProps) {
  const [title, setTitle] = useState("")
  const [ingredients, setIngredients] = useState("")
  const [instructions, setInstructions] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      // Call a frontend API endpoint to create the recipe
      const res = await fetch("/api/recipes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, ingredients, instructions })
      })

      if (res.ok) {
        // Clear the form on successful submission
        setTitle("")
        setIngredients("")
        setInstructions("")
      } else {
        console.error("Failed to submit recipe")
      }
    } catch (error) {
      console.error("Error submitting recipe:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="p-4">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="title">Recipe Title</label>
          <Input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter recipe title"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="ingredients">Ingredients</label>
          <Textarea
            id="ingredients"
            value={ingredients}
            onChange={(e) => setIngredients(e.target.value)}
            placeholder="List ingredients"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="instructions">Instructions</label>
          <Textarea
            id="instructions"
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            placeholder="Enter preparation instructions"
          />
        </div>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Submitting..." : "Submit Recipe"}
        </Button>
      </form>
    </div>
  )
}
