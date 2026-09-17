import { useEffect, useState } from 'react'

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
