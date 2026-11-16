"""State objects that control actions on a quiz attempt."""

from abc import ABC, abstractmethod

from backend.models import QuizAttempt


class AttemptStateError(Exception):
    """Raised when an operation is not allowed in the attempt's current state."""


class AttemptState(ABC):
    """State interface for behavior that changes during an attempt's lifecycle."""

    @abstractmethod
    def ensure_can_save_answer(self) -> None:
        """Raise an error when answers cannot be changed in this state."""

    @abstractmethod
    def submit(self, context: "QuizAttemptContext", score: int) -> bool:
        """Submit the attempt and return whether its data changed."""


class InProgressState(AttemptState):
    """Allow answer changes and transition the attempt when it is submitted."""

    def ensure_can_save_answer(self) -> None:
        return None

    def submit(self, context: "QuizAttemptContext", score: int) -> bool:
        context.attempt.score = score
        context.attempt.status = "submitted"
        context.transition_to(SubmittedState())
        return True


class SubmittedState(AttemptState):
    """Prevent answer changes and keep repeated submissions idempotent."""

    def ensure_can_save_answer(self) -> None:
        raise AttemptStateError("Attempt is already submitted")

    def submit(self, context: "QuizAttemptContext", score: int) -> bool:
        return False


class QuizAttemptContext:
    """Context that delegates status-dependent behavior to an AttemptState."""

    def __init__(self, attempt: QuizAttempt):
        self.attempt = attempt
        self._state = self._state_from_status(attempt.status)

    @staticmethod
    def _state_from_status(status: str) -> AttemptState:
        if status in {"submitted", "completed"}:
            return SubmittedState()
        return InProgressState()

    @property
    def state(self) -> AttemptState:
        return self._state

    @property
    def is_final(self) -> bool:
        return isinstance(self._state, SubmittedState)

    def transition_to(self, state: AttemptState) -> None:
        self._state = state

    def ensure_can_save_answer(self) -> None:
        self._state.ensure_can_save_answer()

    def submit(self, score: int) -> bool:
        return self._state.submit(self, score)
