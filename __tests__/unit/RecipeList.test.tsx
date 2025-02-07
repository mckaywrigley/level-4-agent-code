import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import RecipeList from '@/app/recipes/_components/recipe-list';

describe('RecipeList Component', () => {
  it('renders a message when no recipes are provided', () => {
    render(<RecipeList initialData={[]} />);
    expect(screen.getByText('No recipes found.')).toBeInTheDocument();
  });

  it('renders a list of recipes when data is provided', () => {
    const sampleRecipes = [
      { name: 'Pizza', description: 'Delicious cheese pizza' },
      { name: 'Pasta', description: 'Creamy Alfredo pasta' }
    ];
    render(<RecipeList initialData={sampleRecipes} />);

    // Check for list heading
    expect(screen.getByText('Recipe List')).toBeInTheDocument();

    // Check for each recipe name and description
    sampleRecipes.forEach(recipe => {
      expect(screen.getByText(recipe.name)).toBeInTheDocument();
      expect(screen.getByText(recipe.description)).toBeInTheDocument();
    });
  });

  it('renders 
', () => {
    // Incomplete test case from patch; to be implemented
  });
});