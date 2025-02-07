"use client"

interface RecipeListProps {
  initialData: any[]
}

export default function RecipeList({ initialData }: RecipeListProps) {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Recipe List</h2>

      <div>
        {initialData.length === 0 ? (
          <p>No recipes found.</p>
        ) : (
          initialData.map((recipe, index) => (
            <div key={index} className="border p-2 rounded mb-2">
              <p className="font-medium">{recipe.name || "Unnamed Recipe"}</p>
              {recipe.description && <p className="text-sm text-muted mt-1">{recipe.description}</p>}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
