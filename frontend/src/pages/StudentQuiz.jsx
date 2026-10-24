import { useEffect, useState } from "react"
import {
  getQuizzes,
  saveQuizAnswer,
  startQuiz,
  submitQuizAttempt,
} from "../services/apiService"

function StudentQuiz() {
  // Store API data and page state separately from the rendered form.
  const [quizzes, setQuizzes] = useState([])
  const [attempt, setAttempt] = useState(null)
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [result, setResult] = useState(null)
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    // Load the quiz list once when the student page opens.
    getQuizzes()
      .then(setQuizzes)
      .catch((requestError) => setError(requestError.message))
  }, [])

  // Starting again returns the existing in-progress attempt when available.
  async function handleStart(quizId) {
    setBusy(true)
    setError("")
    setResult(null)
    try {
      setAttempt(await startQuiz(quizId))
      setCurrentQuestionIndex(0)
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setBusy(false)
    }
  }

  // Update the UI immediately, then persist the selected answer to the API.
  async function handleAnswer(questionId, answerId) {
    setAttempt((current) => ({
      ...current,
      quiz: {
        ...current.quiz,
        questions: current.quiz.questions.map((question) =>
          question.id === questionId ? { ...question, selected_answer_id: answerId } : question,
        ),
      },
    }))
    setError("")
    try {
      await saveQuizAnswer(attempt.attempt_id, questionId, answerId)
    } catch (requestError) {
      setError(requestError.message)
    }
  }

  // The server grades saved answers and returns the final score.
  async function handleSubmit() {
    setBusy(true)
    setError("")
    try {
      setResult(await submitQuizAttempt(attempt.attempt_id))
      setAttempt(null)
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setBusy(false)
    }
  }

  const currentQuestion = attempt?.quiz.questions[currentQuestionIndex]
  const isFirstQuestion = currentQuestionIndex === 0
  const isLastQuestion = currentQuestionIndex === attempt?.quiz.questions.length - 1

  return (
    <main className="student-quiz-page">
      <section className="student-quiz-card">
        <p className="student-quiz-eyebrow">Student</p>
        <h1>{attempt ? attempt.quiz.title : "Take a Quiz"}</h1>
        {error && <p className="student-quiz-error" role="alert">{error}</p>}
        {result && (
          <div className="student-quiz-result" role="status">
            <p className="student-quiz-result-label">Submitted</p>
            <p className="student-quiz-score">
              {result.score} / {result.total_points}
            </p>
            <p>Your answers have been saved.</p>
            <button onClick={() => setResult(null)}>Back to quizzes</button>
          </div>
        )}

        {!attempt && !result && (
          <div className="student-quiz-list">
            {quizzes.map((quiz) => (
              <article className="student-quiz-option" key={quiz.id}>
                <div>
                  <h2>{quiz.title}</h2>
                  <p>{quiz.description}</p>
                  <span>{quiz.question_count} questions</span>
                </div>
                <button disabled={busy} onClick={() => handleStart(quiz.id)}>
                  Start
                </button>
              </article>
            ))}
            {quizzes.length === 0 && !error && <p>Loading quizzes...</p>}
          </div>
        )}

        {attempt && currentQuestion && (
          <div className="student-quiz-question">
            <div className="student-quiz-progress">
              <span>
                Question {currentQuestionIndex + 1} of {attempt.quiz.questions.length}
              </span>
              <span>{currentQuestion.points} point{currentQuestion.points === 1 ? "" : "s"}</span>
            </div>
            <h2>{currentQuestion.text}</h2>
            <div className="student-quiz-answers">
              {currentQuestion.answers.map((answer) => (
                <button
                  className={
                    currentQuestion.selected_answer_id === answer.id
                      ? "student-quiz-answer selected"
                      : "student-quiz-answer"
                  }
                  key={answer.id}
                  onClick={() => handleAnswer(currentQuestion.id, answer.id)}
                  type="button"
                >
                  {answer.text}
                </button>
              ))}
            </div>
            <div className="student-quiz-actions">
              <button
                disabled={isFirstQuestion}
                onClick={() => setCurrentQuestionIndex((index) => index - 1)}
                type="button"
              >
                Back
              </button>
              {isLastQuestion ? (
                <button disabled={busy} onClick={handleSubmit} type="button">
                  Submit quiz
                </button>
              ) : (
                <button
                  onClick={() => setCurrentQuestionIndex((index) => index + 1)}
                  type="button"
                >
                  Next
                </button>
              )}
            </div>
          </div>
        )}
      </section>
    </main>
  )
}

export default StudentQuiz