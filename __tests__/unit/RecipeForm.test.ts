import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import RecipeForm from '@/app/recipes/_components/recipe-form';

// The RecipeForm component uses fetch for API calls, so we mock fetch.

describe('RecipeForm Component', () => {
  beforeEach(() => {
    jest.spyOn(global, 'fetch');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders form input fields correctly', () => {
    render(<RecipeForm />);
    const titleInput = screen.getByLabelText(/Recipe Title/i);
    const ingredientsTextarea = screen.getByLabelText(/Ingredients/i);
    const instructionsTextarea = screen.getByLabelText(/Instructions/i);

    expect(titleInput).toBeInTheDocument();
    expect(ingredientsTextarea).toBeInTheDocument();
    expect(instructionsTextarea).toBeInTheDocument();
  });

  it('submits the form and clears inputs on successful submission', async () => {
    // Mocking a successful response
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({ message: 'Recipe created' })
    } as Response);

    render(<RecipeForm />);
    const titleInput = screen.getByLabelText(/Recipe Title/i);
    const ingredientsTextarea = screen.getByLabelText(/Ingredients/i);
    const instructionsTextarea = screen.getByLabelText(/Instructions/i);
    const submitButton = screen.getByRole('button', { name: /submit recipe/i });

    // Fill in form fields
    fireEvent.change(titleInput, { target: { value: 'Test Recipe' } });
    fireEvent.change(ingredientsTextarea, { target: { value: 'Ingredient1, Ingredient2' } });
    fireEvent.change(instructionsTextarea, { target: { value: 'Mix ingredients and bake' } });

    // Submit the form
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith('/api/recipes', expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Test Recipe',
          ingredients: 'Ingredient1, Ingredient2',
          instructions: 'Mix ingredients and bake'
        })
      }));
    });

    // After submission, inputs should be cleared
    await waitFor(() => {
      expect((titleInput as HTMLInputElement).value).toBe('');
      expect((ingredientsTextarea as HTMLTextAreaElement).value).toBe('');
      expect((instructionsTextarea as HTMLTextAreaElement).value).toBe('');
    });
  });

  it('handles fetch errors gracefully', async () => {
    // Simulate a fetch error
    jest.spyOn(global, 'fetch').mockRejectedValueOnce(new Error('Network Error'));
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    render(<RecipeForm />);
    const titleInput = screen.getByLabelText(/Recipe Title/i);
    const ingredientsTextarea = screen.getByLabelText(/Ingredients/i);
    const instructionsTextarea = screen.getByLabelText(/Instructions/i);
    const submitButton = screen.getByRole('button', { name: /submit recipe/i });

    fireEvent.change(titleInput, { target: { value: 'Test Recipe' } });
    fireEvent.change(ingredientsTextarea, { target: { value: 'Ingredient1, Ingredient2' } });
    fireEvent.change(instructionsTextarea, { target: { value: 'Mix ingredients and bake' } });

    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Error submitting recipe:'), expect.any(Error));
    });

    consoleSpy.mockRestore();
  });
});
