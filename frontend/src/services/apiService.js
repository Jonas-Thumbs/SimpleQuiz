// Initial React implementation - empty API functions
export function getQuiz() {
  // Teammates will implement quiz retrieval here.
}

// Sends the message to the backend and returns the response.
export async function submitQuiz(message) {
  const response = await fetch(
    "/api/test-put?message=" + message,
    {
      method: "PUT"
    }
  )

  return response.json();
}

// Sends a new quiz configuration (including time_limit_minutes) to the backend.
export async function createQuiz(quizData) {
    const response = await fetch("/api/quizzes", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(quizData),
    });
    
    if (!response.ok) {
        throw new Error("Failed to create quiz");
    }
    
    return response.json();
}