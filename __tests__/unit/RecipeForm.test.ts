import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import RecipeForm from '@/app/recipes/_components/recipe-form';

// Mock components for Button, Input, and Textarea if they don't render standard input elements
// Assuming they forward ref and props correctly to native elements
// Otherwise, adjust the queries accordingly.

describe('RecipeForm Component', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  test('renders form fields and submit button', () => {
    render(<RecipeForm />);

    expect(screen.getByLabelText('Recipe Title')).toBeInTheDocument();
    expect(screen.getByLabelText('Ingredients')).toBeInTheDocument();
    expect(screen.getByLabelText('Instructions')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /submit recipe/i })).toBeInTheDocument();
  });

  test('submits the form with valid data', async () => {
    // Set up a successful fetch response
    const fakeResponse = { ok: true };
    global.fetch = jest.fn().mockResolvedValue(fakeResponse);

    render(<RecipeForm />);

    const titleInput = screen.getByLabelText('Recipe Title');
    const ingredientsInput = screen.getByLabelText('Ingredients');
    const instructionsInput = screen.getByLabelText('Instructions');
    const submitButton = screen.getByRole('button', { name: /submit recipe/i });

    fireEvent.change(titleInput, { target: { value: 'Test Recipe' } });
    fireEvent.change(ingredientsInput, { target: { value: 'Ingredient1, Ingredient2' } });
    fireEvent.change(instructionsInput, { target: { value: 'Step by step instructions' } });

    fireEvent.click(submitButton);

    // Ensure the button shows submitting state and is disabled
    expect(submitButton).toBeDisabled();

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/recipes', expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Test Recipe',
          ingredients: 'Ingredient1, Ingredient2',
          instructions: 'Step by step instructions'
        })
      }));
    });

    // After successful submission, the inputs should be cleared
    await waitFor(() => {
      expect(screen.getByLabelText('Recipe Title')).toHaveValue('');
      expect(screen.getByLabelText('Ingredients')).toHaveValue('');
      expect(screen.getByLabelText('Instructions')).toHaveValue('');
    });
  });

  test('handles API failure gracefully', async () => {
    // Simulate a failed API call
    const fakeResponse = { ok: false };
    global.fetch = jest.fn().mockResolvedValue(fakeResponse);
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    render(<RecipeForm />);

    const titleInput = screen.getByLabelText('Recipe Title');
    const ingredientsInput = screen.getByLabelText('Ingredients');
    const instructionsInput = screen.getByLabelText('Instructions');
    const submitButton = screen.getByRole('button', { name: /submit recipe/i });

    fireEvent.change(titleInput, { target: { value: 'Test Recipe' } });
    fireEvent.change(ingredientsInput, { target: { value: 'Ingredient1' } });
    fireEvent.change(instructionsInput, { target: { value: 'Some steps' } });

    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to submit recipe');
    });

    consoleErrorSpy.mockRestore();
  });
});
