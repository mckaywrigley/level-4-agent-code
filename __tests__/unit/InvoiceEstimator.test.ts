import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import InvoiceEstimator from '@/app/invoice/_components/invoice-estimator';

describe('InvoiceEstimator Component', () => {
  it('renders correctly with initial state', () => {
    render(<InvoiceEstimator />);
    
    // Check if the heading exists
    expect(screen.getByText('Invoice Estimator')).toBeInTheDocument();

    // Check the initial total amount is $0.00
    expect(screen.getByText(/Total Amount:/)).toHaveTextContent('$0.00');

    // Check that input fields are present
    expect(screen.getByPlaceholderText('Enter item description')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('0')).toBeInTheDocument();
  });

  it('calculates total correctly when inputs are provided', () => {
    render(<InvoiceEstimator />);
    
    // Get input fields by their placeholder texts
    const descriptionInput = screen.getByPlaceholderText('Enter item description');
    const numberInputs = screen.getAllByPlaceholderText('0');
    
    // Assume the first number input is for quantity and second for unit price
    const quantityInput = numberInputs[0];
    const unitPriceInput = numberInputs[1];

    // Update the input fields
    fireEvent.change(descriptionInput, { target: { value: 'Test Item' } });
    fireEvent.change(quantityInput, { target: { value: '5' } });
    fireEvent.change(unitPriceInput, { target: { value: '10' } });
    
    // Click the Calculate Total button
    const calculateButton = screen.getByRole('button', { name: /Calculate Total/i });
    fireEvent.click(calculateButton);

    // Check that the total is calculated correctly ($50.00)
    expect(screen.getByText(/Total Amount:/)).toHaveTextContent('$50.00');
  });
});
