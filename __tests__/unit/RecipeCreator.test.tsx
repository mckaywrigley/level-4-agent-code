import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";

import RecipeCreator from "@/app/recipes/_components/recipe-creator";

describe("RecipeCreator Component", () => {
  it("renders initial state with no recipes", () => {
    render(<RecipeCreator />);
    const noRecipesText = screen.getByText(/No recipes yet\./i);
    expect(noRecipesText).toBeInTheDocument();
  });

  it("adds a new recipe on form submission", () => {
    render(<RecipeCreator />);
    
    const titleInput = screen.getByPlaceholderText(/Enter recipe title/i);
    const descriptionInput = screen.getByPlaceholderText(/Enter recipe description/i);
    const addButton = screen.getByRole("button", { name: /add recipe/i });

    fireEvent.change(titleInput, { target: { value: "Spaghetti" } });
    fireEvent.change(descriptionInput, { target: { value: "Delicious spaghetti recipe" } });
    fireEvent.click(addButton);
    
    // After adding a recipe, the default message should not be visible
    expect(screen.queryByText(/No recipes yet\./i)).not.toBeInTheDocument();
    
    // Check that the new recipe details are displayed
    expect(screen.getByText(/Spaghetti/i)).toBeInTheDocument();
    expect(screen.getByText(/Delicious spaghetti recipe/i)).toBeInTheDocument();
  });
});
