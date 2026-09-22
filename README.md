# SimpleQuiz - Local Developement Setup

SimpleQuiz is a group project for building an online quiz app for teachers and students.

The project currently has a React frontend and a FastAPI backend. The frontend is set up with Vite and includes the basic page structure for the teacher and student experiences. The backend is running with uv and is ready for endpoint development.

## Frontend
Located in `frontend/` and uses Vite for local development.
Right now, it includes:
- Placeholder pages for the Teacher Dashboard and Student Quiz.
- Routing for `/teacher` and `/student`.
- Simple global styling.
- Placeholder functions in `src/services/apiService.js` for future API work.

To install the frontend dependencies and start the development server:
```bash
cd frontend
npm install
npm run dev
```

Vite will display the local URL for the frontend, usually `http://localhost:5173`.

## Backend
* Navigate to `backend/` directory
* [Install uv](https://docs.astral.sh/uv/getting-started/installation/), e.g. using WinGet: `winget install --id=astral-sh.uv  -e`
* Start the server: `uv run fastapi dev`
* See [FastAPI documentation](https://fastapi.tiangolo.com/#fastapi-mini-documentary) for help.
* If needed, add additional dependencies to `pyproject.toml`. 

### Testing the Backend

From the `SimpleQuiz/` folder, run:

```bash
uv run --project backend uvicorn backend.main:app --reload
```

Then open the FastAPI documentation at [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs).

To test student creation, open `POST /students/`, click **Try it out**, and change the `id`, `name`, and `email` values before clicking **Execute**.