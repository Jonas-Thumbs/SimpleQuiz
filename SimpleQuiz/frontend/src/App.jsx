// Initial React implementation - created folder structure and routing
import { BrowserRouter, Link, Route, Routes } from 'react-router-dom'
import StudentQuiz from './pages/StudentQuiz.jsx'
import TeacherDashboard from './pages/TeacherDashboard.jsx'

function App() {
  return (
    <BrowserRouter>
      <header>
        <h1>SimpleQuiz</h1>
        <nav>
          <Link to="/teacher">Teacher dashboard</Link>
          <Link to="/student">Student quiz</Link>
        </nav>
      </header>

      <Routes>
        <Route path="/teacher" element={<TeacherDashboard />} />
        <Route path="/student" element={<StudentQuiz />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
