import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

import RecipeForm from '@/app/recipes/_components/recipe-form';

describe('RecipeForm Component', () => {
  const setup = () => {
    const onAddRecipe = jest.fn();
    render(<RecipeForm onAddRecipe={onAddRecipe} />);
    const titleInput = screen.getByPlaceholderText('Enter recipe title');
    const instructionsInput = screen.getByPlaceholderText('Enter recipe instructions');
    const submitButton = screen.getByRole('button', { name: /add recipe/i });
    return { titleInput, instructionsInput, submitButton, onAddRecipe };
  };

  it('should call onAddRecipe with trimmed values when form is submitted', () => {
    const { titleInput, instructionsInput, submitButton, onAddRecipe } = setup();

    // Input values with extra whitespace
    fireEvent.change(titleInput, { target: { value: '  Test Recipe  ' } });
    fireEvent.change(instructionsInput, { target: { value: '  Follow these steps.  ' } });

    fireEvent.click(submitButton);

    expect(onAddRecipe).toHaveBeenCalledTimes(1);
    expect(onAddRecipe).toHaveBeenCalledWith({
      title: 'Test Recipe',
      instructions: 'Follow these steps.'
    });

    // After submission, inputs should be cleared
    expect(titleInput).toHaveValue('');
    expect(instructionsInput).toHaveValue('');
  });

  it('should not call onAddRecipe if title or instructions are empty', () => {
    const { titleInput, instructionsInput, submitButton, onAddRecipe } = setup();

    // Test with empty title
    fireEvent.change(titleInput, { target: { value: '   ' } });
    fireEvent.change(instructionsInput, { target: { value: 'Some instructions' } });
    fireEvent.click(submitButton);
    expect(onAddRecipe).not.toHaveBeenCalled();

    // Clear the inputs manually if needed (simulate re-render)
    fireEvent.change(titleInput, { target: { value: 'Valid Title' } });
    fireEvent.change(instructionsInput, { target: { value: '   ' } });
    fireEvent.click(submitButton);
    expect(onAddRecipe).not.toHaveBeenCalled();
  });
});
