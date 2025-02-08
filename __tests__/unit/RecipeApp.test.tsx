import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import RecipeApp from '@/app/recipes/_components/recipe-app';

describe('RecipeApp Component', () => {
  it('renders the header and initial message when no recipes exist', () => {
    render(<RecipeApp />);
    // Check if the header is rendered
    expect(screen.getByRole('heading', { name: /Recipe App/i })).toBeInTheDocument();
    // Check if the no recipes message is displayed
    expect(screen.getByText(/No recipes available. Create one!/i)).toBeInTheDocument();
  });

  it('adds a new recipe when the form is submitted with valid inputs', () => {
    render(<RecipeApp />);

    // Get input and textarea elements by placeholder text
    const titleInput = screen.getByPlaceholderText(/Recipe Title/i);
    const instructionsInput = screen.getByPlaceholderText(/Recipe Instructions/i);
    const addButton = screen.getByRole('button', { name: /Add Recipe/i });

    // Simulate user typing
    fireEvent.change(titleInput, { target: { value: 'Pancakes' } });
    fireEvent.change(instructionsInput, { target: { value: 'Mix ingredients and cook.' } });

    // Submit the form
    fireEvent.click(addButton);

    // Check if the new recipe appears in the list
    expect(screen.getByText(/Pancakes/i)).toBeInTheDocument();
    expect(screen.getByText(/Mix ingredients and cook./i)).toBeInTheDocument();

    // Also check that the inputs have been cleared
    expect(titleInput).toHaveValue('');
    expect(instructionsInput).toHaveValue('');
  });

  it('does not add a recipe if title or instructions are empty', () => {
    render(<RecipeApp />);

    const addButton = screen.getByRole('button', { name: /Add Recipe/i });

    // First attempt with empty title
    const titleInput = screen.getByPlaceholderText(/Recipe Title/i);
    const instructionsInput = screen.getByPlaceholderText(/Recipe Instructions/i);

    fireEvent.change(titleInput, { target: { value: '  ' } });
    fireEvent.change(instructionsInput, { target: { value: 'Valid instruction' } });
    fireEvent.click(addButton);
    expect(screen.queryByText(/Valid instruction/i)).not.toBeInTheDocument();

    // Second attempt with empty instructions
    fireEvent.change(titleInput, { target: { value: 'Valid Title' } });
    fireEvent.change(instructionsInput, { target: { value: '   ' } });
    fireEvent.click(addButton);
    expect(screen.queryByText(/Valid Title/i)).not.toBeInTheDocument();
  });
});
