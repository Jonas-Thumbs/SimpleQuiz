"""Grading strategies for the question types supported by SimpleQuiz."""

from abc import ABC, abstractmethod

from backend.models import Answer, Question


class GradingStrategy(ABC):
    """Strategy interface for calculating the points earned on one question."""

    @abstractmethod
    def grade(self, question: Question, selected_answer: Answer | None) -> int:
        """Return the points earned for the selected answer."""


class MultipleChoiceGradingStrategy(GradingStrategy):
    """Award all question points only when the selected choice is correct."""

    def grade(self, question: Question, selected_answer: Answer | None) -> int:
        if selected_answer is not None and selected_answer.is_correct:
            return question.points
        return 0


class TrueFalseGradingStrategy(GradingStrategy):
    """Grade true/false choices while rejecting choices with other labels."""

    def grade(self, question: Question, selected_answer: Answer | None) -> int:
        if selected_answer is None:
            return 0

        normalized_answer = selected_answer.answer_text.strip().lower()
        if normalized_answer not in {"true", "false"}:
            return 0

        return question.points if selected_answer.is_correct else 0


class QuizGrader:
    """Context that delegates question grading to a replaceable strategy."""

    def __init__(self, strategy: GradingStrategy):
        self._strategy = strategy

    def set_strategy(self, strategy: GradingStrategy) -> None:
        self._strategy = strategy

    def grade(self, question: Question, selected_answer: Answer | None) -> int:
        return self._strategy.grade(question, selected_answer)


def strategy_for_question_type(question_type: str) -> GradingStrategy:
    """Choose the grading strategy associated with a stored question type."""

    if question_type == "true_false":
        return TrueFalseGradingStrategy()
    return MultipleChoiceGradingStrategy()
