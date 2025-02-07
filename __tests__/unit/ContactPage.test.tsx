import ContactPage from "@/app/contact/page";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";

describe("ContactPage Component", () => {
  it("renders correctly and displays contact information", async () => {
    const content = await ContactPage();
    render(content);

    const headerElement = screen.getByText("Contact Page");
    expect(headerElement).toBeInTheDocument();

    const emailElement = screen.getByText("Please feel free to reach out via email at contact@example.com.");
    expect(emailElement).toBeInTheDocument();
  });
});
