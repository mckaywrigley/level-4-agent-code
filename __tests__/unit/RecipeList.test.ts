import { render, screen } from '@testing-library/react';
import RecipeList from '@/app/recipes/_components/recipe-list';

const sampleRecipes = [
  { name: 'Spaghetti', description: 'Delicious pasta with tomato sauce' },
  { name: 'Salad', description: 'Fresh green salad' }
];

describe('RecipeList Component', () => {
  it('renders message when no recipes found', () => {
    render(<RecipeList initialData={[]} />);
    expect(screen.getByText('No recipes found.')).toBeInTheDocument();
  });

  it('renders a list of recipes with names and descriptions', () => {
    render(<RecipeList initialData={sampleRecipes} />);
    expect(screen.getByText('Spaghetti')).toBeInTheDocument();
    expect(screen.getByText('Salad')).toBeInTheDocument();
    expect(screen.getByText('Delicious pasta with tomato sauce')).toBeInTheDocument();
    expect(screen.getByText('Fresh green salad')).toBeInTheDocument();
  });

  it('displays "Unnamed Recipe" when recipe name is missing', () => {
    const recipes = [{ description: 'No name provided' }];
    render(<RecipeList initialData={recipes} />);
    expect(screen.getByText('Unnamed Recipe')).toBeInTheDocument();
  });
});
