import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import RecipeForm from '@/app/recipes/_components/recipe-form';
import '@testing-library/jest-dom';

// Mock the fetch API
const mockFetch = jest.fn();

beforeAll(() => {
  // @ts-ignore
  global.fetch = mockFetch;
});

beforeEach(() => {
  mockFetch.mockClear();
});

describe('RecipeForm Component', () => {
  it('renders form inputs and button', () => {
    render(<RecipeForm />);

    expect(screen.getByLabelText(/Recipe Title/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Ingredients/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Instructions/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Submit Recipe/i })).toBeInTheDocument();
  });

  it('submits the form and resets inputs on successful submission', async () => {
    // Setup mock fetch to resolve with ok response
    mockFetch.mockResolvedValueOnce({ ok: true });

    render(<RecipeForm />);

    const titleInput = screen.getByLabelText(/Recipe Title/i);
    const ingredientsInput = screen.getByLabelText(/Ingredients/i);
    const instructionsInput = screen.getByLabelText(/Instructions/i);
    const submitButton = screen.getByRole('button', { name: /Submit Recipe/i });

    // Fill in inputs
    fireEvent.change(titleInput, { target: { value: 'Chocolate Cake' } });
    fireEvent.change(ingredientsInput, { target: { value: 'Flour, Sugar, Cocoa' } });
    fireEvent.change(instructionsInput, { target: { value: 'Mix and bake' } });

    // Submit the form
    fireEvent.click(submitButton);

    // Button should display 'Submitting...'
    expect(screen.getByRole('button')).toHaveTextContent('Submitting...');

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    // Validate fetch was called with correct parameters
    expect(mockFetch).toHaveBeenCalledWith('/api/recipes', expect.objectContaining({
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Chocolate Cake',
        ingredients: 'Flour, Sugar, Cocoa',
        instructions: 'Mix and bake'
      })
    }));

    // After submission, inputs should be cleared
    await waitFor(() => {
      expect(titleInput).toHaveValue('');
      expect(ingredientsInput).toHaveValue('');
      expect(instructionsInput).toHaveValue('');
    });
  });

  it('handles submission failure gracefully', async () => {
    // Setup mock fetch to resolve with not ok response
    mockFetch.mockResolvedValueOnce({ ok: false });

    // Spy on console.error
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    render(<RecipeForm />);

    const titleInput = screen.getByLabelText(/Recipe Title/i);
    const ingredientsInput = screen.getByLabelText(/Ingredients/i);
    const instructionsInput = screen.getByLabelText(/Instructions/i);
    const submitButton = screen.getByRole('button', { name: /Submit Recipe/i });

    // Fill in inputs
    fireEvent.change(titleInput, { target: { value: 'Pancakes' } });
    fireEvent.change(ingredientsInput, { target: { value: 'Flour, Eggs, Milk' } });
    fireEvent.change(instructionsInput, { target: { value: 'Mix and fry' } });
    
    // Submit the form
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    // Expect error log on failed submission
    expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to submit recipe');

    consoleErrorSpy.mockRestore();
  });
});
