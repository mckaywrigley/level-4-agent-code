import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";

import ContactPage from "@/app/contact/page";

describe("ContactPage Component", () => {
  it("renders correctly with the contact heading and placeholder text", () => {
    render(<ContactPage />);

    // Check for the main heading
    expect(screen.getByText("Contact Us")).toBeInTheDocument();

    // Check for placeholder in the contact form section
    expect(screen.getByText("[Contact form will be implemented here]")).toBeInTheDocument();
  });
});
