# Backend Tests

How to run the SimpleQuiz backend tests on your own machine.

The tests use Python's built-in `unittest` and FastAPI's `TestClient` with an
in-memory SQLite database. They don't touch `database.db` or need the Clerk key.

## Prerequisites

- [uv](https://docs.astral.sh/uv/getting-started/installation/)
  - Windows: `winget install --id=astral-sh.uv -e`
  - Mac: `brew install uv`
- Python 3.13. You don't need to install it, because uv downloads it for you.

After installing uv, **close your terminal and open a new one**, or the `uv`
command won't be found. On Windows, PowerShell is the most reliable terminal.

## Run the tests

### 1. Clone the project (FIRST TIME ONLY)

Open a terminal (on Windows, PowerShell works best) and choose a folder to keep
the project in, such as your home folder. Then run:

```
git clone https://github.com/Jonas-Thumbs/SimpleQuiz.git
```

This creates a folder named `SimpleQuiz`.

### 2. Go into the SimpleQuiz folder

```
cd SimpleQuiz
```

Check that you're in the right place by listing the files:

```
ls
```

You should see `backend`, `frontend`, and `README.md`. If you don't, you're in
the wrong folder. Run all test commands from this folder, not from inside
`backend` or `frontend`.

### 3. Switch to the branch you want to test (optional)

To test your own work or a teammate's pull request, get the branch name from the
pull request page (it's the text after "from") and run:

```
git fetch origin
git checkout branch-name
git pull
```

Skip this step to test the `main` branch.

### 4. Run the tests

Type this as **one line**. If you paste it, make sure it didn't split into two lines:

```
uv run --python 3.13 --project backend python -m unittest discover -s backend/tests -v
```

The first run downloads packages and takes a minute.

A passing run ends with something like this:

```
Ran 15 tests in 1.2s

OK
```
A failing pass runs with something like this:
```
Ran 15 tests in 1.2s

FAILED (failures=8)
```

### Already cloned the project?

Open a terminal, `cd` to the `SimpleQuiz` folder, run `git pull` to get the
latest changes, and start from step 4.
```
uv run --python 3.13 --project backend python -m unittest discover -s backend/tests -v
```

## Run one test file

```
uv run --python 3.13 --project backend python -m unittest discover -s backend/tests -p "test_quizzes.py" -v
```

Replace `test_quizzes.py` with another file in `backend/tests/`, such as `test_take_quiz.py`.

## Troubleshooting

| Possible Errors | Cause and Solution |
|---|---|
| `uv: command not found` | Close the terminal and open a new one, or use PowerShell. If it still fails, uv isn't installed, so run the install command above. |
| `error: argument -s/--start-directory: expected one argument` | The command was split across two lines when pasted. Type it by hand as one line. |
| `ModuleNotFoundError: No module named 'backend'` | You're in the wrong folder. Run `cd` to the repository root first. |
| `Failed to build httptools` or `Microsoft Visual C++ 14.0 or greater is required` | uv picked a Python version that is too new. Keep `--python 3.13` in the command, delete `backend/.venv`, and run it again. |
| `incompatible with the project's Python requirement: >=3.13` | You used an older Python. Use `--python 3.13`. |
| `SyntaxError` or `ImportError ... cannot import name` when the tests load | There is a bug in the code on your branch, often left over from a merge conflict. Compare `backend/main.py` and `backend/models.py` with `main` using `git diff origin/main -- backend/`. |
| Many tests fail with `422` or `404` | The code and tests don't match. Make sure your branch includes the latest `main`, then run `git pull`. |

## Before you open a pull request

Run the full test and check that every test passes. Reviewers will run it
too, a failing pass denies the merge.
