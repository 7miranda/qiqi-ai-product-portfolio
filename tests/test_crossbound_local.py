import importlib.util
import tempfile
import unittest
from pathlib import Path

spec = importlib.util.spec_from_file_location('crossbound_server', Path(__file__).resolve().parents[1] / 'scripts/crossbound-local/server.py')
server = importlib.util.module_from_spec(spec)
spec.loader.exec_module(server)


class LocalRecordsTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.store = server.Store(Path(self.temp.name) / 'records.db')

    def tearDown(self):
        self.temp.cleanup()

    def record(self, kind, key, **data):
        return dict(type=kind, id='test:' + key, at='2026-10-21T12:00:00Z', data=dict(user_id='test', **data))

    def test_retry_dedup_and_incomplete_snapshot(self):
        row = self.record('round_reports', 'round:1', round=1, completed=False, exit_stage=2)
        self.store.ingest([row, row])
        self.assertEqual(self.store.summary()['incomplete'], 1)
        row['data'].update(completed=True, exit_stage=6, profit=5000, passed=True)
        self.store.ingest([row])
        self.assertEqual(self.store.summary()['completed'], 1)
        self.assertEqual(self.store.summary()['average_profit'], 5000)

    def test_feedback_requires_complete_round_and_claims_once(self):
        feedback = self.record('feedback', 'first', first=True, answers=[0, 1, 2], comment='建议可以把每一轮的现金变化单独说明一下')
        self.assertEqual(self.store.ingest([feedback]), [])
        self.store.ingest([self.record('round_reports', 'round:1', round=1, completed=True, exit_stage=6)])
        self.store.ingest([feedback, feedback])
        with self.store.connect() as db:
            self.assertEqual(db.execute('SELECT sum(points) FROM reward_claims').fetchone()[0], 70)
        self.assertEqual(len(self.store.rows('feedback')), 1)

    def test_short_comments_rejected_and_quiz_attempts_preserved(self):
        self.store.ingest([self.record('round_reports', 'round:1', round=1, completed=True, exit_stage=6)])
        self.assertEqual(self.store.ingest([self.record('feedback', 'first', first=True, answers=[0, 1, 2], comment='太短')]), [])
        self.store.ingest([self.record('quiz_answers', 'quiz:1', task_id='market', correct=False), self.record('quiz_answers', 'quiz:2', task_id='market', correct=True)])
        self.assertEqual(self.store.summary()['quiz_by_task']['market'], dict(attempts=2, accuracy=.5))


if __name__ == '__main__':
    unittest.main()
