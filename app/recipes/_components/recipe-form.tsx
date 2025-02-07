"use client"

export default function RecipeForm() {
  return (
    <div className="mb-8">
      <h2 className="text-xl font-semibold mb-4">New Recipe</h2>

      <form className="space-y-4">
        <div className="flex flex-col">
          <label className="mb-1">Recipe Name</label>
          <input
            type="text"
            placeholder="Enter recipe name"
            className="border p-2 rounded"
          />
        </div>

        <div className="flex flex-col">
          <label className="mb-1">Description</label>
          <textarea
            placeholder="Enter description"
            className="border p-2 rounded"
          />
        </div>

        <button
          type="submit"
          className="bg-primary text-primary-foreground px-4 py-2 rounded"
        >
          Create Recipe
        </button>
      </form>
    </div>
  )
}
