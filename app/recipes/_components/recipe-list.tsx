"use client"

import React from "react"
import { motion } from "framer-motion"

interface RecipeListProps {
  initialData: any[]
}

export default function RecipeList({ initialData }: RecipeListProps) {
  if (!Array.isArray(initialData)) {
    return <div className="text-red-500">Error: Invalid recipe data</div>
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Recipe List</h2>

      <div>
        {initialData.length === 0 ? (
          <p>No recipes found.</n          p>
        ) : (
          initialData.map((recipe, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
              className="border p-2 rounded mb-2"
            >
              <p className="font-medium">
                {recipe.name || "Unnamed Recipe"}
              </p>
              {recipe.description && (
                <p className="text-sm text-muted mt-1">
                  {recipe.description}
                </p>
              )}
            </motion.div>
          ))
        )}
      </div>
    </div>
  )
}
