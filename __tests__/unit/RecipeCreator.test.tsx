import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import RecipeCreator from "@/app/recipes/_components/recipe-creator";


describe("RecipeCreator Component", () => {
  it("adds a new recipe on form submission", () => {
    render(<RecipeCreator />);

    // Initially, the component should display a message that there are no recipes yet.
    expect(screen.getByText("No recipes yet.")).toBeInTheDocument();

    // Fill in the form fields
    const titleInput = screen.getByPlaceholderText("Enter recipe title");
    const descriptionInput = screen.getByPlaceholderText("Enter recipe description");

    fireEvent.change(titleInput, { target: { value: "Spaghetti" } });
    fireEvent.change(descriptionInput, { target: { value: "Delicious spaghetti recipe" } });

    // Click the submit button
    const addButton = screen.getByRole("button", { name: /Add Recipe/i });
    fireEvent.click(addButton);

    // After submission, the "No recipes yet." message should disappear
    expect(screen.queryByText("No recipes yet.")).not.toBeInTheDocument();

    // Use an exact match pattern so that the description text doesn't also match
    expect(screen.getByText(/^Spaghetti$/i)).toBeInTheDocument();
    expect(screen.getByText("Delicious spaghetti recipe")).toBeInTheDocument();
  });
});
