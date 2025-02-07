import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock the getRecipesAction function
jest.mock("@/actions/db/recipes-actions", () => ({
  getRecipesAction: jest.fn()
}));

import { getRecipesAction } from '@/actions/db/recipes-actions';
import RecipesPage from '@/app/recipes/page';

describe('RecipesPage', () => {
  it('renders the page with recipes from the action', async () => {
    // Setup mock implementation
    const mockData = [
      { name: 'Salad', description: 'Fresh garden salad' },
      { name: 'Soup', description: 'Hearty chicken soup' }
    ];
    (getRecipesAction as jest.Mock).mockResolvedValue({ isSuccess: true, data: mockData });

    const pageContent = await RecipesPage();
    render(pageContent);

    // Check page heading
    expect(screen.getByText('Recipes')).toBeInTheDocument();
    
    // Check that RecipeForm is present
    expect(screen.getByText('New Recipe')).toBeInTheDocument();
    
    // Check that RecipeList is present and renders recipes
    expect(screen.getByText('Recipe List')).toBeInTheDocument();
    mockData.forEach(recipe => {
      expect(screen.getByText(recipe.name)).toBeInTheDocument();
      expect(screen.getByText(recipe.description)).toBeInTheDocument();
    });
  });

  it('renders the page without recipes when action fails', async () => {
    (getRecipesAction as jest.Mock).mockResolvedValue({ isSuccess: false, data: [] });

    const pageContent = await RecipesPage();
    render(pageContent);

    // Check page heading
    expect(screen.getByText('Recipes')).toBeInTheDocument();
    
    // Check that RecipeList displays no recipes message
    expect(screen.getByText('No recipes found.')).toBeInTheDocument();
  });
});