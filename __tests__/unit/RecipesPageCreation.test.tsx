import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock the getRecipesAction to initially return an empty list
jest.mock('@/actions/db/recipes-actions', () => ({
  getRecipesAction: jest.fn()
}));

import { getRecipesAction } from '@/actions/db/recipes-actions';
import RecipesPage from '@/app/recipes/page';

describe('RecipesPage - Recipe Creation Integration', () => {
  beforeEach(() => {
    // Setup the mock to return an empty recipe list
    (getRecipesAction as jest.Mock).mockResolvedValue({ isSuccess: true, data: [] });
  });

  it('allows a user to create a new recipe and see it listed', async () => {
    // Render the page
    const pageContent = await RecipesPage();
    render(pageContent);

    // Ensure that the page renders the creation form and empty state
    expect(screen.getByText('New Recipe')).toBeInTheDocument();
    expect(screen.getByText('No recipes found.')).toBeInTheDocument();

    // Fill in the form inputs
    const nameInput = screen.getByPlaceholderText('Enter recipe name');
    const descriptionInput = screen.getByPlaceholderText('Enter description');
    fireEvent.change(nameInput, { target: { value: 'Omelette' } });
    fireEvent.change(descriptionInput, { target: { value: 'Cheese omelette with herbs' } });

    // Click the submit button
    const submitButton = screen.getByRole('button', { name: /Create Recipe/i });
    fireEvent.click(submitButton);

    // Wait for the new recipe to appear in the list
    await waitFor(() => {
      expect(screen.getByText('Omelette')).toBeInTheDocument();
      expect(screen.getByText('Cheese omelette with herbs')).toBeInTheDocument();
    });
  });
});