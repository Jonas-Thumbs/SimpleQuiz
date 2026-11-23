import { act, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { useUser } from "@clerk/react-router"
import * as apiService from "../services/apiService.js"
import StudentQuiz from "./StudentQuiz.jsx"

vi.mock("@clerk/react-router", () => ({ useUser: vi.fn() }))

const student = { id: 4, name: "Test Student", email: "student@example.com" }
const assignedQuizzes = [
  {
    quiz_id: 3,
    title: "Autosave quiz",
    description: "",
    question_count: 2,
    total_points: 2,
    class_names: ["Biology"],
    status: "not_started",
    score: null,
  },
]

const quizAttempt = {
  attempt_id: 7,
  status: "in_progress",
  quiz: {
    title: "Autosave quiz",
    questions: [
      {
        id: 11,
        text: "First question",
        points: 1,
        selected_answer_id: null,
        answers: [
          { id: 21, text: "Option A" },
          { id: 22, text: "Option B" },
        ],
      },
      {
        id: 12,
        text: "Second question",
        points: 1,
        selected_answer_id: null,
        answers: [{ id: 23, text: "Option C" }],
      },
    ],
  },
}

afterEach(() => {
  vi.restoreAllMocks()
})

beforeEach(() => {
  useUser.mockReturnValue({
    isLoaded: true,
    isSignedIn: true,
    user: {
      id: "user_student_1",
      fullName: "Test Student",
      primaryEmailAddress: { emailAddress: "student@example.com" },
    },
  })
  vi.spyOn(apiService, "getOrCreateStudent").mockResolvedValue(student)
  vi.spyOn(apiService, "getStudentQuizzes").mockResolvedValue(assignedQuizzes)
})

async function openQuiz() {
  vi.spyOn(apiService, "startQuiz").mockResolvedValue(quizAttempt)
  render(<StudentQuiz />)
  fireEvent.click(await screen.findByRole("button", { name: "Start" }))
  await screen.findByText("First question")
}

describe("StudentQuiz autosave", () => {
  it("waits for the selected answer to save before allowing navigation", async () => {
    let resolveSave
    const savePromise = new Promise((resolve) => {
      resolveSave = resolve
    })
    const saveAnswer = vi.spyOn(apiService, "saveQuizAnswer").mockReturnValue(savePromise)

    await openQuiz()
    fireEvent.click(screen.getByRole("button", { name: "Option A" }))

    expect(saveAnswer).toHaveBeenCalledWith(7, 11, 21)
    expect(screen.getByRole("status")).toHaveTextContent("Saving answer")
    expect(screen.getByRole("button", { name: "Next" })).toBeDisabled()

    resolveSave({ saved: true })
    await waitFor(() => expect(screen.queryByRole("status")).not.toBeInTheDocument())
    expect(screen.getByRole("button", { name: "Next" })).toBeEnabled()
  })

  it("restores the previous answer when saving a changed selection fails", async () => {
    vi.spyOn(apiService, "saveQuizAnswer")
      .mockResolvedValueOnce({ saved: true })
      .mockRejectedValueOnce(new Error("Connection lost"))

    await openQuiz()
    fireEvent.click(screen.getByRole("button", { name: "Option A" }))
    await waitFor(() => expect(screen.queryByRole("status")).not.toBeInTheDocument())
    expect(screen.getByRole("button", { name: "Option A" })).toHaveClass("selected")

    fireEvent.click(screen.getByRole("button", { name: "Option B" }))
    expect(await screen.findByRole("alert")).toHaveTextContent("Connection lost")
    expect(screen.getByRole("button", { name: "Option A" })).toHaveClass("selected")
    expect(screen.getByRole("button", { name: "Option B" })).not.toHaveClass("selected")
  })

  it("joins a class and displays the quizzes assigned to it", async () => {
    const joinRequest = vi.spyOn(apiService, "joinClass").mockResolvedValue({
      joined: true,
      class_name: "Biology",
    })

    render(<StudentQuiz />)
    expect(await screen.findByText("Assigned quizzes")).toBeInTheDocument()
    expect(screen.getByText("Autosave quiz")).toBeInTheDocument()
    expect(screen.getByText("Biology")).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText("Join a class"), { target: { value: "abc123" } })
    fireEvent.click(screen.getByRole("button", { name: "Join" }))

    await waitFor(() => expect(joinRequest).toHaveBeenCalledWith("ABC123", 4))
    expect(await screen.findByText("Joined Biology.")).toBeInTheDocument()
    expect(apiService.getOrCreateStudent).toHaveBeenCalledWith({
      clerk_user_id: "user_student_1",
      name: "Test Student",
      email: "student@example.com",
    })
  })

  it("shows completed quiz history and score", async () => {
    vi.spyOn(apiService, "getStudentQuizzes").mockResolvedValue([
      { ...assignedQuizzes[0], status: "completed", score: 1 },
    ])

    render(<StudentQuiz />)

    expect(await screen.findByText("Completed: 1 / 2 points")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Completed" })).toBeDisabled()
  })

  it("persists a review flag and marks the question in navigation", async () => {
    vi.spyOn(apiService, "setQuestionFlag").mockResolvedValue({ is_flagged: true })
    vi.spyOn(apiService, "startQuiz").mockResolvedValue({
      ...quizAttempt,
      quiz: {
        ...quizAttempt.quiz,
        questions: quizAttempt.quiz.questions.map((question) => ({
          ...question,
          is_flagged: false,
        })),
      },
    })

    await openQuiz()
    fireEvent.click(screen.getByRole("button", { name: "Flag for review" }))

    await waitFor(() => expect(apiService.setQuestionFlag).toHaveBeenCalledWith(7, 11, true))
    expect(screen.getByRole("button", { name: "Remove review flag" })).toHaveAttribute("aria-pressed", "true")
    expect(screen.getByRole("button", { name: "Go to question 1, flagged for review" })).toHaveClass("flagged")
  })

  it("shows percentage and per-question feedback after submitting", async () => {
    vi.spyOn(apiService, "startQuiz").mockResolvedValue(quizAttempt)
    vi.spyOn(apiService, "submitQuizAttempt").mockResolvedValue({
      score: 1,
      total_points: 2,
      results: [
        {
          question_id: 11,
          question_text: "First question",
          your_answer: "Option A",
          correct_answer: "Option A",
          is_correct: true,
          points: 1,
          points_earned: 1,
        },
        {
          question_id: 12,
          question_text: "Second question",
          your_answer: null,
          correct_answer: "Option C",
          is_correct: false,
          points: 1,
          points_earned: 0,
        },
      ],
    })

    render(<StudentQuiz />)
    fireEvent.click(await screen.findByRole("button", { name: "Start" }))
    await screen.findByText("First question")
    fireEvent.click(screen.getByRole("button", { name: "Next" }))
    fireEvent.click(await screen.findByRole("button", { name: "Submit quiz" }))

    expect(await screen.findByText("50%")).toBeInTheDocument()
    expect(screen.getByText("Your answer: No answer")).toBeInTheDocument()
    expect(screen.getByText("Correct answer: Option C")).toBeInTheDocument()
    expect(screen.getByText(/Correct · 1 \/ 1 points/)).toBeInTheDocument()
    expect(screen.getByText(/Incorrect · 0 \/ 1 points/)).toBeInTheDocument()
  })
})

describe("StudentQuiz time limit", () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  async function flushReact(ticks = 4) {
    await act(async () => {
      for (let i = 0; i < ticks; i += 1) {
        await Promise.resolve()
      }
    })
  }

  it("automatically submits the quiz once when the time limit elapses", async () => {
    vi.useFakeTimers()

    const timedAttempt = {
      ...quizAttempt,
      quiz: {
        ...quizAttempt.quiz,
        time_limit_minutes: 1,
      },
    }
    vi.spyOn(apiService, "startQuiz").mockResolvedValue(timedAttempt)
    const submitSpy = vi.spyOn(apiService, "submitQuizAttempt").mockResolvedValue({
      score: 1,
      total_points: 2,
      results: [],
    })

    await act(async () => {
      render(<StudentQuiz />)
    })
    await flushReact()

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Start" }))
    })
    await flushReact()

    expect(screen.getByText("First question")).toBeInTheDocument()
    expect(screen.getByRole("timer")).toHaveTextContent("Time remaining: 01:00")

    // Advance 59 seconds: 00:01 remaining, not submitted yet
    await act(async () => {
      await vi.advanceTimersByTimeAsync(59_000)
    })
    expect(screen.getByRole("timer")).toHaveTextContent("Time remaining: 00:01")
    expect(submitSpy).not.toHaveBeenCalled()

    // Advance 1 more second to 00:00: auto-submits once
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_000)
    })
    await flushReact()

    expect(submitSpy).toHaveBeenCalledTimes(1)
    expect(submitSpy).toHaveBeenCalledWith(7)
    expect(screen.getByText("Submitted")).toBeInTheDocument()
  })

  it("does not start a countdown timer when a quiz has no time limit", async () => {
    vi.useFakeTimers()

    vi.spyOn(apiService, "startQuiz").mockResolvedValue(quizAttempt)
    const submitSpy = vi.spyOn(apiService, "submitQuizAttempt").mockResolvedValue({
      score: 0,
      total_points: 2,
      results: [],
    })

    await act(async () => {
      render(<StudentQuiz />)
    })
    await flushReact()

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Start" }))
    })
    await flushReact()

    expect(screen.getByText("First question")).toBeInTheDocument()
    expect(screen.queryByRole("timer")).not.toBeInTheDocument()

    await act(async () => {
      await vi.advanceTimersByTimeAsync(120_000)
    })
    await flushReact()

    expect(submitSpy).not.toHaveBeenCalled()
  })
})