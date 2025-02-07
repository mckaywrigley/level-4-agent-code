import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import RecipeForm from "@/app/recipes/_components/recipe-form";
import "@testing-library/jest-dom";

describe("RecipeForm Component", () => {
  it("renders the form with all required inputs and button", () => {
    const mockOnAddRecipe = jest.fn();
    render(<RecipeForm onAddRecipe={mockOnAddRecipe} />);

    const titleInput = screen.getByPlaceholderText("Enter recipe title");
    const ingredientsInput = screen.getByPlaceholderText("List ingredients here");
    const instructionsInput = screen.getByPlaceholderText("Describe preparation steps");
    const addButton = screen.getByRole("button", { name: "Add Recipe" });

    expect(titleInput).toBeInTheDocument();
    expect(ingredientsInput).toBeInTheDocument();
    expect(instructionsInput).toBeInTheDocument();
    expect(addButton).toBeInTheDocument();
  });

  it("calls onAddRecipe with the correct data and resets the form on submit", () => {
    const mockOnAddRecipe = jest.fn();
    render(<RecipeForm onAddRecipe={mockOnAddRecipe} />);

    const titleInput = screen.getByPlaceholderText("Enter recipe title");
    const ingredientsInput = screen.getByPlaceholderText("List ingredients here");
    const instructionsInput = screen.getByPlaceholderText("Describe preparation steps");
    const addButton = screen.getByRole("button", { name: "Add Recipe" });

    fireEvent.change(titleInput, { target: { value: "Test Recipe" } });
    fireEvent.change(ingredientsInput, { target: { value: "Eggs, Flour" } });
    fireEvent.change(instructionsInput, { target: { value: "Mix and bake." } });

    fireEvent.click(addButton);

    expect(mockOnAddRecipe).toHaveBeenCalledWith({
      title: "Test Recipe",
      ingredients: "Eggs, Flour",
      instructions: "Mix and bake."
    });

    // Check that the form inputs are reset
    expect(titleInput.value).toBe("");
    expect(ingredientsInput.value).toBe("");
    expect(instructionsInput.value).toBe("");
  });
});
