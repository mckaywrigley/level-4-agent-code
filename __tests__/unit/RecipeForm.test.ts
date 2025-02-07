import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import RecipeForm from '@/app/recipes/_components/recipe-form';
import '@testing-library/jest-dom';

describe('RecipeForm Component', () => {
  it('renders form inputs and a submit button', () => {
    const dummyFn = jest.fn();
    render(<RecipeForm onAddRecipe={dummyFn} />);

    expect(screen.getByPlaceholderText('Enter recipe title')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('List ingredients here')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Describe preparation steps')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Add Recipe/i })).toBeInTheDocument();
  });

  it('calls onAddRecipe with proper data and clears the form', () => {
    const onAddRecipeMock = jest.fn();
    render(<RecipeForm onAddRecipe={onAddRecipeMock} />);

    const titleInput = screen.getByPlaceholderText('Enter recipe title');
    const ingredientsInput = screen.getByPlaceholderText('List ingredients here');
    const instructionsInput = screen.getByPlaceholderText('Describe preparation steps');
    const submitButton = screen.getByRole('button', { name: /Add Recipe/i });

    fireEvent.change(titleInput, { target: { value: 'Spaghetti Bolognese' } });
    fireEvent.change(ingredientsInput, { target: { value: 'Spaghetti, Meat, Tomato Sauce' } });
    fireEvent.change(instructionsInput, { target: { value: 'Cook pasta and simmer sauce with meat' } });

    fireEvent.click(submitButton);

    expect(onAddRecipeMock).toHaveBeenCalledWith({
      title: 'Spaghetti Bolognese',
      ingredients: 'Spaghetti, Meat, Tomato Sauce',
      instructions: 'Cook pasta and simmer sauce with meat'
    });

    // Ensure fields are cleared after submission
    expect(titleInput.value).toBe('');
    expect(ingredientsInput.value).toBe('');
    expect(instructionsInput.value).toBe('');
  });
});
