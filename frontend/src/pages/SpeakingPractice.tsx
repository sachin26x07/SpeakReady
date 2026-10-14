import { useState, useCallback, useRef } from 'react';
import { RefreshCw, MessageSquare, AlertCircle, Lightbulb, Info } from 'lucide-react';
import { getSpeakingPrompt, evaluateSpeaking } from '../services/api';
import { useSettings } from '../context/SettingsContext';
import { getElapsedPracticeMinutes, recordDailySession } from '../services/storage';
import VoiceRecorder from '../components/VoiceRecorder';
import type { SpeakingPrompt, SpeakingEvaluation, Difficulty } from '../types';

const CATEGORIES = [
  'self-introduction', 'college & education', 'final year project',
  'strengths & weaknesses', 'challenges & problem-solving', 'career goals',
  'technology', 'daily routine', 'memorable experience', 'workplace scenario',
  'team work & leadership', 'communication skills',
];

function ScoreBar({ label, value }: { label: string; value: number }) {
  const color = value >= 8 ? 'var(--color-success)' : value >= 6 ? 'var(--color-warning)' : 'var(--color-error)';
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 13 }}>
        <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
        <span style={{ fontWeight: 700, color }}>{value}/10</span>
      </div>
      <div className="progress-bar">
        <div className="progress-bar-fill" style={{ width: `${value * 10}%`, background: color }} />
      </div>
    </div>
  );
}

