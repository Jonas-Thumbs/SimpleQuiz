import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { useUser } from "@clerk/react-router"
import * as apiService from "../services/apiService.js"
import TeacherDashboard from "./TeacherDashboard.jsx"

vi.mock("@clerk/react-router", () => ({ useUser: vi.fn() }))

afterEach(() => vi.restoreAllMocks())

beforeEach(() => {
  useUser.mockReturnValue({
    isLoaded: true,
    isSignedIn: true,
    user: { id: "teacher_1" },
  })
  vi.spyOn(apiService, "getTeacherClasses").mockResolvedValue([])
  vi.spyOn(apiService, "getQuizzes").mockResolvedValue([
    { id: 8, title: "Biology quiz", description: "", question_count: 2 },
  ])
})

function renderDashboard() {
  return render(
    <MemoryRouter>
      <TeacherDashboard />
    </MemoryRouter>,
  )
}

describe("TeacherDashboard", () => {
  it("loads and displays per-question quiz results", async () => {
    vi.spyOn(apiService, "getQuickResultsTeacher").mockResolvedValue({
      quiz_title: "Biology quiz",
      total_attempts: 2,
      average_score: 1.5,
      questions: [
        {
          question_id: 1,
          question_text: "First question",
          correct_answers: 1,
          total_answers: 2,
        },
      ],
    })

    renderDashboard()
    fireEvent.click(await screen.findByRole("button", { name: "See Results" }))

    expect(await screen.findByText("Results: Biology quiz")).toBeInTheDocument()
    expect(screen.getByText("50% (1/2)")).toBeInTheDocument()
    expect(screen.getByText("1.5 pts")).toBeInTheDocument()
  })

  it("creates a class and assigns one of the teacher's quizzes", async () => {
    vi.spyOn(apiService, "createClassroom").mockResolvedValue({
      id: 5,
      name: "Biology",
      join_code: "ABC123",
      assignments: [],
    })
    const assignQuiz = vi.spyOn(apiService, "assignQuizToClass").mockResolvedValue({
      id: 9,
      quiz_id: 8,
      quiz_title: "Biology quiz",
    })

    renderDashboard()
    fireEvent.click(screen.getByRole("tab", { name: "Classes" }))
    fireEvent.change(screen.getByLabelText("Class name"), { target: { value: "Biology" } })
    fireEvent.click(screen.getByRole("button", { name: "Create class" }))

    expect(await screen.findByText("ABC123")).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Assign" }))
    await waitFor(() => expect(assignQuiz).toHaveBeenCalledWith(5, 8))
    await waitFor(() => expect(screen.getAllByText("Biology quiz")).toHaveLength(2))
  })
})
