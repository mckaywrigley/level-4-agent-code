import InvoicePage from "@/app/invoice/page";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";

describe("InvoicePage Component", () => {
  it("renders correctly with the Invoice Estimator header and description", async () => {
    const content = await InvoicePage();
    render(content);
    const header = screen.getByText(/Invoice Estimator/i);
    const description = screen.getByText(/This is the invoice estimator page/i);
    expect(header).toBeInTheDocument();
    expect(description).toBeInTheDocument();
  });
});