export default function SpeakingPractice() {
  const { settings } = useSettings();
  const [prompt, setPrompt] = useState<SpeakingPrompt | null>(null);
  const [evaluation, setEvaluation] = useState<SpeakingEvaluation | null>(null);
  const [loading, setLoading] = useState(false);
  const [evaluating, setEvaluating] = useState(false);
  const [error, setError] = useState('');
  const [transcript, setTranscript] = useState('');
  const [textAnswer, setTextAnswer] = useState('');
  const [useText, setUseText] = useState(false);
  const [showHints, setShowHints] = useState(false);
  const [config, setConfig] = useState({ category: 'self-introduction', difficulty: 'medium' as Difficulty });
  const transcriptRef = useRef('');
  const sessionStartedAt = useRef(Date.now());

  const loadPrompt = useCallback(async () => {
    sessionStartedAt.current = Date.now();
    setLoading(true);
    setError('');
    setPrompt(null);
    setEvaluation(null);
    setTranscript('');
    setTextAnswer('');
    transcriptRef.current = '';
    setShowHints(false);

    try {
      const res = await getSpeakingPrompt({
        category: config.category,
        difficulty: config.difficulty,
        provider: settings.provider,
      });
      setPrompt(res.prompt);
    } catch (e: any) {
      setError(e.message || 'Failed to generate prompt.');
    } finally {
      setLoading(false);
    }
  }, [config, settings.provider]);

  const handleTranscript = (t: string, isFinal: boolean) => {
    if (isFinal) transcriptRef.current += ' ' + t;
    setTranscript(transcriptRef.current.trim() || t);
  };

  const evaluate = async () => {
    if (!prompt) return;
    const answer = useText ? textAnswer : transcriptRef.current;
    if (!answer.trim()) { setError('Please speak or type your answer first.'); return; }

    setEvaluating(true);
    setError('');
    try {
      const res = await evaluateSpeaking({
        question: prompt.question,
        transcript: answer,
        language: settings.feedbackLanguage,
        provider: settings.provider,
      });
      setEvaluation(res.evaluation);
      recordDailySession({
        minutesPracticed: getElapsedPracticeMinutes(sessionStartedAt.current),
        activitiesCompleted: ['speaking'],
        speakingScore: res.evaluation.overall_score,
        questionsAnswered: 1,
      });
    } catch (e: any) {
      setError(e.message || 'Evaluation failed.');
    } finally {
      setEvaluating(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">💬 Speaking Practice</h1>
        <p className="page-subtitle">Speak your answer and get detailed AI feedback on grammar, vocabulary, and clarity</p>
      </div>

      <div className="alert alert-info" style={{ marginBottom: 20 }}>
        <Info size={16} />
        AI evaluates your spoken response based on the transcript.
        Scores reflect language quality — not pronunciation accent.
        Feedback language: <strong>{settings.feedbackLanguage}</strong>
        (change in <a href="/settings" style={{ color: 'var(--color-primary-600)' }}>Settings</a>).
      </div>

      {/* Config */}
      <div className="card" style={{ marginBottom: 20, display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'flex-end' }}>
        <div className="form-group">
          <label>Category</label>
          <select className="select" value={config.category} onChange={e => setConfig(c => ({ ...c, category: e.target.value }))}>
            {CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
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
        <button className="btn btn-primary" onClick={loadPrompt} disabled={loading}>
          {loading ? <span className="spinner" style={{ width: 14, height: 14 }} /> : <RefreshCw size={16} />}
          {prompt ? 'New Question' : 'Get Question'}
        </button>
      </div>

      {error && <div className="alert alert-error" style={{ marginBottom: 16 }}><AlertCircle size={14} />{error}</div>}

      {loading && (
        <div className="card" style={{ textAlign: 'center', padding: 48 }}>
          <div className="spinner" style={{ margin: '0 auto 16px' }} />
          <p>Generating speaking prompt…</p>
        </div>
      )}

      {!loading && !prompt && !error && (
        <div className="empty-state card">
          <div className="empty-state-icon"><MessageSquare size={28} /></div>
          <div className="empty-state-title">Ready to Speak?</div>
          <div className="empty-state-description">Get a speaking question and record your answer. AI will evaluate your response.</div>
          <button className="btn btn-primary" onClick={loadPrompt}>Get Question</button>
        </div>
      )}

      {prompt && !loading && (
        <div style={{ maxWidth: 720 }} className="fade-in">
          {/* Question */}
          <div className="card card-elevated" style={{ marginBottom: 20, background: 'var(--color-primary-50)', border: '1px solid var(--color-primary-200)' }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <div style={{
                width: 40, height: 40, borderRadius: '50%',
                background: 'var(--color-primary-500)', display: 'flex', alignItems: 'center',
                justifyContent: 'center', flexShrink: 0,
              }}>
                <MessageSquare size={18} color="white" />
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-primary-600)', marginBottom: 4 }}>
                  Speaking Question
                </div>
                <p style={{ fontSize: 18, fontWeight: 600, lineHeight: 1.6, color: 'var(--color-primary-900)' }}>
                  {prompt.question}
                </p>
              </div>
            </div>
          </div>

          {/* Hints */}
          <div style={{ marginBottom: 16 }}>
            <button className="btn btn-ghost btn-sm" onClick={() => setShowHints(!showHints)}>
              <Lightbulb size={14} /> {showHints ? 'Hide Hints' : 'Show Hints'}
            </button>
            {showHints && (
              <div className="card fade-in" style={{ marginTop: 10 }}>
                <div style={{ marginBottom: 8 }}>
                  <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 6 }}>💡 What to cover:</div>
                  {prompt.example_points.map((p, i) => <div key={i} style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 3 }}>• {p}</div>)}
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 6 }}>🧠 Think about:</div>
                  {prompt.hints.map((h, i) => <div key={i} style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 3 }}>• {h}</div>)}
                </div>
              </div>
            )}
          </div>

          {/* Answer input mode */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, marginBottom: 12 }}>
              <input type="checkbox" checked={useText} onChange={e => setUseText(e.target.checked)} />
              Type my answer instead of speaking
            </label>
            {useText ? (
              <textarea
                className="textarea"
                placeholder="Type your answer here (aim for 2-3 minutes of spoken content)..."
                value={textAnswer}
                onChange={e => setTextAnswer(e.target.value)}
                rows={6}
              />
            ) : (
              <VoiceRecorder
                onTranscript={handleTranscript}
                label="Record My Answer"
              />
            )}
            {transcript && !useText && (
              <div style={{ marginTop: 10, padding: '12px 16px', background: 'var(--bg-surface)', borderRadius: 8 }}>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Transcript:</div>
                <div style={{ fontSize: 14, lineHeight: 1.7 }}>{transcript}</div>
              </div>
            )}
          </div>

          {!evaluation && (
            <button
              className="btn btn-primary btn-lg"
              onClick={evaluate}
              disabled={evaluating || (!transcript && !textAnswer)}
            >
              {evaluating ? <><span className="spinner" style={{ width: 16, height: 16 }} /> Evaluating…</> : '🤖 Get AI Feedback'}
            </button>
          )}

          {/* Evaluation results */}
          {evaluation && (
            <div className="fade-in">
              {/* Overall score */}
              <div className="card card-elevated" style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                  <div className="score-circle" style={{
                    background: 'var(--color-primary-50)', color: 'var(--color-primary-600)',
                    border: '3px solid var(--color-primary-400)', width: 90, height: 90,
                  }}>
                    <span style={{ fontSize: 26, fontWeight: 800 }}>{evaluation.overall_score}</span>
                    <span style={{ fontSize: 9, fontWeight: 600, textTransform: 'uppercase' }}>/ 10</span>
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 15, lineHeight: 1.7, color: 'var(--text-primary)', marginBottom: 12 }}>
                      {evaluation.feedback_summary}
                    </p>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {evaluation.fillers_detected.length > 0 && (
                        <span className="badge badge-warning">
                          Fillers: {evaluation.fillers_detected.join(', ')}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Score breakdown */}
              <div className="card" style={{ marginBottom: 16 }}>
                <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 16 }}>📊 Score Breakdown</div>
                <ScoreBar label="Relevance" value={evaluation.scores.relevance} />
                <ScoreBar label="Organization" value={evaluation.scores.organization} />
                <ScoreBar label="Grammar" value={evaluation.scores.grammar} />
                <ScoreBar label="Vocabulary" value={evaluation.scores.vocabulary} />
                <ScoreBar label="Completeness" value={evaluation.scores.completeness} />
                <ScoreBar label="Clarity" value={evaluation.scores.clarity} />
              </div>

              <div className="grid-2" style={{ marginBottom: 16 }}>
                {/* Strengths */}
                <div className="card">
                  <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 10, color: 'var(--color-success)' }}>✅ What You Did Well</div>
                  {evaluation.strengths.map((s, i) => (
                    <div key={i} style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--text-primary)', marginBottom: 4 }}>• {s}</div>
                  ))}
                </div>
                {/* Improvements */}
                <div className="card">
                  <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 10, color: 'var(--color-warning)' }}>📈 Needs Improvement</div>
                  {evaluation.improvements.map((s, i) => (
                    <div key={i} style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--text-primary)', marginBottom: 4 }}>• {s}</div>
                  ))}
                </div>
              </div>

              {/* Corrections */}
              {evaluation.corrected_sentences.length > 0 && (
                <div className="card" style={{ marginBottom: 16 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12 }}>🔧 Grammar Corrections</div>
                  {evaluation.corrected_sentences.map((c, i) => (
                    <div key={i} style={{ marginBottom: 12, padding: '10px 14px', background: 'var(--bg-surface)', borderRadius: 8 }}>
                      <div style={{ fontSize: 13, color: 'var(--color-error)', marginBottom: 4 }}>❌ {c.original}</div>
                      <div style={{ fontSize: 13, color: 'var(--color-success)', marginBottom: 4 }}>✅ {c.corrected}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>💡 {c.explanation}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* Tips */}
              <div className="card" style={{ marginBottom: 16, background: 'var(--color-primary-50)', border: '1px solid var(--color-primary-200)' }}>
                <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 10, color: 'var(--color-primary-700)' }}>💡 3 Improvement Tips</div>
                {evaluation.tips.map((tip, i) => (
                  <div key={i} style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--text-primary)', marginBottom: 6 }}>{i+1}. {tip}</div>
                ))}
              </div>

              {/* Model answer */}
              <div className="card" style={{ marginBottom: 16 }}>
                <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 10 }}>🌟 Model Answer</div>
                <p style={{ fontSize: 14, lineHeight: 1.8, color: 'var(--text-primary)', fontStyle: 'italic', background: 'var(--bg-surface)', padding: '12px 16px', borderRadius: 8, borderLeft: '3px solid var(--color-primary-400)' }}>
                  "{evaluation.model_answer}"
                </p>
              </div>

              {/* Follow-up */}
              <div className="card" style={{ marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-muted)', marginBottom: 4 }}>Follow-up Question:</div>
                  <div style={{ fontWeight: 600, fontSize: 15 }}>{evaluation.follow_up_question}</div>
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <button className="btn btn-secondary" onClick={() => { setEvaluation(null); setTranscript(''); setTextAnswer(''); transcriptRef.current = ''; }}>
                  <RefreshCw size={16} /> Try Same Question
                </button>
                <button className="btn btn-primary" onClick={loadPrompt}>
                  Next Question →
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
