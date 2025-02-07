import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import RecipeForm from '@/app/recipes/_components/recipe-form';

// Updated RecipeCreation test to align with the current RecipeForm implementation which handles its own fetch

describe('RecipeForm - Integration with API', () => {
  beforeEach(() => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true
      })
    ) as jest.Mock;
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('submits the form, calls the API, and resets fields', async () => {
    render(<RecipeForm />);

    const nameInput = screen.getByPlaceholderText('Enter recipe name');
    const descriptionInput = screen.getByPlaceholderText('Enter description');
    const submitButton = screen.getByRole('button', { name: /Create Recipe/i });

    // Fill out form fields
    fireEvent.change(nameInput, { target: { value: 'Pancakes' } });
    fireEvent.change(descriptionInput, { target: { value: 'Fluffy pancakes with syrup' } });

    // Submit the form
    fireEvent.click(submitButton);

    // Wait for the fetch call to be made
    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));

    expect(global.fetch).toHaveBeenCalledWith('/api/recipes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Pancakes', description: 'Fluffy pancakes with syrup' })
    });

    // Ensure the fields have been reset
    expect(nameInput).toHaveValue('');
    expect(descriptionInput).toHaveValue('');
  });
});
