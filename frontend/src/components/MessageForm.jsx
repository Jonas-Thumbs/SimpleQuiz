import { useState } from "react"
import { submitQuiz } from "../services/apiService"

function MessageForm() {
  const [message, setMessage] = useState("")
  const [response, setResponse] = useState("")

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