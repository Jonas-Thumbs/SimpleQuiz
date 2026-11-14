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

export function getOrCreateStudent(identity) {
  return request("/students/identity", {
    method: "POST",
    body: JSON.stringify(identity),
  })
}

export function createClassroom(classroom) {
  return request("/classes/", {
    method: "POST",
    body: JSON.stringify(classroom),
  })
}

export function getTeacherClasses(teacherClerkId) {
  return request(`/teachers/${encodeURIComponent(teacherClerkId)}/classes/`)
}

export function assignQuizToClass(classroomId, quizId) {
  return request(`/classes/${classroomId}/assignments/`, {
    method: "POST",
    body: JSON.stringify({ quiz_id: quizId }),
  })
}

export function joinClass(joinCode, studentId) {
  return request("/classes/join", {
    method: "POST",
    body: JSON.stringify({ join_code: joinCode, student_id: studentId }),
  })
}

export function getStudentQuizzes(studentId) {
  return request(`/students/${studentId}/quizzes/`)
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

export function setQuestionFlag(attemptId, questionId, isFlagged) {
  return request(`/attempts/${attemptId}/questions/${questionId}/flag`, {
    method: "PUT",
    body: JSON.stringify({ is_flagged: isFlagged }),
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

// quiz results for teacher dashboard
export async function getQuickResultsTeacher(quizId) {
  return request(`/quizzes/${quizId}/quick_results`);
}