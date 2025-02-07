import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

// This test simulates creating a new recipe via the RecipeForm on the RecipesPage
// and verifies that the new recipe appears within the RecipeList on the same page.

import RecipesPage from '@/app/recipes/page';

describe('RecipesPage - Recipe Creation Integration', () => {
  it('creates a new recipe and displays it on the page', async () => {
    // Render the RecipesPage. Assuming the page handles internal state updates
    // when a recipe is created via its RecipeForm component.
    const pageContent = await RecipesPage();
    render(pageContent);

    // Initially, the page should show no recipes
    expect(screen.getByText('No recipes found.')).toBeInTheDocument();

    // Fill in the recipe creation form
    const nameInput = screen.getByPlaceholderText('Enter recipe name');
    const descriptionInput = screen.getByPlaceholderText('Enter description');
    fireEvent.change(nameInput, { target: { value: 'Pancakes' } });
    fireEvent.change(descriptionInput, { target: { value: 'Fluffy pancakes with syrup' } });

    // Submit the form
    const submitButton = screen.getByRole('button', { name: /Create Recipe/i });
    fireEvent.click(submitButton);

    // Wait for the newly created recipe to appear in the list
    await waitFor(() => {
      expect(screen.getByText('Pancakes')).toBeInTheDocument();
      expect(screen.getByText('Fluffy pancakes with syrup')).toBeInTheDocument();
    });
  });
});