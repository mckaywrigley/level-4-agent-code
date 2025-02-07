import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

// Since RecipesPage is a server component that uses getRecipesAction, we mock the action
jest.mock('@/actions/db/recipes-actions', () => ({
  getRecipesAction: jest.fn()
}));

import { getRecipesAction } from '@/actions/db/recipes-actions';
import RecipesPage from '@/app/recipes/page';

// Create a wrapper to handle async server component
async function renderPage() {
  const Component = await RecipesPage();
  // Wrap the returned component in a div so we can render it
  return render(<div>{Component}</div>);
}

describe('RecipesPage', () => {
  beforeEach(() => {
    (getRecipesAction as jest.Mock).mockResolvedValue({
      isSuccess: true,
      data: [
        { name: 'Chocolate Cake', description: 'Rich and moist' }
      ]
    });
  });

  it('renders the recipes page with form and list', async () => {
    await waitFor(async () => {
      await renderPage();

      // Check for page heading
      expect(screen.getByText('Recipes')).toBeInTheDocument();

      // Check that the RecipeForm component text is rendered
      expect(screen.getByText('New Recipe')).toBeInTheDocument();

      // Check that the RecipeList component renders the mocked recipe
      expect(screen.getByText('Chocolate Cake')).toBeInTheDocument();
      expect(screen.getByText('Rich and moist')).toBeInTheDocument();
    });
  });
});
