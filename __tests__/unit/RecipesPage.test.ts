import React from 'react';
import { render, screen } from '@testing-library/react';
import RecipesPage from '@/app/recipes/page';

// Mock the getRecipesAction module
jest.mock('@/actions/db/recipes-actions', () => ({
  getRecipesAction: jest.fn()
}));

import { getRecipesAction } from '@/actions/db/recipes-actions';

describe('RecipesPage', () => {
  beforeEach(() => {
    // Reset mock
    (getRecipesAction as jest.Mock).mockReset();
  });

  it('renders the page with recipe form and list when recipes are fetched successfully', async () => {
    // Setup mock to return successful data
    (getRecipesAction as jest.Mock).mockResolvedValue({
      isSuccess: true,
      data: [{ name: 'Spaghetti', description: 'Classic Italian pasta' }]
    });

    const pageContent = await RecipesPage();
    render(pageContent);
    
    // Check for page title and components
    expect(screen.getByText('Recipes')).toBeInTheDocument();
    expect(screen.getByText('New Recipe')).toBeInTheDocument();
    expect(screen.getByText('Recipe List')).toBeInTheDocument();

    // Check that a recipe is rendered
    expect(screen.getByText('Spaghetti')).toBeInTheDocument();
    expect(screen.getByText('Classic Italian pasta')).toBeInTheDocument();
  });

  it('renders the page with empty recipe list when fetching fails', async () => {
    (getRecipesAction as jest.Mock).mockResolvedValue({
      isSuccess: false,
      data: []
    });

    const pageContent = await RecipesPage();
    render(pageContent);
    
    // Check for page title and components
    expect(screen.getByText('Recipes')).toBeInTheDocument();
    expect(screen.getByText('New Recipe')).toBeInTheDocument();
    expect(screen.getByText('Recipe List')).toBeInTheDocument();
    
    // Check that empty state is shown
    expect(screen.getByText('No recipes found.')).toBeInTheDocument();
  });
});
