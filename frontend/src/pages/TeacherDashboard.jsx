import React, { useState } from 'react'
import BackendMessage from '../components/BackendMessage.jsx'
import { createQuiz } from '../services/apiService.js'
/**
 * Displays the teacher dashboard and the message from the backend.
 */
function TeacherDashboard() {
    const [title, setTitle] = useState('')
    const [description, setDescription] = useState('')
    const [timeLimitMinutes, setTimeLimitMinutes] = useState('')
    const [statusMessage, setStatusMessage] = useState('')

    const handleSubmit = async (e) => {
        e.preventDefault()
        try {
            const newQuiz = {
                title,
                description,
                time_limit_minutes: timeLimitMinutes ? parseInt(timeLimitMinutes, 10) : null
            }
            await createQuiz(newQuiz)
            setStatusMessage('Quiz created successfully!')
            setTitle('')
            setDescription('')
            setTimeLimitMinutes('')
        } catch (err) {
            setStatusMessage('Failed to create quiz.')
        }
    }

    return (
        <section>
            <h1>Teacher Dashboard</h1>
            <BackendMessage />
            
            <form onSubmit={handleSubmit} className="mt-4 p-3 border rounded">
                <h3>Create Quiz - Time Limit</h3>

                <div className="mb-3">
                    <label htmlFor="title" className="form-label">Quiz Title</label>
                    <input
                        type="text"
                        id="title"
                        className="form-control"
                        placeholder="Enter quiz title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        required
                    />
                </div>

                <div className="mb-3">
                    <label htmlFor="description" className="form-label">Description</label>
                    <textarea
                        id="description"
                        className="form-control"
                        placeholder="Enter quiz description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                    />
                </div>

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
                    <div className="form-text">Set a time limit for students taking this quiz (Issue #65)</div>
                </div>

                <button type="submit" className="btn btn-primary">Create Quiz</button>
                {statusMessage && <p className="mt-2 text-info">{statusMessage}</p>}
            </form>
        </section>
    )
}

export default TeacherDashboard
