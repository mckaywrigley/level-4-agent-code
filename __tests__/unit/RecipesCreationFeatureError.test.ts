import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

import RecipesPage from '@/app/recipes/page';

// This test verifies that the recipe creation form displays a validation error when the recipe name is missing

describe('RecipesPage - Recipe Creation Error Handling', () => {
  it('displays an error when trying to create a recipe without a name', async () => {
    const pageContent = await RecipesPage();
    render(pageContent);

    // Initially, the page should show no recipes
    expect(screen.getByText('No recipes found.')).toBeInTheDocument();

    // Only fill in the description leaving the recipe name empty
    const descriptionInput = screen.getByPlaceholderText('Enter description');
    fireEvent.change(descriptionInput, { target: { value: 'Fluffy pancakes without a name' } });

    // Submit the form
    const submitButton = screen.getByRole('button', { name: /Create Recipe/i });
    fireEvent.click(submitButton);

    // Wait for an error message to appear indicating the recipe name is required
    await waitFor(() => {
      expect(screen.getByText(/Recipe name is required/i)).toBeInTheDocument();
    });
  });
});