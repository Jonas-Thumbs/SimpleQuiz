import { useEffect, useState } from 'react'
/**
 * Retrieves a message from the backend when the component loads
 * and displays the returned message.
 */
function BackendMessage() {
  const [message, setMessage] = useState('')

  useEffect(() => {
    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000'
    fetch(`${baseUrl}/api/`)
      .then((response) => response.json())
      .then((data) => setMessage(data.message))
      .catch((err) => console.error("Failed to fetch backend message:", err))
  }, [])

  return <p>{message}</p>
}

export default BackendMessage
