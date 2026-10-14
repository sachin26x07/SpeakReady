import { useState, useCallback } from 'react';
import { RefreshCw, Eye, EyeOff, CheckCircle, XCircle, Volume2 } from 'lucide-react';
import { generateListening } from '../services/api';
import { useSettings } from '../context/SettingsContext';
import AudioPlayer from '../components/AudioPlayer';
import { resolveOptionAnswer } from '../utils/answers';
import type { ListeningExercise, Difficulty } from '../types';

const TOPICS = [
  'workplace conversation', 'daily life', 'announcement', 'instructions',
  'news report', 'interview conversation', 'phone call', 'meeting',
];

export default function ListeningComprehension() {
  const { settings } = useSettings();
  const [exercise, setExercise] = useState<ListeningExercise | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showTranscript, setShowTranscript] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [examMode, setExamMode] = useState(false);
  const [config, setConfig] = useState({ difficulty: 'medium' as Difficulty, topic: 'workplace conversation' });

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    setExercise(null);
    setShowTranscript(false);
    setAnswers({});
    setSubmitted(false);
    setScore(0);

    try {
      const res = await generateListening({
        difficulty: config.difficulty,
        topic: config.topic,
        provider: settings.provider,
      });
      setExercise(res.exercise);
    } catch (e: any) {
      setError(e.message || 'Failed to generate exercise.');
    } finally {
      setLoading(false);
    }
  }, [config, settings.provider]);

  const handleSubmit = () => {
    if (!exercise) return;
    let correct = 0;
    exercise.questions.forEach(q => {
      const correctAnswer = resolveOptionAnswer(q.answer, q.options);
      if ((answers[q.id] || '').toLowerCase().trim() === correctAnswer.toLowerCase().trim()) correct++;
    });
    setScore(correct);
    setSubmitted(true);
    setShowTranscript(true);
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">🎧 Listening Comprehension</h1>
        <p className="page-subtitle">Listen carefully, then answer questions about what you heard</p>
      </div>

      {/* Config */}
      <div className="card" style={{ marginBottom: 20, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div className="form-group" style={{ minWidth: 160 }}>
          <label>Difficulty</label>
          <select className="select" value={config.difficulty} onChange={e => setConfig(c => ({ ...c, difficulty: e.target.value as Difficulty }))}>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
        </div>
        <div className="form-group" style={{ minWidth: 200 }}>
          <label>Topic</label>
          <select className="select" value={config.topic} onChange={e => setConfig(c => ({ ...c, topic: e.target.value }))}>
            {TOPICS.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
          </select>
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginBottom: 2 }}>
          <input type="checkbox" checked={examMode} onChange={e => setExamMode(e.target.checked)} />
          <span style={{ fontSize: 13, fontWeight: 500 }}>Exam Mode (no replay)</span>
        </label>
        <button className="btn btn-primary" onClick={load} disabled={loading}>
          {loading ? <><span className="spinner" style={{ width: 14, height: 14 }} /></> : <RefreshCw size={16} />}
          {exercise ? 'Next Exercise' : 'Generate Exercise'}
        </button>
      </div>

      {error && <div className="alert alert-error" style={{ marginBottom: 16 }}><XCircle size={14} />{error}</div>}

      {loading && (
        <div className="card" style={{ textAlign: 'center', padding: 48 }}>
          <div className="spinner" style={{ margin: '0 auto 16px' }} />
          <p style={{ color: 'var(--text-secondary)' }}>Generating listening exercise…</p>
        </div>
      )}

      {!loading && !exercise && !error && (
        <div className="empty-state card">
          <div className="empty-state-icon"><Volume2 size={28} /></div>
          <div className="empty-state-title">Ready to Listen?</div>
          <div className="empty-state-description">
            Click "Generate Exercise" to get a new listening comprehension exercise. 
            Listen to the passage, then answer the questions.
          </div>
          <button className="btn btn-primary" onClick={load}>Generate Exercise</button>
        </div>
      )}

      {exercise && !loading && (
        <div style={{ maxWidth: 700 }} className="fade-in">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <span className={`badge badge-${exercise.difficulty === 'easy' ? 'success' : exercise.difficulty === 'medium' ? 'warning' : 'error'}`} style={{ marginRight: 8 }}>
                {exercise.difficulty}
              </span>
              <span className="badge badge-neutral">{exercise.context}</span>
            </div>
            {submitted && (
              <div style={{ fontWeight: 700, color: score === exercise.questions.length ? 'var(--color-success)' : 'var(--color-warning)' }}>
                {score}/{exercise.questions.length} correct
              </div>
            )}
          </div>

          {/* Audio player */}
          <div className="card" style={{ marginBottom: 20, background: 'var(--color-primary-50)', border: '1px solid var(--color-primary-200)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <Volume2 size={18} color="var(--color-primary-600)" />
              <span style={{ fontWeight: 600, fontSize: 15 }}>Listen to the passage</span>
            </div>
            <AudioPlayer text={exercise.passage} label="Play Passage" />
            {!examMode && (
              <div style={{ marginTop: 8 }}>
                <AudioPlayer text={exercise.passage} label="Replay" compact />
              </div>
            )}
            {examMode && <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>⚠️ Exam mode: No replay allowed</p>}
          </div>

          {/* Transcript toggle */}
          <div style={{ marginBottom: 20 }}>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => setShowTranscript(!showTranscript)}
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            >
              {showTranscript ? <EyeOff size={14} /> : <Eye size={14} />}
              {showTranscript ? 'Hide Transcript' : 'Show Transcript'}
            </button>
            {showTranscript && (
              <div className="card fade-in" style={{ marginTop: 10, background: 'var(--bg-surface)' }}>
                <p style={{ fontSize: 15, lineHeight: 1.8, color: 'var(--text-primary)' }}>{exercise.passage}</p>
                {exercise.vocabulary && exercise.vocabulary.length > 0 && (
                  <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border-color)' }}>
                    <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8 }}>Key vocabulary:</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {exercise.vocabulary.map(v => (
                        <div key={v.word} style={{
                          padding: '6px 12px', background: 'var(--bg-card)',
                          border: '1px solid var(--border-color)', borderRadius: 20,
                          fontSize: 13,
                        }}>
                          <strong>{v.word}</strong>
                          <span style={{ color: 'var(--text-muted)', margin: '0 4px' }}>/{v.pronunciation_hint}/</span>
                          <span style={{ color: 'var(--text-secondary)' }}>{v.meaning}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Questions */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {exercise.questions.map((q, i) => {
              const correctAnswer = resolveOptionAnswer(q.answer, q.options);
              return (
              <div key={q.id} className="card">
                <p style={{ fontWeight: 600, marginBottom: 12, fontSize: 15 }}>
                  Q{i + 1}. {q.question}
                </p>
                {q.type === 'multiple-choice' && q.options ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {q.options.map(opt => {
                      let cls = 'option-btn';
                      if (submitted) {
                        if (opt.toLowerCase() === correctAnswer.toLowerCase()) cls += ' correct';
                        else if (opt === answers[q.id]) cls += ' incorrect';
                      } else if (opt === answers[q.id]) cls += ' selected';
                      return (
                        <button
                          key={opt}
                          className={cls}
                          onClick={() => !submitted && setAnswers(a => ({ ...a, [q.id]: opt }))}
                          disabled={submitted}
                        >
                          {submitted && opt.toLowerCase() === correctAnswer.toLowerCase() && <CheckCircle size={14} color="var(--color-primary-800)" />}
                          {submitted && opt === answers[q.id] && opt.toLowerCase() !== correctAnswer.toLowerCase() && <XCircle size={14} color="var(--color-error)" />}
                          {opt}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <input
                    className="input"
                    placeholder="Type your answer..."
                    value={answers[q.id] || ''}
                    onChange={e => !submitted && setAnswers(a => ({ ...a, [q.id]: e.target.value }))}
                    disabled={submitted}
                  />
                )}
                {submitted && (
                  <div className={`alert ${answers[q.id]?.trim().toLowerCase() === correctAnswer.trim().toLowerCase() ? 'alert-success' : 'alert-error'} fade-in`} style={{ marginTop: 10 }}>
                    {answers[q.id]?.trim().toLowerCase() === correctAnswer.trim().toLowerCase()
                      ? <><CheckCircle size={14} /> Correct!</>
                      : <><XCircle size={14} /> Incorrect. Answer: <strong>{correctAnswer}</strong></>
                    }
                    <div style={{ marginTop: 4, fontSize: 13 }}>{q.explanation}</div>
                  </div>
                )}
              </div>
              );
            })}
          </div>

          <div style={{ marginTop: 20, display: 'flex', gap: 12 }}>
            {!submitted ? (
              <button
                className="btn btn-primary btn-lg"
                onClick={handleSubmit}
                disabled={Object.keys(answers).length < exercise.questions.length}
              >
                Submit Answers
              </button>
            ) : (
              <button className="btn btn-primary" onClick={load}>
                <RefreshCw size={16} /> Next Exercise
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
