# SimpleQuiz Frontend

This folder contains the React frontend for our group project **SimpleQuiz**, an online quiz app designed for teachers and students. The frontend was created using Vite to keep the setup lightweight and fast during development.

## Overview

The frontend currently has two placeholder pages:

- **Teacher Dashboard** – This page will eventually allow teachers to create quizzes and review student responses.
- **Student Quiz** – This page will allow students to take quizzes and submit their answers.

Right now, these pages are placeholders. Additional functionality will be added later.

## Project Structure

```text
src/
components/              # Reusable UI components (empty for now)
pages/                   # Page-level components
    TeacherDashboard.jsx
    StudentQuiz.jsx
services/                # API functions (placeholders for now)
    apiService.js
styles/                  # Global styles
    global.css
App.jsx                  # App layout and routing
main.jsx                 # React entry point
```

## Routing

The app uses React Router for navigating:
- `/teacher` → Teacher Dashboard  
- `/student` → Student Quiz  

Currently, a simple header with navigation links appears at the top of the app.

## API Service

The file `src/services/apiService.js` has placeholder functions:
- `getQuiz()`
- `submitQuiz()`

These will be implemented later with backend communication.

## Running the Frontend

Make sure Node.js is installed.

To start the development server:
```bash
cd frontend
npm install
npm run dev
```

This will launch the app at the local Vite development URL (usually http://localhost:5173).

## Note
Currently the favicon (logo on the website) is the vite default logo, we can change this later when we have a SimpleQuiz logo.