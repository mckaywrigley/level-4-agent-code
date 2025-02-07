import LoginPage from '@/app/login/page';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

describe('LoginPage Component', () => {
  it('renders the login form correctly', async () => {
    const page = await LoginPage();
    render(page);

    // Check that the page heading is displayed
    const heading = screen.getByRole('heading', { name: /login/i });
    expect(heading).toBeInTheDocument();

    // Check for email input field
    const emailInput = screen.getByPlaceholderText(/enter your email/i);
    expect(emailInput).toBeInTheDocument();
    expect(emailInput).toHaveAttribute('type', 'email');

    // Check for password input field
    const passwordInput = screen.getByPlaceholderText(/enter your password/i);
    expect(passwordInput).toBeInTheDocument();
    expect(passwordInput).toHaveAttribute('type', 'password');

    // Check for the login button
    const loginButton = screen.getByRole('button', { name: /login/i });
    expect(loginButton).toBeInTheDocument();
  });
});
