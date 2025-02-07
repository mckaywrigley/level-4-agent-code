import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import InvoiceEstimator from '@/app/invoice/_components/invoice-estimator';


describe('InvoiceEstimator Component', () => {
  it('renders correctly with heading and initial state', () => {
    render(<InvoiceEstimator />);
    
    // Check that the main heading is rendered
    const headingElement = screen.getByText('Invoice Estimator');
    expect(headingElement).toBeInTheDocument();

    // Check that the Total Amount displays with initial value $0.00
    const totalElement = screen.getByText(/Total Amount:/i);
    expect(totalElement).toHaveTextContent('$0.00');
  });

  it('calculates total correctly when quantity and unit price are provided', () => {
    render(<InvoiceEstimator />);

    // Get inputs by their corresponding labels
    const descriptionInput = screen.getByPlaceholderText('Enter item description');
    expect(descriptionInput).toBeInTheDocument();

    // Use getByLabelText to retrieve grouped inputs by label text
    const quantityInput = screen.getByLabelText('Quantity');
    const unitPriceInput = screen.getByLabelText('Unit Price');

    // Simulate user input for quantity and unit price
    fireEvent.change(quantityInput, { target: { value: '3' } });
    fireEvent.change(unitPriceInput, { target: { value: '15.5' } });

    // Click calculate button
    const calculateButton = screen.getByRole('button', { name: /Calculate Total/i });
    fireEvent.click(calculateButton);

    // Total should be quantity * unitPrice = 3 * 15.5 = 46.50
    const totalElement = screen.getByText(/Total Amount:/i);
    expect(totalElement).toHaveTextContent('$46.50');
  });
});
