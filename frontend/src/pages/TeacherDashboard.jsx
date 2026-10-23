import React, { useState } from 'react'
import BackendMessage from '../components/BackendMessage.jsx'
/**
 * Displays the teacher dashboard and the message from the backend.
 */
function TeacherDashboard() {
  const [timeLimitMinutes, setTimeLimitMinutes] = useState('');
  return (
    <section>
      <h1>Teacher Dashboard</h1>
      <BackendMessage />
      <div className="mt-4 p-3 border rounded">
        <h3>Create Quiz - Time Limit</h3>
        <div className="mb-3">
          <label htmlFor="timeLimit" className="form-label">Time Limit (Minutes)</label>
          <input
              type="number"
              id="timeLimit"
              className="form-control"
              placeholder="Optional (e.g., 20)"
              min="1"
              value={timeLimitMinutes}
              onChange={(e) => setTimeLimitMinutes(e.target.value)}
          />
          <div className="form-text">Set a time limit for students taking this quiz (Issue #65).</div>
        </div>
      </div>
    </section>
  )
}

export default TeacherDashboard
