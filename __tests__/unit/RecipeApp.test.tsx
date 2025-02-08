import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import RecipeApp from '@/app/recipes/_components/recipe-app';


describe('RecipeApp Component', () => {
  it('does not add a recipe if the title is empty', () => {
    render(<RecipeApp />);
    
    const titleInput = screen.getByPlaceholderText('Recipe Title');
    const instructionsInput = screen.getByPlaceholderText('Recipe Instructions');
    const addButton = screen.getByRole('button', { name: /add recipe/i });

    // Leave title empty and only fill instructions
    fireEvent.change(instructionsInput, { target: { value: 'Valid instruction' } });
    fireEvent.click(addButton);

    // The recipe list is rendered as a <ul> when a recipe is added, each recipe in a <li>
    // Since the recipe should not be added, there should be no listitem
    const listItems = screen.queryAllByRole('listitem');
    expect(listItems).toHaveLength(0);
  });

  it('does not add a recipe if the instructions are empty', () => {
    render(<RecipeApp />);
    
    const titleInput = screen.getByPlaceholderText('Recipe Title');
    const instructionsInput = screen.getByPlaceholderText('Recipe Instructions');
    const addButton = screen.getByRole('button', { name: /add recipe/i });

    // Leave instructions empty and only fill title
    fireEvent.change(titleInput, { target: { value: 'Valid Title' } });
    fireEvent.click(addButton);

    // Expect no recipe to be added
    const listItems = screen.queryAllByRole('listitem');
    expect(listItems).toHaveLength(0);
  });

  it('adds a recipe if both title and instructions are provided', () => {
    render(<RecipeApp />);
    
    const titleInput = screen.getByPlaceholderText('Recipe Title');
    const instructionsInput = screen.getByPlaceholderText('Recipe Instructions');
    const addButton = screen.getByRole('button', { name: /add recipe/i });

    fireEvent.change(titleInput, { target: { value: 'Valid Title' } });
    fireEvent.change(instructionsInput, { target: { value: 'Valid instruction' } });
    fireEvent.click(addButton);

    // Expect the recipe to be added in the list (rendered as a list item)
    const listItems = screen.getAllByRole('listitem');
    expect(listItems).toHaveLength(1);
    
    // Verify that the added recipe displays the correct title and instructions
    expect(screen.getByText('Valid Title')).toBeInTheDocument();
    expect(screen.getByText('Valid instruction')).toBeInTheDocument();
  });
});
