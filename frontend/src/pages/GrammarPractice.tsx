import { useState, useCallback } from 'react';
import { RefreshCw, CheckCircle, XCircle, ArrowRight, BookOpen, Lightbulb } from 'lucide-react';
import { generateGrammar } from '../services/api';
import { useSettings } from '../context/SettingsContext';
import { recordGrammarResult, getProgress } from '../services/storage';
import type { GrammarQuestion, Difficulty } from '../types';

const TOPICS = [
  'mixed', 'tenses', 'articles', 'prepositions', 'subject-verb agreement',
  'pronouns', 'active-passive voice', 'sentence correction', 'vocabulary',
  'workplace English', 'common mistakes',
];

const QUESTION_TYPE_LABELS: Record<GrammarQuestion['type'], string> = {
  'fill-blank': 'Fill in the blank',
  'multiple-choice': 'Choose the correct answer',
  'error-identification': 'Identify the error',
  'sentence-ordering': 'Arrange the words',
  'sentence-correction': 'Correct the sentence',
};

function ScoreBadge({ score, total }: { score: number; total: number }) {
  const pct = total > 0 ? Math.round(score / total * 100) : 0;
  const color = pct >= 80 ? 'var(--color-success)' : pct >= 60 ? 'var(--color-warning)' : 'var(--color-error)';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div className="score-circle" style={{ background: color + '15', color, border: `3px solid ${color}`, width: 64, height: 64 }}>
        <span className="score-value" style={{ fontSize: 18 }}>{pct}%</span>
        <span className="score-label" style={{ fontSize: 9 }}>Score</span>
      </div>
      <div>
        <div style={{ fontWeight: 700 }}>{score}/{total} correct</div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          {pct >= 80 ? '🌟 Excellent!' : pct >= 60 ? '👍 Good work!' : '📚 Keep practising!'}
        </div>
      </div>
    </div>
  );
}

