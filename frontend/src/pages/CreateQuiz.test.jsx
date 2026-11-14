import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, it, expect, vi } from "vitest";
import * as apiService from "../services/apiService.js";
import CreateQuiz from "./CreateQuiz.jsx";

afterEach(() => vi.restoreAllMocks());

describe("CreateQuiz Component", () => {
  it("renders the time limit input field for Issue 65", () => {
    render(<CreateQuiz />);

    // Verify the time limit label/input is present
    const timeLimitInput = screen.getByLabelText(/Time limit \(minutes, optional\)/i);
    expect(timeLimitInput).toBeDefined();
  });

  it("assigns increasing question orders when adding multiple questions", async () => {
    vi.spyOn(apiService, "createQuiz").mockResolvedValue({ id: 42, title: "Four questions" });
    const createQuestion = vi.spyOn(apiService, "createQuestion")
      .mockImplementation(async (question) => ({ id: question.question_order }));
    vi.spyOn(apiService, "createAnswer").mockResolvedValue({});

    render(<CreateQuiz />);
    fireEvent.change(screen.getByLabelText("Quiz title"), { target: { value: "Four questions" } });
    fireEvent.click(screen.getByRole("button", { name: "Create quiz" }));
    await screen.findByRole("heading", { name: "Four questions" });

    for (let questionNumber = 1; questionNumber <= 4; questionNumber += 1) {
      fireEvent.change(screen.getByLabelText("Question"), {
        target: { value: `Question ${questionNumber}` },
      });
      fireEvent.change(screen.getByLabelText("First answer"), { target: { value: "Yes" } });
      fireEvent.change(screen.getByLabelText("Second answer"), { target: { value: "No" } });
      fireEvent.change(screen.getByLabelText("Correct answer"), { target: { value: "Yes" } });
      fireEvent.click(screen.getByRole("button", { name: "Save question" }));
      await waitFor(() => {
        expect(screen.getByText("Question saved. Add another or finish the quiz.")).toBeInTheDocument();
      });
    }

    expect(createQuestion.mock.calls.map(([question]) => question.question_order)).toEqual([1, 2, 3, 4]);
  });
});
