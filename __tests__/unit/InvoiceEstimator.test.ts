import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import InvoiceEstimator from '@/app/invoice/_components/invoice-estimator';

describe('InvoiceEstimator Component', () => {
  it('renders the heading correctly', () => {
    render(<InvoiceEstimator />);
    const headingElement = screen.getByText('Invoice Estimator');
    expect(headingElement).toBeInTheDocument();
  });

  it('updates the description input value', () => {
    render(<InvoiceEstimator />);
    const descriptionInput = screen.getByPlaceholderText('Enter item description');
    fireEvent.change(descriptionInput, { target: { value: 'Test Item' } });
    expect(descriptionInput).toHaveValue('Test Item');
  });

  it('calculates total correctly when quantity and unit price are provided', () => {
    render(<InvoiceEstimator />);
    const quantityInput = screen.getByPlaceholderText('0');
    const unitPriceInput = screen.getAllByPlaceholderText('0')[1];
    const calculateButton = screen.getByRole('button', { name: 'Calculate Total' });

    // Set quantity to 3 and unit price to 10
    fireEvent.change(quantityInput, { target: { value: '3' } });
    fireEvent.change(unitPriceInput, { target: { value: '10' } });

    fireEvent.click(calculateButton);

    const totalElement = screen.getByText(/Total Amount:/i);
    expect(totalElement).toHaveTextContent('$30.00');
  });
});
