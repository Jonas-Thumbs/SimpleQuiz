// "render" renders a React component in a simulated browser window.
// "screen" provides tool to search for objects in that browser window.
import { render, screen } from "@testing-library/react";
// "describe" groups related tests, "it" defines one test case, "expect" makes assertions.
// "vi" is needed for mocking.
import { describe, it, expect, vi } from "vitest";

import SignUpPage from "./SignUp";

// Mock the Clerk component. Swaps it out for the simple <div>.
// The data-testid is needed to find the element later.
vi.mock("@clerk/react-router", () => ({
  SignUp: () => <div data-testid="clerk-signup-mock">Mocked SignUp</div>,
}));

// the actual tests
describe("SignUpPage", () => {
  // check if the SignUp component exists
  it("renders the Clerk SignUp component", () => {
    render(<SignUpPage />);
    // the assertion
    expect(screen.getByTestId("clerk-signup-mock")).toBeInTheDocument();
  });

  // check for the correct style
  it("centers the content correctly", () => {
    render(<SignUpPage />);

    // Get the parent div holding the mocked component
    const wrapper = screen.getByTestId("clerk-signup-mock").parentElement;

    // the assertion
    expect(wrapper).toHaveStyle({
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
    });
  });
});
