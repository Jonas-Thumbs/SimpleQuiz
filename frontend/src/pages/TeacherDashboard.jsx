import { useState } from "react"
import {
  createAnswer,
  createQuestion,
  createQuiz,
} from "../services/apiService"

function TeacherDashboard() {
  const [quiz, setQuiz] = useState(null)
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [questionText, setQuestionText] = useState("")
  const [answerOne, setAnswerOne] = useState("")
  const [answerTwo, setAnswerTwo] = useState("")
  const [correctAnswer, setCorrectAnswer] = useState("")
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)

  async function handleCreateQuiz(event) {
    event.preventDefault()
    setBusy(true)
    setError("")
    setMessage("")
    try {
      const createdQuiz = await createQuiz({ title, description })
      setQuiz(createdQuiz)
      setMessage(`Created "${createdQuiz.title}". Add its first question below.`)
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setBusy(false)
    }
  }

  async function handleCreateQuestion(event) {
    event.preventDefault()
    setBusy(true)
    setError("")
    setMessage("")
    try {
      const question = await createQuestion({
        quiz_id: quiz.id,
        question_text: questionText,
        question_type: "multiple_choice",
        question_order: 1,
        points: 1,
      })
      const answers = [answerOne, answerTwo]
      for (const [index, answerText] of answers.entries()) {
        await createAnswer({
          question_id: question.id,
          answer_text: answerText,
          is_correct: answerText === correctAnswer,
          answer_order: index + 1,
        })
      }
      setQuestionText("")
      setAnswerOne("")
      setAnswerTwo("")
      setCorrectAnswer("")
      setMessage("Question saved. The quiz is ready for students.")
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="student-quiz-page">
      <section className="student-quiz-card">
        <p className="student-quiz-eyebrow">Teacher</p>
        <h1>Create a Quiz</h1>
        {error && <p className="student-quiz-error" role="alert">{error}</p>}
        {message && <p role="status">{message}</p>}

        {!quiz && (
          <form className="teacher-quiz-form" onSubmit={handleCreateQuiz}>
            <label>
              Quiz title
              <input
                required
                value={title}
                onChange={(event) => setTitle(event.target.value)}
              />
            </label>
            <label>
              Description
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
              />
            </label>
            <button disabled={busy} type="submit">Create quiz</button>
          </form>
        )}

        {quiz && (
          <form className="teacher-quiz-form" onSubmit={handleCreateQuestion}>
            <h2>{quiz.title}</h2>
            <label>
              Question
              <input
                required
                value={questionText}
                onChange={(event) => setQuestionText(event.target.value)}
              />
            </label>
            <label>
              First answer
              <input
                required
                value={answerOne}
                onChange={(event) => setAnswerOne(event.target.value)}
              />
            </label>
            <label>
              Second answer
              <input
                required
                value={answerTwo}
                onChange={(event) => setAnswerTwo(event.target.value)}
              />
            </label>
            <label>
              Correct answer
              <select
                required
                value={correctAnswer}
                onChange={(event) => setCorrectAnswer(event.target.value)}
              >
                <option value="">Choose the correct answer</option>
                {answerOne && <option value={answerOne}>{answerOne}</option>}
                {answerTwo && <option value={answerTwo}>{answerTwo}</option>}
              </select>
            </label>
            <button disabled={busy} type="submit">Save question</button>
          </form>
        )}
      </section>
    </main>
  )
}

export default TeacherDashboard
