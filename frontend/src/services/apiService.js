// Initial React implementation - empty API functions
export function getQuiz() {
  // Teammates will implement quiz retrieval here.
}

export async function submitQuiz(message) {
  const response = await fetch(
    "/api/test-put?message=" + message,
    {
      method: "PUT"
    }
  )

  return response.json()
}