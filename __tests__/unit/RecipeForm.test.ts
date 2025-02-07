import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react';
import RecipeForm from '@/app/recipes/_components/recipe-form';


describe('RecipeForm Component', () => {
  it('renders correctly and submits form data', () => {
    const mockOnAddRecipe = jest.fn();
    render(<RecipeForm onAddRecipe={mockOnAddRecipe} />);

    // Get input elements
    const titleInput = screen.getByPlaceholderText('Enter recipe title');
    const ingredientsInput = screen.getByPlaceholderText('List ingredients here');
    const instructionsInput = screen.getByPlaceholderText('Describe preparation steps');
    const submitButton = screen.getByRole('button', { name: /Add Recipe/i });

    // Fill out the form
    fireEvent.change(titleInput, { target: { value: 'Test Recipe' } });
    fireEvent.change(ingredientsInput, { target: { value: 'Ingredient1, Ingredient2' } });
    fireEvent.change(instructionsInput, { target: { value: 'Step 1: Do something' } });

    // Submit the form
    fireEvent.click(submitButton);

    // Check if callback was called with the correct data
    expect(mockOnAddRecipe).toHaveBeenCalledTimes(1);
    expect(mockOnAddRecipe).toHaveBeenCalledWith({
      title: 'Test Recipe',
      ingredients: 'Ingredient1, Ingredient2',
      instructions: 'Step 1: Do something'
    });

    // Ensure fields are reset after form submission
    expect(titleInput.value).toBe('');
    expect(ingredientsInput.value).toBe('');
    expect(instructionsInput.value).toBe('');
  });
});
