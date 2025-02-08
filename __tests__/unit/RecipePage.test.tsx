import React from 'react';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import RecipePage from '@/app/recipes/page';

describe('RecipePage Component', () => {
  it('renders the RecipeApp component within the page', () => {
    render(<RecipePage />);
    // Check for the RecipeApp header that should be rendered inside RecipePage
    expect(screen.getByRole('heading', { name: /Recipe App/i })).toBeInTheDocument();
  });
});
