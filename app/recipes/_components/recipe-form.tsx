"use client"

import React, { useState } from "react"

export default function RecipeForm() {
  const [recipeName, setRecipeName] = useState("")
  const [description, setDescription] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      const res = await fetch("/api/recipes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: recipeName, description })
      })
      if (res.ok) {
        setRecipeName("")
        setDescription("")
      } else {
        console.error("Error submitting recipe")
      }
    } catch (error) {
      console.error("Error submitting recipe", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="mb-8">
      <h2 className="text-xl font-semibold mb-4">New Recipe</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex flex-col">
          <label className="mb-1">Recipe Name</label>
          <input
            type="text"
            placeholder="Enter recipe name"
            className="border p-2 rounded"
            value={recipeName}
            onChange={(e) => setRecipeName(e.target.value)}
          />
        </div>

        <div className="flex flex-col">
          <label className="mb-1">Description</label>
          <textarea
            placeholder="Enter description"
            className="border p-2 rounded"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="bg-primary text-primary-foreground px-4 py-2 rounded"
        >
          {isSubmitting ? "Submitting..." : "Create Recipe"}
        </button>
      </form>
    </div>
  )
}
