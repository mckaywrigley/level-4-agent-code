import InvoicePage from '@/app/invoice/page';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

describe('InvoicePage Component', () => {
  it('renders correctly and displays the Invoice Estimator heading', async () => {
    const content = await InvoicePage();
    render(content);
    const headingElement = screen.getByText('Invoice Estimator');
    expect(headingElement).toBeInTheDocument();
  });
});
