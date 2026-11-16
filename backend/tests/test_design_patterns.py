import unittest

from backend.attempt_state import (
    AttemptStateError,
    InProgressState,
    QuizAttemptContext,
    SubmittedState,
)
from backend.grading import (
    MultipleChoiceGradingStrategy,
    QuizGrader,
    TrueFalseGradingStrategy,
)
from backend.models import Answer, Question, QuizAttempt


class TestGradingStrategy(unittest.TestCase):
    def setUp(self):
        self.question = Question(
            quiz_id=1,
            question_text="What is 2 + 2?",
            question_type="multiple_choice",
            question_order=1,
            points=3,
        )

    def test_multiple_choice_strategy_awards_points_for_correct_answer(self):
        answer = Answer(
            question_id=1,
            answer_text="4",
            is_correct=True,
            answer_order=1,
        )
        grader = QuizGrader(MultipleChoiceGradingStrategy())

        self.assertEqual(grader.grade(self.question, answer), 3)

    def test_multiple_choice_strategy_awards_zero_for_wrong_answer(self):
        answer = Answer(
            question_id=1,
            answer_text="5",
            is_correct=False,
            answer_order=1,
        )
        grader = QuizGrader(MultipleChoiceGradingStrategy())

        self.assertEqual(grader.grade(self.question, answer), 0)

    def test_context_can_switch_to_true_false_strategy(self):
        self.question.question_type = "true_false"
        answer = Answer(
            question_id=1,
            answer_text="True",
            is_correct=True,
            answer_order=1,
        )
        grader = QuizGrader(MultipleChoiceGradingStrategy())
        grader.set_strategy(TrueFalseGradingStrategy())

        self.assertEqual(grader.grade(self.question, answer), 3)

    def test_true_false_strategy_rejects_non_boolean_choice(self):
        answer = Answer(
            question_id=1,
            answer_text="Maybe",
            is_correct=True,
            answer_order=1,
        )
        grader = QuizGrader(TrueFalseGradingStrategy())

        self.assertEqual(grader.grade(self.question, answer), 0)


class TestAttemptState(unittest.TestCase):
    def test_in_progress_attempt_allows_answers(self):
        context = QuizAttemptContext(
            QuizAttempt(quiz_id=1, student_id=1, status="in_progress")
        )

        context.ensure_can_save_answer()
        self.assertIsInstance(context.state, InProgressState)

    def test_submit_transitions_to_submitted_state(self):
        attempt = QuizAttempt(quiz_id=1, student_id=1, status="in_progress")
        context = QuizAttemptContext(attempt)

        changed = context.submit(score=4)

        self.assertTrue(changed)
        self.assertEqual(attempt.status, "submitted")
        self.assertEqual(attempt.score, 4)
        self.assertIsInstance(context.state, SubmittedState)

    def test_submitted_attempt_rejects_answer_changes(self):
        context = QuizAttemptContext(
            QuizAttempt(quiz_id=1, student_id=1, status="submitted", score=2)
        )

        with self.assertRaises(AttemptStateError):
            context.ensure_can_save_answer()

    def test_repeated_submission_keeps_original_score(self):
        attempt = QuizAttempt(
            quiz_id=1,
            student_id=1,
            status="submitted",
            score=2,
        )
        context = QuizAttemptContext(attempt)

        changed = context.submit(score=99)

        self.assertFalse(changed)
        self.assertEqual(attempt.score, 2)


if __name__ == "__main__":
    unittest.main()
