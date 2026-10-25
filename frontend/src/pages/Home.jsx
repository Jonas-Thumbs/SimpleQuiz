
import { Link } from "react-router-dom";

function Home() {
  return (
    <main className="home-page">
      <section className="home-hero">
        <p className="home-eyebrow">START LEARNING TODAY</p>

        <h2>Learn and Practice</h2>

        <p className="home-description">
          Create your own quizzes or challenge yourself with
          quizzes to test your knowledge.
        </p>

        <div className="home-actions">
          <Link to="/teacher" className="home-button home-button-primary">
            Create a Quiz
          </Link>

          <Link to="/student" className="home-button home-button-secondary">
            Take a Quiz
          </Link>
        </div>

        <div className="home-features">
          <div className="home-feature">
            <span className="home-feature-icon">✏️</span>
            <h3>Create</h3>
            <p>Build quizzes on any topic.</p>
          </div>

          <div className="home-feature">
            <span className="home-feature-icon">🧠</span>
            <h3>Practice</h3>
            <p>Test what you know.</p>
          </div>

          <div className="home-feature">
            <span className="home-feature-icon">📈</span>
            <h3>Improve</h3>
            <p>Keep learning at your pace.</p>
          </div>
        </div>
      </section>
    </main>
  );
}

export default Home;