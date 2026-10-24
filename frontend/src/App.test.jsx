import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import React from "react";
import App from "./App";

// Mock Clerk Publishable Key environment variable
vi.stubEnv("VITE_CLERK_PUBLISHABLE_KEY", "pk_test_mock_key");

// Define function so we can check if the button actually triggers
const mockSignOut = vi.fn();

vi.mock("@clerk/react-router", () => ({
  ClerkProvider: ({ children }) => <div>{children}</div>,
  Show: ({ when, children }) =>
    when === "signed-in" ? <div>{children}</div> : null,
  SignInButton: () => <button>Sign In</button>,
  SignOutButton: () => (
    <button data-testid="clerk-logout-mock" onClick={mockSignOut}>
      Sign Out
    </button>
  ),
}));

describe("Logout Functionality", () => {
  it("renders the SignOutButton when signed in and triggers sign out on click", () => {
    render(<App />);

    // Verify the log-out button renders.
    // Finds it via role and regex, which is closer to the end user than the testid
    const signOutButton = screen.getByRole("button", { name: /sign out/i });
    expect(signOutButton).toBeInTheDocument();

    // Simulate user clicking log-out
    fireEvent.click(signOutButton);

    // Assert that Clerk's sign-out handler was called
    expect(mockSignOut).toHaveBeenCalledTimes(1);
  });
});
