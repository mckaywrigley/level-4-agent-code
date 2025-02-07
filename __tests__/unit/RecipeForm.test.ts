import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import RecipeForm from '@/app/recipes/_components/recipe-form';

describe('RecipeForm Component', () => {
  it('renders the form inputs and submit button correctly', () => {
    const mockOnAddRecipe = jest.fn();
    render(<RecipeForm onAddRecipe={mockOnAddRecipe} />);

    // Check for input fields and button
    expect(screen.getByPlaceholderText('Enter recipe title')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('List ingredients here')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Describe preparation steps')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Add Recipe/i })).toBeInTheDocument();
  });

  it('calls onAddRecipe with correct data and clears the form on submit', () => {
    const mockOnAddRecipe = jest.fn();
    render(<RecipeForm onAddRecipe={mockOnAddRecipe} />);

    const titleInput = screen.getByPlaceholderText('Enter recipe title');
    const ingredientsInput = screen.getByPlaceholderText('List ingredients here');
    const instructionsInput = screen.getByPlaceholderText('Describe preparation steps');
    const submitButton = screen.getByRole('button', { name: /Add Recipe/i });

    // Fill out the form
    fireEvent.change(titleInput, { target: { value: 'Test Title' } });
    fireEvent.change(ingredientsInput, { target: { value: 'Test Ingredients' } });
    fireEvent.change(instructionsInput, { target: { value: 'Test Instructions' } });

    // Submit the form
    fireEvent.click(submitButton);

    // Check that onAddRecipe is called with the correct recipe object
    expect(mockOnAddRecipe).toHaveBeenCalledTimes(1);
    expect(mockOnAddRecipe).toHaveBeenCalledWith({
      title: 'Test Title',
      ingredients: 'Test Ingredients',
      instructions: 'Test Instructions'
    });

    // Inputs should be cleared after submit
    expect(titleInput.value).toBe('');
    expect(ingredientsInput.value).toBe('');
    expect(instructionsInput.value).toBe('');
  });
});
