import React from 'react';
import { render, screen } from '@testing-library/react';
import RecipeList from '@/app/recipes/_components/recipe-list';

describe('RecipeList Component', () => {
  it('displays a message when there are no recipes', () => {
    render(<RecipeList initialData={[]} />);
    expect(screen.getByText('No recipes found.')).toBeInTheDocument();
  });

  it('renders a list of recipes when data is provided', () => {
    const sampleData = [
      { name: 'Pancakes', description: 'Fluffy pancakes' },
      { name: 'Omelette', description: 'Cheesy omelette' }
    ];
    render(<RecipeList initialData={sampleData} />);
    
    // Check for recipe list title
    expect(screen.getByText('Recipe List')).toBeInTheDocument();

    // Check for recipe items
    expect(screen.getByText('Pancakes')).toBeInTheDocument();
    expect(screen.getByText('Fluffy pancakes')).toBeInTheDocument();
    expect(screen.getByText('Omelette')).toBeInTheDocument();
    expect(screen.getByText('Cheesy omelette')).toBeInTheDocument();
  });

  it('renders fallback text for recipes without a name', () => {
    const sampleData = [{ description: 'No name provided' }];
    render(<RecipeList initialData={sampleData} />);
    expect(screen.getByText('Unnamed Recipe')).toBeInTheDocument();
  });
});
