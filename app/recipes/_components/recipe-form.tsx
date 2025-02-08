"use client"

import React, { useState, FormEvent } from "react"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface RecipeFormProps {
  onAddRecipe: (recipe: { title: string; instructions: string }) => void
}

export default function RecipeForm({ onAddRecipe }: RecipeFormProps) {
  const [title, setTitle] = useState("")
  const [instructions, setInstructions] = useState("")

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!title.trim() || !instructions.trim()) return
    
    onAddRecipe({
      title: title.trim(),
      instructions: instructions.trim()
    })

    // Clear the inputs after submission
    setTitle("")
    setInstructions("")
  }

  return (
    <div className={cn("p-4")}>
      <h2 className={cn("text-lg font-semibold mb-4")}>Add a New Recipe</h2>

      <form onSubmit={handleSubmit} className={cn("space-y-4")}>
        <div className={cn("flex flex-col")}>
          <label className="mb-1 font-medium">Title</label>
          <Input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter recipe title"
            className={cn("border rounded")}
          />
        </div>

        <div className={cn("flex flex-col")}>
          <label className="mb-1 font-medium">Instructions</label>
          <Textarea
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            placeholder="Enter recipe instructions"
            className={cn("border rounded")}
          />
        </div>

        <div>
          <Button type="submit" className={cn("bg-primary text-primary-foreground")}>
            Add Recipe
          </Button>
        </div>
      </form>
    </div>
  )
}
