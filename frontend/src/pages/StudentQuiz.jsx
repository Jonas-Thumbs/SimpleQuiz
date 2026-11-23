import { useEffect, useState, useCallback, useRef } from "react"
import { useUser } from "@clerk/react-router"
import {
  getOrCreateStudent,
  getStudentQuizzes,
  joinClass,
  saveQuizAnswer,
  setQuestionFlag,
  startQuiz,
  submitQuizAttempt,
} from "../services/apiService"

function formatRemainingTime(totalSeconds) {
  const safeSeconds = Math.max(0, totalSeconds)
  const minutes = Math.floor(safeSeconds / 60)
  const seconds = safeSeconds % 60
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
}

function StudentQuiz() {
  const { isLoaded, isSignedIn, user } = useUser()
  // Store API data and page state separately from the rendered form.
  const [quizzes, setQuizzes] = useState([])
  const [student, setStudent] = useState(null)
  const [loadedUserId, setLoadedUserId] = useState(null)
  const [joinCode, setJoinCode] = useState("")
  const [notice, setNotice] = useState("")
  const [attempt, setAttempt] = useState(null)
  const [secondsLeft, setSecondsLeft] = useState(null)
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [result, setResult] = useState(null)
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)
  const [savingQuestionId, setSavingQuestionId] = useState(null)
  const [savingFlagQuestionId, setSavingFlagQuestionId] = useState(null)
  const hasSubmittedRef = useRef(false)

  useEffect(() => {
    if (!isLoaded) return
    if (!isSignedIn || !user) return

    let active = true
    const email = user.primaryEmailAddress?.emailAddress
      || user.emailAddresses?.[0]?.emailAddress
      || ""
    const name = user.fullName
      || [user.firstName, user.lastName].filter(Boolean).join(" ")
      || email
      || "Student"

    getOrCreateStudent({ clerk_user_id: user.id, name, email })
      .then((savedStudent) => {
        if (active) setStudent(savedStudent)
        return getStudentQuizzes(savedStudent.id)
      })
      .then((assignedQuizzes) => {
        if (active) setQuizzes(assignedQuizzes)
      })
      .catch((requestError) => {
        if (active) setError(requestError.message)
      })
      .finally(() => {
        if (active) setLoadedUserId(user.id)
      })

    return () => {
      active = false
    }
  }, [isLoaded, isSignedIn, user])

  const refreshAssignedQuizzes = useCallback(async (studentId = student?.id) => {
    if (!studentId) return
    setQuizzes(await getStudentQuizzes(studentId))
  }, [student?.id])

  const handleSubmit = useCallback(async () => {
    if (!attempt || hasSubmittedRef.current) return
    hasSubmittedRef.current = true
    setBusy(true)
    setError("")
    try {
      const submissionResult = await submitQuizAttempt(attempt.attempt_id)
      setSecondsLeft(null)
      setAttempt(null)
      setResult(submissionResult)
      await refreshAssignedQuizzes()
    } catch (requestError) {
      hasSubmittedRef.current = false
      setError(requestError.message)
    } finally {
      setBusy(false)
    }
  }, [attempt, refreshAssignedQuizzes])

  async function handleJoinClass(event) {
    event.preventDefault()
    if (!student) return

    setBusy(true)
    setError("")
    setNotice("")
    try {
      const joinedClass = await joinClass(joinCode, student.id)
      setJoinCode("")
      setNotice(`Joined ${joinedClass.class_name}.`)
      await refreshAssignedQuizzes(student.id)
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setBusy(false)
    }
  }

  // Starting again returns the existing in-progress attempt when available.
  async function handleStart(quizId) {
    setBusy(true)
    setError("")
    setResult(null)
    hasSubmittedRef.current = false
    try {
      const startedAttempt = await startQuiz(quizId, student.id)
      const matchedQuiz = quizzes.find((item) => item.quiz_id === quizId)
      const limitMinutes = startedAttempt.quiz?.time_limit_minutes ?? matchedQuiz?.time_limit_minutes
      setAttempt(startedAttempt)
      setSecondsLeft(
        typeof limitMinutes === "number" && limitMinutes > 0
          ? Math.round(limitMinutes * 60)
          : null,
      )
      setCurrentQuestionIndex(0)
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    if (!attempt || secondsLeft === null) return

    if (secondsLeft <= 0) {
      handleSubmit()
      return
    }

    const timerId = window.setInterval(() => {
      setSecondsLeft((prev) => (prev === null ? null : Math.max(0, prev - 1)))
    }, 1000)

    return () => window.clearInterval(timerId)
  }, [attempt, secondsLeft, handleSubmit])

  // Update the UI immediately, then persist the selected answer to the API.
  async function handleAnswer(questionId, answerId) {
    if (savingQuestionId !== null || secondsLeft === 0) return

    const previousAnswerId = attempt.quiz.questions.find(
      (question) => question.id === questionId,
    )?.selected_answer_id
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
    setSavingQuestionId(questionId)
    try {
      await saveQuizAnswer(attempt.attempt_id, questionId, answerId)
    } catch (requestError) {
      setAttempt((current) => current && current.attempt_id === attempt.attempt_id
        ? {
            ...current,
            quiz: {
              ...current.quiz,
              questions: current.quiz.questions.map((question) =>
                question.id === questionId
                  ? { ...question, selected_answer_id: previousAnswerId }
                  : question,
              ),
            },
          }
        : current)
      setError(requestError.message)
    } finally {
      setSavingQuestionId(null)
    }
  }

  async function handleFlagQuestion(questionId) {
    if (savingFlagQuestionId !== null || secondsLeft === 0) return
    const question = attempt.quiz.questions.find((item) => item.id === questionId)
    const previousFlag = question.is_flagged
    const nextFlag = !previousFlag

    setAttempt((current) => ({
      ...current,
      quiz: {
        ...current.quiz,
        questions: current.quiz.questions.map((item) =>
          item.id === questionId ? { ...item, is_flagged: nextFlag } : item,
        ),
      },
    }))
    setError("")
    setSavingFlagQuestionId(questionId)
    try {
      await setQuestionFlag(attempt.attempt_id, questionId, nextFlag)
    } catch (requestError) {
      setAttempt((current) => current && current.attempt_id === attempt.attempt_id
        ? {
            ...current,
            quiz: {
              ...current.quiz,
              questions: current.quiz.questions.map((item) =>
                item.id === questionId ? { ...item, is_flagged: previousFlag } : item,
              ),
            },
          }
        : current)
      setError(requestError.message)
    } finally {
      setSavingFlagQuestionId(null)
    }
  }

  const currentQuestion = attempt?.quiz.questions[currentQuestionIndex]
  const studentLoading = !isLoaded || Boolean(
    isSignedIn && user && loadedUserId !== user.id,
  )
  const isFirstQuestion = currentQuestionIndex === 0
  const isLastQuestion = currentQuestionIndex === attempt?.quiz.questions.length - 1
  const timeExpired = secondsLeft === 0

  return (
    <main className="student-quiz-page">
      <section className="student-quiz-card">
        <p className="student-quiz-eyebrow">Student</p>
        <h1>{attempt ? attempt.quiz.title : "Take a Quiz"}</h1>
        {error && <p className="student-quiz-error" role="alert">{error}</p>}
        {notice && <p role="status">{notice}</p>}
        {result && (
          <div className="student-quiz-result" role="status">
            <p className="student-quiz-result-label">Submitted</p>
            <p className="student-quiz-score">
              {result.score} / {result.total_points}
            </p>
            <p className="student-quiz-percentage">
              {result.total_points === 0
                ? 0
                : Math.round((result.score / result.total_points) * 100)}%
            </p>
            <p>Your answers have been saved.</p>
            <div className="student-quiz-feedback" aria-label="Question feedback">
              {result.results?.map((questionResult, index) => (
                <article className="student-quiz-feedback-item" key={questionResult.question_id}>
                  <h2>Question {index + 1}: {questionResult.question_text}</h2>
                  <p className={questionResult.is_correct ? "feedback-correct" : "feedback-incorrect"}>
                    {questionResult.is_correct ? "Correct" : "Incorrect"}
                    {` · ${questionResult.points_earned} / ${questionResult.points} points`}
                  </p>
                  <p>Your answer: {questionResult.your_answer || "No answer"}</p>
                  {!questionResult.is_correct && (
                    <p>Correct answer: {questionResult.correct_answer || "Not available"}</p>
                  )}
                </article>
              ))}
            </div>
            <button onClick={() => setResult(null)}>Back to quizzes</button>
          </div>
        )}

        {!attempt && !result && (
          studentLoading || !isLoaded ? (
            <p>Loading your classes...</p>
          ) : !isSignedIn ? (
            <p>Sign in to join classes and see assigned quizzes.</p>
          ) : (
            <div className="student-class-dashboard">
              <form className="join-class-form" onSubmit={handleJoinClass}>
                <label htmlFor="class-join-code">Join a class</label>
                <div>
                  <input
                    id="class-join-code"
                    autoCapitalize="characters"
                    maxLength={6}
                    required
                    value={joinCode}
                    onChange={(event) => setJoinCode(event.target.value.toUpperCase())}
                  />
                  <button disabled={busy || joinCode.trim().length === 0} type="submit">
                    Join
                  </button>
                </div>
              </form>
              <h2>Assigned quizzes</h2>
              <div className="student-quiz-list">
                {quizzes.map((quiz) => (
                  <article className="student-quiz-option" key={quiz.quiz_id}>
                    <div>
                      <h3>{quiz.title}</h3>
                      <p>{quiz.description}</p>
                      <span>{quiz.question_count} questions</span>
                      <span>{quiz.class_names.join(", ")}</span>
                      {quiz.status === "completed" && (
                        <p>Completed: {quiz.score} / {quiz.total_points} points</p>
                      )}
                    </div>
                    {quiz.status === "completed" ? (
                      <button disabled type="button">Completed</button>
                    ) : (
                      <button disabled={busy} onClick={() => handleStart(quiz.quiz_id)}>
                        {quiz.status === "in_progress" ? "Continue" : "Start"}
                      </button>
                    )}
                  </article>
                ))}
                {quizzes.length === 0 && !error && <p>Join a class to see assigned quizzes.</p>}
              </div>
            </div>
          )
        )}

        {attempt && currentQuestion && (
          <div className="student-quiz-question">
            <nav className="student-question-nav" aria-label="Question navigation">
              {attempt.quiz.questions.map((question, index) => (
                <button
                  aria-current={index === currentQuestionIndex ? "step" : undefined}
                  aria-label={`Go to question ${index + 1}${question.is_flagged ? ", flagged for review" : ""}`}
                  className={[
                    index === currentQuestionIndex ? "current" : "",
                    question.is_flagged ? "flagged" : "",
                  ].filter(Boolean).join(" ")}
                  disabled={savingQuestionId !== null || savingFlagQuestionId !== null || busy || timeExpired}
                  key={question.id}
                  onClick={() => setCurrentQuestionIndex(index)}
                  type="button"
                >
                  {index + 1}{question.is_flagged ? " *" : ""}
                </button>
              ))}
            </nav>
            <div className="student-quiz-progress">
              <span>
                Question {currentQuestionIndex + 1} of {attempt.quiz.questions.length}
              </span>
              {secondsLeft !== null && (
                <span role="timer" aria-label="Time remaining">
                  Time remaining: {formatRemainingTime(secondsLeft)}
                </span>
              )}
              <span>{currentQuestion.points} point{currentQuestion.points === 1 ? "" : "s"}</span>
            </div>
            <h2>{currentQuestion.text}</h2>
            <button
              aria-pressed={Boolean(currentQuestion.is_flagged)}
              disabled={savingFlagQuestionId !== null || busy || timeExpired}
              onClick={() => handleFlagQuestion(currentQuestion.id)}
              type="button"
            >
              {currentQuestion.is_flagged ? "Remove review flag" : "Flag for review"}
            </button>
            <div className="student-quiz-answers">
              {currentQuestion.answers.map((answer) => (
                <button
                  className={
                    currentQuestion.selected_answer_id === answer.id
                      ? "student-quiz-answer selected"
                      : "student-quiz-answer"
                  }
                  key={answer.id}
                  disabled={savingQuestionId !== null || busy || timeExpired}
                  onClick={() => handleAnswer(currentQuestion.id, answer.id)}
                  type="button"
                >
                  {answer.text}
                </button>
              ))}
            </div>
            <div className="student-quiz-actions">
              <button
                disabled={isFirstQuestion || savingQuestionId !== null || busy || timeExpired}
                onClick={() => setCurrentQuestionIndex((index) => index - 1)}
                type="button"
              >
                Back
              </button>
              {isLastQuestion ? (
                <button disabled={busy || savingQuestionId !== null || timeExpired} onClick={handleSubmit} type="button">
                  Submit quiz
                </button>
              ) : (
                <button
                  disabled={savingQuestionId !== null || busy || timeExpired}
                  onClick={() => setCurrentQuestionIndex((index) => index + 1)}
                  type="button"
                >
                  Next
                </button>
              )}
            </div>
            {savingQuestionId !== null && <p role="status">Saving answer...</p>}
          </div>
        )}
      </section>
    </main>
  )
}

export default StudentQuiz