import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import RecipeForm from '@/app/recipes/_components/recipe-form';

// Mocking global fetch
const originalFetch = global.fetch;

beforeAll(() => {
  global.fetch = jest.fn();
});

afterAll(() => {
  global.fetch = originalFetch;
});

describe('RecipeForm Component', () => {
  beforeEach(() => {
    // Clear the mock before each test
    (global.fetch as jest.Mock).mockClear();
  });

  it('renders the form with all necessary fields and button', () => {
    render(<RecipeForm />);
    
    // Check for the recipe title input
    expect(screen.getByLabelText('Recipe Title')).toBeInTheDocument();

    // Check for ingredients textarea by placeholder
    expect(screen.getByPlaceholderText('List ingredients')).toBeInTheDocument();

    // Check for instructions textarea by placeholder
    expect(screen.getByPlaceholderText('Enter preparation instructions')).toBeInTheDocument();

    // Check for submit button
    expect(screen.getByRole('button', { name: /Submit Recipe/i })).toBeInTheDocument();
  });

  it('submits the form and clears the inputs', async () => {
    // Setup fetch to resolve with ok status
    (global.fetch as jest.Mock).mockResolvedValue({ ok: true });

    render(<RecipeForm />);

    const titleInput = screen.getByLabelText('Recipe Title');
    const ingredientsTextarea = screen.getByPlaceholderText('List ingredients');
    const instructionsTextarea = screen.getByPlaceholderText('Enter preparation instructions');
    const submitButton = screen.getByRole('button', { name: /Submit Recipe/i });

    // Fill form fields
    fireEvent.change(titleInput, { target: { value: 'Test Recipe' } });
    fireEvent.change(ingredientsTextarea, { target: { value: 'Ingredient 1, Ingredient 2' } });
    fireEvent.change(instructionsTextarea, { target: { value: 'Mix ingredients together' } });

    // Submit the form
    fireEvent.click(submitButton);

    // Waiting for the fetch call
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    // Assert that fetch was called correctly
    expect(global.fetch).toHaveBeenCalledWith('/api/recipes', expect.objectContaining({
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Test Recipe',
        ingredients: 'Ingredient 1, Ingredient 2',
        instructions: 'Mix ingredients together'
      })
    }));

    // Verify that the form has been cleared
    expect(titleInput).toHaveValue('');
    expect(ingredientsTextarea).toHaveValue('');
    expect(instructionsTextarea).toHaveValue('');
  });
});
