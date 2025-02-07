import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import InvoiceEstimator from '@/app/invoice/_components/invoice-estimator';


describe('InvoiceEstimator Component', () => {
  it('renders the invoice estimator heading', () => {
    render(<InvoiceEstimator />);
    expect(screen.getByText('Invoice Estimator')).toBeInTheDocument();
  });

  it('calculates total correctly when valid quantity and unit price are provided', () => {
    render(<InvoiceEstimator />);
    
    // Using placeholder texts to get inputs
    const descriptionInput = screen.getByPlaceholderText('Enter item description');

    // There are two number inputs with the same placeholder "0". They are rendered in order: quantity, then unit price.
    const numberInputs = screen.getAllByPlaceholderText('0');
    expect(numberInputs.length).toBeGreaterThanOrEqual(2);
    const quantityInput = numberInputs[0];
    const unitPriceInput = numberInputs[1];
    
    // Change values
    fireEvent.change(quantityInput, { target: { value: '3' } });
    fireEvent.change(unitPriceInput, { target: { value: '10' } });
    
    // Click the calculate button
    const button = screen.getByRole('button', { name: 'Calculate Total' });
    fireEvent.click(button);
    
    // Check that total amount updates to $30.00
    expect(screen.getByText(/\$30\.00/)).toBeInTheDocument();
  });

  it('updates the description field correctly', () => {
    render(<InvoiceEstimator />);
    const descriptionInput = screen.getByPlaceholderText('Enter item description');
    fireEvent.change(descriptionInput, { target: { value: 'Test Item' } });
    expect(descriptionInput.value).toBe('Test Item');
  });
});
