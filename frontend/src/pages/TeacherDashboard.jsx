import { useEffect, useState } from "react"
import { useUser } from "@clerk/react-router"
import { Link } from "react-router-dom"
import {
  assignQuizToClass,
  createClassroom,
  getQuickResultsTeacher,
  getQuizzes,
  getTeacherClasses,
} from "../services/apiService"

function TeacherDashboard() {
  const { isLoaded, isSignedIn, user } = useUser()
  const [activeView, setActiveView] = useState("results")
  const [quizzes, setQuizzes] = useState([])
  const [classrooms, setClassrooms] = useState([])
  const [selectedQuizByClass, setSelectedQuizByClass] = useState({})
  const [className, setClassName] = useState("")
  const [result, setResult] = useState(null)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let active = true
    const requests = [getQuizzes()]
    if (isLoaded && isSignedIn && user) {
      requests.push(getTeacherClasses(user.id))
    }

    Promise.all(requests)
      .then(([loadedQuizzes, loadedClasses = []]) => {
        if (!active) return
        setQuizzes(loadedQuizzes)
        setClassrooms((current) => {
          const classesById = new Map(current.map((classroom) => [classroom.id, classroom]))
          loadedClasses.forEach((classroom) => classesById.set(classroom.id, classroom))
          return [...classesById.values()]
        })
      })
      .catch((requestError) => {
        if (active) setError(requestError.message)
      })

    return () => {
      active = false
    }
  }, [isLoaded, isSignedIn, user])

  async function handleSeeResults(quizId) {
    setBusy(true)
    setError("")
    setResult(null)
    try {
      setResult(await getQuickResultsTeacher(quizId))
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setBusy(false)
    }
  }

  async function handleCreateClass(event) {
    event.preventDefault()
    if (!user) return
    setBusy(true)
    setError("")
    setMessage("")
    try {
      const classroom = await createClassroom({
        name: className,
        teacher_clerk_id: user.id,
      })
      setClassrooms((current) => [...current, classroom])
      setClassName("")
      setMessage(`Class created. Share join code ${classroom.join_code} with students.`)
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setBusy(false)
    }
  }

  async function handleAssignQuiz(classroomId) {
    const quizId = selectedQuizByClass[classroomId] || quizzes[0]?.id
    if (!quizId) return
    setBusy(true)
    setError("")
    try {
      const assignment = await assignQuizToClass(classroomId, Number(quizId))
      setClassrooms((current) => current.map((classroom) =>
        classroom.id === classroomId
          ? { ...classroom, assignments: [...classroom.assignments, assignment] }
          : classroom,
      ))
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="teacher-quiz-page">
      <section className="home-hero">
        <p className="home-eyebrow">TEACH MORE EFFECTIVELY</p>
        <h2>{activeView === "results" ? "Manage Quizzes" : "Classes"}</h2>
        <p className="home-description">
          Review quiz results, create classes, and assign quizzes to students.
        </p>
        <div className="dashboard-tabs" role="tablist" aria-label="Teacher dashboard">
          <button
            aria-selected={activeView === "results"}
            onClick={() => { setActiveView("results"); setResult(null) }}
            role="tab"
            type="button"
          >
            Quiz results
          </button>
          <button
            aria-selected={activeView === "classes"}
            onClick={() => setActiveView("classes")}
            role="tab"
            type="button"
          >
            Classes
          </button>
        </div>
        {error && <p className="student-quiz-error" role="alert">{error}</p>}
        {message && <p role="status">{message}</p>}

        {activeView === "results" && result && (
          <section className="teacher-summary-container">
            <div className="summary-header">
              <h3>Results: {result.quiz_title}</h3>
              <button onClick={() => setResult(null)} type="button">Close</button>
            </div>
            <div className="summary-overview">
              <span>Submissions: <strong>{result.total_attempts}</strong></span>
              <span>Average score: <strong>{result.average_score.toFixed(1)} pts</strong></span>
            </div>
            <table className="summary-table">
              <thead>
                <tr><th>Question</th><th>Accuracy (Correct / Total)</th></tr>
              </thead>
              <tbody>
                {result.questions.map((question, index) => {
                  const accuracy = question.total_answers
                    ? Math.round((question.correct_answers / question.total_answers) * 100)
                    : 0
                  return (
                    <tr key={question.question_id}>
                      <td className="question-col">
                        <strong>Q{index + 1}:</strong> {question.question_text}
                      </td>
                      <td className="progress-col">
                        <div className="progress-wrapper">
                          <div className="progress-bar-track">
                            <div className="progress-bar-fill" style={{ width: `${accuracy}%` }} />
                          </div>
                          <span className="progress-label">
                            {accuracy}% ({question.correct_answers}/{question.total_answers})
                          </span>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </section>
        )}

        {activeView === "results" && !result && (
          <div className="student-quiz-list">
            {quizzes.map((quiz) => (
              <article className="student-quiz-option" key={quiz.id}>
                <div>
                  <h3>{quiz.title}</h3>
                  <p>{quiz.description}</p>
                  <span>{quiz.question_count} questions</span>
                </div>
                <button disabled={busy} onClick={() => handleSeeResults(quiz.id)} type="button">
                  See Results
                </button>
              </article>
            ))}
            {quizzes.length === 0 && !error && <p>No quizzes yet.</p>}
            <Link to="/teacher/create-quiz/" className="home-button home-button-primary">
              New Quiz
            </Link>
          </div>
        )}

        {activeView === "classes" && (
          <section className="teacher-classes">
            <form className="teacher-quiz-form" onSubmit={handleCreateClass}>
              <label>
                Class name
                <input required value={className} onChange={(event) => setClassName(event.target.value)} />
              </label>
              <button disabled={busy || !isSignedIn} type="submit">Create class</button>
            </form>
            <div className="student-quiz-list">
              {classrooms.map((classroom) => (
                <article className="student-quiz-option" key={classroom.id}>
                  <div className="teacher-class-details">
                    <h3>{classroom.name}</h3>
                    <p>Join code: <strong>{classroom.join_code}</strong></p>
                    {classroom.assignments.map((assignment) => (
                      <p key={assignment.id}>{assignment.quiz_title}</p>
                    ))}
                  </div>
                  <div className="teacher-class-assign">
                    <label>
                      Assign quiz
                      <select
                        aria-label={`Quiz for ${classroom.name}`}
                        disabled={quizzes.length === 0}
                        onChange={(event) => setSelectedQuizByClass((current) => ({
                          ...current,
                          [classroom.id]: event.target.value,
                        }))}
                        value={selectedQuizByClass[classroom.id] || quizzes[0]?.id || ""}
                      >
                        <option value="" disabled>No quizzes available</option>
                        {quizzes.map((quiz) => <option key={quiz.id} value={quiz.id}>{quiz.title}</option>)}
                      </select>
                    </label>
                    <button disabled={busy || quizzes.length === 0} onClick={() => handleAssignQuiz(classroom.id)} type="button">
                      Assign
                    </button>
                  </div>
                </article>
              ))}
              {classrooms.length === 0 && <p>No classes yet.</p>}
            </div>
          </section>
        )}
      </section>
    </main>
  )
}

export default TeacherDashboard
