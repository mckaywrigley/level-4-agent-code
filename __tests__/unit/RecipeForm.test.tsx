import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import RecipeForm from '@/app/recipes/_components/recipe-form';

describe('RecipeForm Component', () => {
  it('renders form elements correctly', () => {
    render(<RecipeForm />);

    // Check for heading
    expect(screen.getByText('New Recipe')).toBeInTheDocument();

    // Check for Recipe Name label and input
    expect(screen.getByText('Recipe Name')).toBeInTheDocument();
    const nameInput = screen.getByPlaceholderText('Enter recipe name');
    expect(nameInput).toBeInTheDocument();

    // Check for Description label and textarea
    expect(screen.getByText('Description')).toBeInTheDocument();
    const descriptionTextarea = screen.getByPlaceholderText('Enter description');
    expect(descriptionTextarea).toBeInTheDocument();

    // Check for submit button
    const submitButton = screen.getByRole('button', { name: /Create Recipe/i });
    expect(submitButton).toBeInTheDocument();
  });
});