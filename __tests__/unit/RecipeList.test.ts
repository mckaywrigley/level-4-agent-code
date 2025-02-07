import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import RecipeList from '@/app/recipes/_components/recipe-list';

describe('RecipeList Component', () => {
  it('displays a message when there are no recipes', () => {
    render(<RecipeList initialData={[]} />);
    expect(screen.getByText(/No recipes found./i)).toBeInTheDocument();
  });

  it('renders a list of recipes when data is provided', () => {
    const recipes = [
      { name: 'Pasta', description: 'Tasty pasta recipe' },
      { name: 'Salad', description: 'Fresh and healthy' }
    ];
    render(<RecipeList initialData={recipes} />);

    // Check for list title
    expect(screen.getByText(/Recipe List/i)).toBeInTheDocument();

    recipes.forEach(recipe => {
      expect(screen.getByText(recipe.name)).toBeInTheDocument();
      expect(screen.getByText(recipe.description)).toBeInTheDocument();
    });
  });
});
