// Initial React implementation - created folder structure and routing
import { BrowserRouter, Link, Route, Routes } from "react-router-dom";
import {
  ClerkProvider,
  Show,
  SignInButton,
  SignOutButton,
} from "@clerk/react-router";
import StudentQuiz from "./pages/StudentQuiz.jsx";
import TeacherDashboard from "./pages/TeacherDashboard.jsx";
import SignUpPage from "./pages/SignUp.jsx";
import ProfilePage from "./pages/Profile.jsx";
import Home from "./pages/Home.jsx";

// Import your Publishable Key
const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!PUBLISHABLE_KEY) {
  throw new Error("Add your Clerk Publishable Key to the .env file");
}

function App() {
  return (
    <BrowserRouter>
      <ClerkProvider publishableKey={PUBLISHABLE_KEY}>
        <header>
          <h1>SimpleQuiz</h1>
          <nav>
            {/* Only visible when NOT signed in */}
            <Show when="signed-out">
              <Link className="nav-button" to="/sign-up">Sign Up</Link>
              <SignInButton>
                <button className="nav-button nav-button-primary">
                  Sign In
                </button>
              </SignInButton>
            </Show>
            {/* Only visible when signed in */}
            <Show when="signed-in">
              <Link to="/profile">Profile</Link>
              <SignOutButton />
            </Show>
            <Link className="nav-button-dashboard" to="/">Dashboard</Link>
          </nav>
        </header>
        {/* Tell user if they are signed in or not. (for testing) */}
        <Show when="signed-in">
          <div>You are logged in.</div>
        </Show>

        <Routes>
          <Route path="/teacher" element={<TeacherDashboard />} />
          <Route path="/student" element={<StudentQuiz />} />
          <Route path="/sign-up" element={<SignUpPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/" element={<Home />} />
        </Routes>
      </ClerkProvider>
    </BrowserRouter>
  );
}

export default App;
