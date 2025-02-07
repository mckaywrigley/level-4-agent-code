import React, { useState } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import RecipeForm from '@/app/recipes/_components/recipe-form';
import RecipeList from '@/app/recipes/_components/recipe-list';

// A simple integrated component for creating and viewing recipes
const RecipesPageCreation = () => {
  const [recipes, setRecipes] = useState([]);

  const handleCreateRecipe = (recipe) => {
    setRecipes(prev => [...prev, recipe]);
  };

  return (
    <div>
      <h1>Recipes</h1>
      <RecipeForm onSubmit={handleCreateRecipe} />
      {recipes.length > 0 ? (
        <RecipeList initialData={recipes} />
      ) : (
        <p>No recipes found.</p>
      )}
    </div>
  );
};

// Unit test for the basic recipe creation and viewing feature
describe('RecipesPageCreation Component', () => {
  it('allows a user to create a recipe and then displays it', () => {
    render(<RecipesPageCreation />);

    // Initially, the page should indicate no recipes
    expect(screen.getByText('No recipes found.')).toBeInTheDocument();

    // Fill in the recipe form
    const nameInput = screen.getByPlaceholderText('Enter recipe name');
    const descriptionInput = screen.getByPlaceholderText('Enter description');
    fireEvent.change(nameInput, { target: { value: 'Omelette' } });
    fireEvent.change(descriptionInput, { target: { value: 'A simple egg omelette' } });

    // Submit the form
    const submitButton = screen.getByRole('button', { name: /Create Recipe/i });
    fireEvent.click(submitButton);

    // After submission, the new recipe should appear in the list
    expect(screen.getByText('Omelette')).toBeInTheDocument();
    expect(screen.getByText('A simple egg omelette')).toBeInTheDocument();
  });
});
