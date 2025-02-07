import React from 'react';
import { render, screen } from '@testing-library/react';
import RecipeForm from '@/app/recipes/_components/recipe-form';

describe('RecipeForm Component', () => {
  it('renders the form with all required fields', () => {
    render(<RecipeForm />);
    
    // Check for heading
    expect(screen.getByText('New Recipe')).toBeInTheDocument();
    
    // Check for labels
    expect(screen.getByText('Recipe Name')).toBeInTheDocument();
    expect(screen.getByText('Description')).toBeInTheDocument();
    
    // Check for input fields
    const nameInput = screen.getByPlaceholderText('Enter recipe name');
    expect(nameInput).toBeInTheDocument();
    const descriptionInput = screen.getByPlaceholderText('Enter description');
    expect(descriptionInput).toBeInTheDocument();

    // Check for submit button
    const submitButton = screen.getByRole('button', { name: /Create Recipe/i });
    expect(submitButton).toBeInTheDocument();
  });
});
