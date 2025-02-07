import { render, screen } from '@testing-library/react';
import RecipeForm from '@/app/recipes/_components/recipe-form';

describe('RecipeForm Component', () => {
  it('renders the form with all required fields', () => {
    render(<RecipeForm />);
    
    // Check that the form title is present
    expect(screen.getByText('New Recipe')).toBeInTheDocument();
    
    // Check for the recipe name label
    expect(screen.getByText('Recipe Name')).toBeInTheDocument();
    
    // Check for the description label
    expect(screen.getByText('Description')).toBeInTheDocument();
    
    // Check for the submit button
    expect(screen.getByRole('button', { name: /create recipe/i })).toBeInTheDocument();
  });
});
