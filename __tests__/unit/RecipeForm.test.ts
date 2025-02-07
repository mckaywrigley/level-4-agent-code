import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import RecipeForm from '@/app/recipes/_components/recipe-form';

describe('RecipeForm Component', () => {
  it('renders the form with all necessary inputs and button', () => {
    render(<RecipeForm />);

    // Check for New Recipe heading
    expect(screen.getByText('New Recipe')).toBeInTheDocument();

    // Check for label and placeholder for Recipe Name
    expect(screen.getByLabelText(/Recipe Name/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Enter recipe name/i)).toBeInTheDocument();

    // Check for label and placeholder for Description
    expect(screen.getByLabelText(/Description/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Enter description/i)).toBeInTheDocument();

    // Check for Create Recipe button
    expect(screen.getByRole('button', { name: /Create Recipe/i })).toBeInTheDocument();
  });
});
