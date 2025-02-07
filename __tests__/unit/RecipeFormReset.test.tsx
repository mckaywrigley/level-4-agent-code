import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

import RecipeForm from '@/app/recipes/_components/recipe-form';

// This test verifies that after a successful recipe submission via RecipeForm,
// the form fields are reset to their default (empty) state.

describe('RecipeForm - Reset After Submit', () => {
  it('resets form fields after successful submission', () => {
    const onSubmit = jest.fn();
    render(<RecipeForm onSubmit={onSubmit} />);

    // Fill in the recipe form
    const nameInput = screen.getByPlaceholderText('Enter recipe name');
    const descriptionInput = screen.getByPlaceholderText('Enter description');
    const submitButton = screen.getByRole('button', { name: /Create Recipe/i });

    fireEvent.change(nameInput, { target: { value: 'Waffles' } });
    fireEvent.change(descriptionInput, { target: { value: 'Crispy waffles with fresh berries' } });

    // Submit the form
    fireEvent.click(submitButton);

    // Expect the onSubmit callback to have been called with the correct data
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith({
      name: 'Waffles',
      description: 'Crispy waffles with fresh berries'
    });

    // Check that the form fields have been reset (cleared)
    expect(nameInput.value).toBe('');
    expect(descriptionInput.value).toBe('');
  });
});