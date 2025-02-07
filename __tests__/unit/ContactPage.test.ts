import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

import ContactPage from '@/app/contact/page';

describe('ContactPage Component', () => {
  it('renders the Contact Us heading and placeholder text', () => {
    const content = ContactPage();
    render(content);

    const headingElement = screen.getByRole('heading', { name: /Contact Us/i });
    expect(headingElement).toBeInTheDocument();

    const placeholderElement = screen.getByText(/\[Contact form will be implemented here\]/i);
    expect(placeholderElement).toBeInTheDocument();
  });
});
