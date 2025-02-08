import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";

import RecipesPage from "@/app/recipes/page";

describe("RecipesPage Component", () => {
  it("renders the recipes page with header and recipe creator", () => {
    render(<RecipesPage />);
    
    // Check that the header is rendered
    const header = screen.getByText(/My Recipes/i);
    expect(header).toBeInTheDocument();

    // Check that the RecipeCreator component is rendered by looking for its input placeholder
    const titleInput = screen.getByPlaceholderText(/Enter recipe title/i);
    expect(titleInput).toBeInTheDocument();
  });
});
