import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import RecipeForm from '@/app/recipes/_components/recipe-form';

// This test assumes that RecipeForm accepts an onSubmit prop callback
// which is called with the recipe data when the form is submitted

describe('RecipeForm - Recipe Creation', () => {
  it('submits the form with valid input', () => {
    const onSubmit = jest.fn();
    render(<RecipeForm onSubmit={onSubmit} />);

    // Fill in the recipe name and description inputs
    const nameInput = screen.getByPlaceholderText('Enter recipe name');
    const descriptionInput = screen.getByPlaceholderText('Enter description');

    fireEvent.change(nameInput, { target: { value: 'Pancakes' } });
    fireEvent.change(descriptionInput, { target: { value: 'Fluffy pancakes with syrup' } });

    // Click the submit button
    const submitButton = screen.getByRole('button', { name: /Create Recipe/i });
    fireEvent.click(submitButton);

    // Assert that the onSubmit callback was called with the form data
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith({
      name: 'Pancakes',
      description: 'Fluffy pancakes with syrup'
    });
  });
});
