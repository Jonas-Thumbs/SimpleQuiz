// "render" renders a React component in a simulated browser window.
// "screen" provides tool to search for objects in that browser window.
import { useUser } from "@clerk/react-router";
import { render, screen } from "@testing-library/react";
// "describe" groups related tests, "it" defines one test case, "expect" makes assertions.
// "vi" is needed for mocking.
import { describe, it, expect, vi } from "vitest";

import ProfilePage from "./Profile";

// Mock the Clerk component. Swaps it out for the simple <div>.
// The data-testid is needed to find the element later.
vi.mock("@clerk/react-router", () => ({
  // mock UI component
  UserProfile: () => <div data-testid="clerk-profile-mock">Mocked Profile</div>,
  // empty mock function that we can change in each test.
  useUser: vi.fn(),
}));

// the actual tests
describe("ProfilePage", () => {
  it("displays loading state when isLoaded false", () => {
    useUser.mockReturnValue({
      isLoaded: false,
      isSignedIn: undefined,
      user: null,
    });
    render(<ProfilePage />);
    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("displays Sign in message when isSignedIn is false", () => {
    useUser.mockReturnValue({ isLoaded: true, isSignedIn: false, user: null });
    render(<ProfilePage />);
    expect(screen.getByText("Sign in to view this page")).toBeInTheDocument();
  });

  it("correctly displays UserProfile when authenticated", () => {
    useUser.mockReturnValue({ isLoaded: true, isSignedIn: true, user: null });
    render(<ProfilePage />);
    const mockedProfile = screen.getByTestId("clerk-profile-mock");
    expect(mockedProfile).toBeInTheDocument();

    const wrapper = mockedProfile.parentElement;
    expect(wrapper).toHaveStyle({
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
    });
  });
});
