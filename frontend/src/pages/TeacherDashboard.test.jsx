import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import TeacherDashboard from './TeacherDashboard.jsx'

describe('TeacherDashboard Component', () => {
    it('renders the time limit input field for Issue 65', () => {
        render(<TeacherDashboard />)
        
        // Verify the time limit label/input is present
        const timeLimitInput = screen.getByLabelText(/Time Limit \(Minutes\)/i)
        expect(timeLimitInput).toBeDefined()
    })
})