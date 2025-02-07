import LoginPage from '@/app/login/page';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

describe('LoginPage Component', () => {
  it('renders the login form within a styled card with fade-in effect', async () => {
    const page = await LoginPage();
    render(page);

    // Check that the Card container is rendered using its unique styling class
    const cardContainer = document.querySelector('.shadow-lg');
    expect(cardContainer).toBeInTheDocument();

    // Check that the heading is rendered and correctly displays 'Login'
    const heading = screen.getByRole('heading', { name: /login/i });
    expect(heading).toBeInTheDocument();

    // Verify email input field
    const emailInput = screen.getByPlaceholderText(/enter your email/i);
    expect(emailInput).toBeInTheDocument();
    expect(emailInput).toHaveAttribute('type', 'email');

    // Verify password input field
    const passwordInput = screen.getByPlaceholderText(/enter your password/i);
    expect(passwordInput).toBeInTheDocument();
    expect(passwordInput).toHaveAttribute('type', 'password');

    // Verify the login button
    const loginButton = screen.getByRole('button', { name: /login/i });
    expect(loginButton).toBeInTheDocument();
  });
});
