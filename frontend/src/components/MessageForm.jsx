import { useState } from "react"
import { submitQuiz } from "../services/apiService"

// Displays a form that allows the user to send a message. 
function MessageForm() {
  const [message, setMessage] = useState("")
  const [response, setResponse] = useState("")

  // Submits the message and displays the response from the backend.
  async function handleSubmit(event) {
    event.preventDefault()

    const result = await submitQuiz(message)
    setResponse(result.yourmessage)
  }

  return (
    <div>
      <h2>Send Message</h2>

      <form onSubmit={handleSubmit}>
        <input
          value={message}
          onChange={(event) => setMessage(event.target.value)}
        />

        <button type="submit">Send</button>
      </form>

      <p>{response}</p>
    </div>
  )
}

export default MessageForm