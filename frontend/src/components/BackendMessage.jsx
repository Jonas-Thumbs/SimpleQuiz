import { useEffect, useState } from 'react'
/**
 * Retrieves a message from the backend when the component loads
 * and displays the returned message.
 */
function BackendMessage() {
  const [message, setMessage] = useState('')

  useEffect(() => {
    fetch('/api/')
      .then((response) => response.json())
      .then((data) => setMessage(data.message))
  }, [])

  return <p>{message}</p>
}

export default BackendMessage