export default function GrammarPractice() {
  const { settings } = useSettings();
  const [questions, setQuestions] = useState<GrammarQuestion[]>([]);
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [sessionDone, setSessionDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [textInput, setTextInput] = useState('');

  const [config, setConfig] = useState({
    count: 5,
    difficulty: 'medium' as Difficulty,
    topic: 'mixed',
  });

  const progress = getProgress();

  const loadQuestions = useCallback(async () => {
    setLoading(true);
    setError('');
    setQuestions([]);
    setCurrent(0);
    setSelected(null);
    setSubmitted(false);
    setScore(0);
    setSessionDone(false);
    setTextInput('');

    try {
      const res = await generateGrammar({
        count: config.count,
        difficulty: config.difficulty,
        topic: config.topic,
        provider: settings.provider,
        recentIds: progress.recentGrammarIds,
      });
      setQuestions(res.questions);
    } catch (e: any) {
      setError(e.message || 'Failed to generate questions.');
    } finally {
      setLoading(false);
    }
  }, [config, settings.provider, progress.recentGrammarIds]);

  const q = questions[current];

  const handleSubmit = () => {
    if (!q) return;
    const answer = q.type === 'multiple-choice' ? selected : textInput.trim();
    if (!answer) return;
    setSubmitted(true);
    const isCorrect = answer.toLowerCase() === q.answer.toLowerCase();
    if (isCorrect) setScore(s => s + 1);

    recordGrammarResult({
      questionId: q.id,
      question: q.question,
      userAnswer: answer,
      correctAnswer: q.answer,
      isCorrect,
      topic: q.topic,
      timestamp: Date.now(),
    });
  };

  const handleNext = () => {
    if (current + 1 >= questions.length) {
      setSessionDone(true);
    } else {
      setCurrent(c => c + 1);
      setSelected(null);
      setSubmitted(false);
      setTextInput('');
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">📝 Grammar Practice</h1>
        <p className="page-subtitle">Unlimited AI-generated grammar questions with detailed explanations</p>
      </div>

      {/* Config panel */}
      {!loading && questions.length === 0 && !sessionDone && (
        <div className="card card-elevated" style={{ maxWidth: 560, marginBottom: 24 }}>
          <h2 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 18, marginBottom: 16 }}>Configure Session</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 20 }}>
            <div className="form-group">
              <label>Questions</label>
              <select className="select" value={config.count} onChange={e => setConfig(c => ({ ...c, count: +e.target.value }))}>
                {[3, 5, 10, 15, 20].map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Difficulty</label>
              <select className="select" value={config.difficulty} onChange={e => setConfig(c => ({ ...c, difficulty: e.target.value as Difficulty }))}>
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>
            <div className="form-group">
              <label>Topic</label>
              <select className="select" value={config.topic} onChange={e => setConfig(c => ({ ...c, topic: e.target.value }))}>
                {TOPICS.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
              </select>
            </div>
          </div>
          <button className="btn btn-primary btn-lg w-full" onClick={loadQuestions}>
            <BookOpen size={18} /> Generate Questions
          </button>
          {error && <div className="alert alert-error" style={{ marginTop: 12 }}><XCircle size={14} />{error}</div>}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="card" style={{ textAlign: 'center', padding: 48 }}>
          <div className="spinner" style={{ margin: '0 auto 16px' }} />
          <p style={{ color: 'var(--text-secondary)' }}>Generating {config.count} grammar questions…</p>
        </div>
      )}

      {/* Session done */}
      {sessionDone && (
        <div className="card card-elevated fade-in" style={{ maxWidth: 480, textAlign: 'center', padding: 40 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🎉</div>
          <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 22, fontWeight: 700, marginBottom: 12 }}>Session Complete!</h2>
          <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'center' }}>
            <ScoreBadge score={score} total={questions.length} />
          </div>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <button className="btn btn-primary" onClick={loadQuestions}>
              <RefreshCw size={16} /> New Session
            </button>
            <button className="btn btn-secondary" onClick={() => { setSessionDone(false); setCurrent(0); setSelected(null); setSubmitted(false); }}>
              Review Answers
            </button>
          </div>
        </div>
      )}

      {/* Question */}
      {!loading && !sessionDone && q && (
        <div style={{ maxWidth: 680 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              Question {current + 1} of {questions.length}
            </span>
            <div style={{ display: 'flex', gap: 8 }}>
              <span className={`badge badge-${q.difficulty === 'easy' ? 'success' : q.difficulty === 'medium' ? 'warning' : 'error'}`}>
                {q.difficulty}
              </span>
              <span className="badge badge-neutral">{q.topic}</span>
            </div>
          </div>

          {/* Progress */}
          <div className="progress-bar" style={{ marginBottom: 20 }}>
            <div className="progress-bar-fill" style={{ width: `${(current / questions.length) * 100}%` }} />
          </div>

          <div className="card card-elevated fade-in">
            {config.topic === 'mixed' && (
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-primary-700)', marginBottom: 8 }}>
                {QUESTION_TYPE_LABELS[q.type]}
              </div>
            )}
            <div style={{ display: 'flex', gap: 10, marginBottom: 16, alignItems: 'flex-start' }}>
              <BookOpen size={20} color="var(--color-primary-500)" style={{ flexShrink: 0, marginTop: 2 }} />
              <p style={{ fontSize: 17, fontWeight: 600, lineHeight: 1.6, color: 'var(--text-primary)' }}>{q.question}</p>
            </div>

            {/* Options */}
            {q.type === 'multiple-choice' && q.options && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {q.options.map(opt => {
                  let cls = 'option-btn';
                  if (submitted) {
                    if (opt.toLowerCase() === q.answer.toLowerCase()) cls += ' correct';
                    else if (opt === selected) cls += ' incorrect';
                  } else if (opt === selected) {
                    cls += ' selected';
                  }
                  return (
                    <button
                      key={opt}
                      className={cls}
                      onClick={() => !submitted && setSelected(opt)}
                      disabled={submitted}
                    >
                      {submitted && opt.toLowerCase() === q.answer.toLowerCase() && <CheckCircle size={14} color="var(--color-success)" />}
                      {submitted && opt === selected && opt.toLowerCase() !== q.answer.toLowerCase() && <XCircle size={14} color="var(--color-error)" />}
                      {opt}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Text input for other types */}
            {q.type !== 'multiple-choice' && (
              <div>
                <label style={{ fontSize: 13, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Your answer:</label>
                <input
                  className="input"
                  type="text"
                  value={textInput}
                  onChange={e => setTextInput(e.target.value)}
                  disabled={submitted}
                  placeholder="Type your answer here..."
                  onKeyDown={e => e.key === 'Enter' && !submitted && handleSubmit()}
                />
              </div>
            )}

            {/* Actions */}
            <div style={{ marginTop: 16, display: 'flex', gap: 10 }}>
              {!submitted ? (
                <button
                  className="btn btn-primary"
                  onClick={handleSubmit}
                  disabled={!selected && !textInput.trim()}
                >
                  Submit Answer
                </button>
              ) : (
                <button className="btn btn-primary" onClick={handleNext}>
                  {current + 1 >= questions.length ? 'See Results' : 'Next Question'} <ArrowRight size={16} />
                </button>
              )}
              <button className="btn btn-ghost btn-sm" onClick={() => { setSessionDone(false); setQuestions([]); }}>
                Change Settings
              </button>
            </div>

            {/* Explanation */}
            {submitted && (
              <div className="fade-in" style={{ marginTop: 20 }}>
                <div className={`alert ${(selected || textInput).toLowerCase() === q.answer.toLowerCase() ? 'alert-success' : 'alert-error'}`} style={{ marginBottom: 12 }}>
                  {(selected || textInput).toLowerCase() === q.answer.toLowerCase()
                    ? <><CheckCircle size={16} /> <strong>Correct!</strong> Well done!</>
                    : <><XCircle size={16} /> <strong>Incorrect.</strong> The answer is: <strong>{q.answer}</strong></>
                  }
                </div>
                <div className="card" style={{ background: 'var(--color-primary-50)', border: '1px solid var(--color-primary-200)' }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 8 }}>
                    <Lightbulb size={16} color="var(--color-primary-600)" style={{ flexShrink: 0, marginTop: 2 }} />
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--color-primary-800)', marginBottom: 4 }}>
                        Rule: {q.rule}
                      </div>
                      <div style={{ fontSize: 14, color: 'var(--text-primary)', lineHeight: 1.7 }}>{q.explanation}</div>
                    </div>
                  </div>
                  {q.examples.length > 0 && (
                    <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--color-primary-200)' }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-primary-700)', marginBottom: 4 }}>Examples:</div>
                      {q.examples.map((ex, i) => (
                        <div key={i} style={{ fontSize: 13, color: 'var(--color-primary-800)', fontStyle: 'italic' }}>• {ex}</div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Score tracker */}
          {questions.length > 0 && (
            <div style={{ marginTop: 16, textAlign: 'right', fontSize: 13, color: 'var(--text-muted)' }}>
              Score: {score}/{current + (submitted ? 1 : 0)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
