// Keep HTTP details and error handling in one place for the page functions.
async function request(path, options = {}) {
  const response = await fetch(`/api${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.detail || "The request failed")
  }

  return response.json()
}

// These functions mirror the backend's quiz and attempt endpoints.
export function getQuizzes() {
  return request("/quizzes/")
}

export function createQuiz(quiz) {
  return request("/quizzes/", {
    method: "POST",
    body: JSON.stringify(quiz),
  })
}

export function createQuestion(question) {
  return request("/questions/", {
    method: "POST",
    body: JSON.stringify(question),
  })
}

export function createAnswer(answer) {
  return request("/answers/", {
    method: "POST",
    body: JSON.stringify(answer),
  })
}

export function startQuiz(quizId, studentId = 1) {
  return request(`/quizzes/${quizId}/attempts`, {
    method: "POST",
    body: JSON.stringify({ student_id: studentId }),
  })
}

export function saveQuizAnswer(attemptId, questionId, answerId) {
  return request(`/attempts/${attemptId}/answers/${questionId}`, {
    method: "PUT",
    body: JSON.stringify({ answer_id: answerId }),
  })
}

export function submitQuizAttempt(attemptId) {
  return request(`/attempts/${attemptId}/submit`, { method: "POST" })
}

export async function submitQuiz(message) {
  const response = await fetch(
    "/api/test-put?message=" + encodeURIComponent(message),
    { method: "PUT" },
  )

  return response.json();
}
