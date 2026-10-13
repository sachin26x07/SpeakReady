import { useState, useCallback } from 'react';
import { Brain, Play, Clock, CheckCircle, RefreshCw } from 'lucide-react';
import { generateGrammar, generateListening } from '../services/api';
import { useSettings } from '../context/SettingsContext';
import AudioPlayer from '../components/AudioPlayer';
import type { GrammarQuestion, ListeningExercise, Difficulty } from '../types';

type Phase = 'config' | 'grammar' | 'listening' | 'summary';

export default function MockAssessment() {
  const { settings } = useSettings();
  const [phase, setPhase] = useState<Phase>('config');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');

  // Grammar state
  const [grammarQuestions, setGrammarQuestions] = useState<GrammarQuestion[]>([]);
  const [grammarIndex, setGrammarIndex] = useState(0);
  const [grammarSelected, setGrammarSelected] = useState<string | null>(null);
  const [grammarSubmitted, setGrammarSubmitted] = useState(false);
  const [grammarScore, setGrammarScore] = useState(0);

  // Listening state
  const [listeningEx, setListeningEx] = useState<ListeningExercise | null>(null);
  const [listeningIndex, setListeningIndex] = useState(0);
  const [listeningAnswers, setListeningAnswers] = useState<string[]>([]);
  const [listeningSelected, setListeningSelected] = useState<string | null>(null);
  const [listeningSubmitted, setListeningSubmitted] = useState(false);
  const [listeningScore, setListeningScore] = useState(0);
  const [showPassage, setShowPassage] = useState(false);

  const startMock = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [gRes, lRes] = await Promise.all([
        generateGrammar({ count: 5, difficulty, topic: 'mixed', provider: settings.provider }),
        generateListening({ difficulty, topic: 'workplace conversation', provider: settings.provider }),
      ]);
      setGrammarQuestions(gRes.questions);
      setListeningEx(lRes.exercise);
      setGrammarIndex(0);
      setGrammarSelected(null);
      setGrammarSubmitted(false);
      setGrammarScore(0);
      setListeningIndex(0);
      setListeningAnswers([]);
      setListeningSelected(null);
      setListeningSubmitted(false);
      setListeningScore(0);
      setShowPassage(false);
      setPhase('grammar');
    } catch (e: any) {
      setError(e.message || 'Failed to start assessment.');
    } finally {
      setLoading(false);
    }
  }, [difficulty, settings.provider]);

  const gq = grammarQuestions[grammarIndex];
  const lq = listeningEx?.questions[listeningIndex];

  const submitGrammar = () => {
    if (!gq || !grammarSelected) return;
    setGrammarSubmitted(true);
    if (grammarSelected.toLowerCase() === gq.answer.toLowerCase()) {
      setGrammarScore(s => s + 1);
    }
  };

  const nextGrammar = () => {
    if (grammarIndex + 1 >= grammarQuestions.length) {
      setPhase('listening');
    } else {
      setGrammarIndex(i => i + 1);
      setGrammarSelected(null);
      setGrammarSubmitted(false);
    }
  };

  const submitListening = () => {
    if (!lq || !listeningSelected) return;
    setListeningSubmitted(true);
    const correct = listeningSelected.toLowerCase() === lq.answer.toLowerCase();
    if (correct) setListeningScore(s => s + 1);
    setListeningAnswers((prev: string[]) => [...prev, listeningSelected]);
  };

  const nextListening = () => {
    if (!listeningEx || listeningIndex + 1 >= listeningEx.questions.length) {
      setPhase('summary');
    } else {
      setListeningIndex(i => i + 1);
      setListeningSelected(null);
      setListeningSubmitted(false);
    }
  };

  const totalScore = grammarScore + listeningScore;
  const totalPossible = grammarQuestions.length + (listeningEx?.questions.length || 0);
  const pct = totalPossible > 0 ? Math.round((totalScore / totalPossible) * 100) : 0;

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">🧠 Mock Assessment</h1>
        <p className="page-subtitle">Practice simulation combining grammar and listening comprehension</p>
      </div>

      <div className="alert alert-info" style={{ marginBottom: 20 }}>
        <Brain size={16} />
        This is a <strong>practice simulation only</strong>. It is not the actual Cognizant assessment.
        Use it to identify your weak areas and build confidence.
      </div>

      {/* Config */}
      {phase === 'config' && (
        <div className="card card-elevated" style={{ maxWidth: 480 }}>
          <div className="card-title" style={{ marginBottom: 20 }}>Configure Your Mock Test</div>
          <div className="form-group" style={{ marginBottom: 20 }}>
            <label>Difficulty Level</label>
            <select className="select" value={difficulty} onChange={e => setDifficulty(e.target.value as Difficulty)}>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </div>
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 10 }}>What's included:</div>
            {[
              { icon: '📝', label: '5 Grammar Questions', time: '~5 min' },
              { icon: '🎧', label: '1 Listening Passage + Questions', time: '~5 min' },
            ].map((item, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 12px', borderRadius: 8, background: 'var(--bg-surface)',
                marginBottom: 8, fontSize: 13,
              }}>
                <span>{item.icon} {item.label}</span>
                <span style={{ color: 'var(--text-muted)' }}>
                  <Clock size={12} style={{ marginRight: 4 }} />{item.time}
                </span>
              </div>
            ))}
          </div>
          {error && <div className="alert alert-error" style={{ marginBottom: 12 }}>{error}</div>}
          <button className="btn btn-primary btn-lg w-full" onClick={startMock} disabled={loading}>
            {loading ? <span className="spinner" style={{ width: 16, height: 16 }} /> : <Play size={18} />}
            Start Mock Assessment
          </button>
        </div>
      )}

      {/* Grammar phase */}
      {phase === 'grammar' && gq && (
        <div style={{ maxWidth: 640 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              📝 Grammar: {grammarIndex + 1}/{grammarQuestions.length}
            </span>
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Score: {grammarScore}/{grammarIndex + (grammarSubmitted ? 1 : 0)}</span>
          </div>
          <div className="progress-bar" style={{ marginBottom: 20 }}>
            <div className="progress-bar-fill" style={{ width: `${(grammarIndex / grammarQuestions.length) * 100}%` }} />
          </div>
          <div className="card card-elevated fade-in">
            <p style={{ fontSize: 16, fontWeight: 600, lineHeight: 1.6, marginBottom: 16 }}>{gq.question}</p>
            {gq.options?.map(opt => {
              let cls = 'option-btn';
              if (grammarSubmitted) {
                if (opt.toLowerCase() === gq.answer.toLowerCase()) cls += ' correct';
                else if (opt === grammarSelected) cls += ' incorrect';
              } else if (opt === grammarSelected) cls += ' selected';
              return (
                <button key={opt} className={cls} onClick={() => !grammarSubmitted && setGrammarSelected(opt)} disabled={grammarSubmitted}>
                  {opt}
                </button>
              );
            })}
            <div style={{ marginTop: 16, display: 'flex', gap: 10 }}>
              {!grammarSubmitted ? (
                <button className="btn btn-primary" onClick={submitGrammar} disabled={!grammarSelected}>Submit</button>
              ) : (
                <>
                  <div className={`alert ${grammarSelected?.toLowerCase() === gq.answer.toLowerCase() ? 'alert-success' : 'alert-error'}`} style={{ flex: 1 }}>
                    {grammarSelected?.toLowerCase() === gq.answer.toLowerCase()
                      ? <><CheckCircle size={14} /> Correct!</>
                      : <>❌ Answer: <strong>{gq.answer}</strong></>}
                  </div>
                  <button className="btn btn-primary" onClick={nextGrammar}>
                    {grammarIndex + 1 >= grammarQuestions.length ? 'Start Listening →' : 'Next →'}
                  </button>
                </>
              )}
            </div>
            {grammarSubmitted && (
              <div style={{ marginTop: 12, padding: '10px 14px', background: 'var(--color-primary-50)', borderRadius: 8, fontSize: 13 }}>
                💡 {gq.explanation}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Listening phase */}
      {phase === 'listening' && listeningEx && lq && (
        <div style={{ maxWidth: 680 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              🎧 Listening: Question {listeningIndex + 1}/{listeningEx.questions.length}
            </span>
          </div>
          <div className="progress-bar" style={{ marginBottom: 20 }}>
            <div className="progress-bar-fill" style={{ width: `${(listeningIndex / listeningEx.questions.length) * 100}%` }} />
          </div>

          <div className="card card-elevated fade-in" style={{ marginBottom: 16 }}>
            <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Listen to the Passage
            </div>
            <div style={{ marginBottom: 12 }}>
              <AudioPlayer text={listeningEx.passage} label="▶ Play Passage" />
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>
              Context: {listeningEx.context}
            </div>
            <button className="btn btn-ghost btn-sm" onClick={() => setShowPassage(!showPassage)}>
              {showPassage ? 'Hide' : 'Show'} transcript
            </button>
            {showPassage && (
              <div style={{ marginTop: 10, padding: '12px 16px', background: 'var(--bg-surface)', borderRadius: 8, fontSize: 14, lineHeight: 1.7 }}>
                {listeningEx.passage}
              </div>
            )}
          </div>

          <div className="card card-elevated fade-in">
            <p style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>{lq.question}</p>
            {lq.options?.map(opt => {
              let cls = 'option-btn';
              if (listeningSubmitted) {
                if (opt.toLowerCase() === lq.answer.toLowerCase()) cls += ' correct';
                else if (opt === listeningSelected) cls += ' incorrect';
              } else if (opt === listeningSelected) cls += ' selected';
              return (
                <button key={opt} className={cls} onClick={() => !listeningSubmitted && setListeningSelected(opt)} disabled={listeningSubmitted}>
                  {opt}
                </button>
              );
            })}
            <div style={{ marginTop: 16, display: 'flex', gap: 10 }}>
              {!listeningSubmitted ? (
                <button className="btn btn-primary" onClick={submitListening} disabled={!listeningSelected}>Submit</button>
              ) : (
                <>
                  <div className={`alert ${listeningSelected?.toLowerCase() === lq.answer.toLowerCase() ? 'alert-success' : 'alert-error'}`} style={{ flex: 1 }}>
                    {listeningSelected?.toLowerCase() === lq.answer.toLowerCase()
                      ? <><CheckCircle size={14} /> Correct!</>
                      : <>❌ Answer: <strong>{lq.answer}</strong></>}
                  </div>
                  <button className="btn btn-primary" onClick={nextListening}>
                    {listeningIndex + 1 >= listeningEx.questions.length ? 'See Results →' : 'Next →'}
                  </button>
                </>
              )}
            </div>
            {listeningSubmitted && (
              <div style={{ marginTop: 10, fontSize: 13, color: 'var(--text-secondary)' }}>
                💡 {lq.explanation}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Summary */}
      {phase === 'summary' && (
        <div className="card card-elevated fade-in" style={{ maxWidth: 480, textAlign: 'center', padding: 40 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>
            {pct >= 80 ? '🏆' : pct >= 60 ? '👍' : '📚'}
          </div>
          <h2 style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: 24, marginBottom: 8 }}>Assessment Complete!</h2>
          <div className="score-circle" style={{
            margin: '0 auto 20px',
            background: pct >= 80 ? 'var(--color-success)' + '15' : pct >= 60 ? '#fef3c7' : '#fef2f2',
            color: pct >= 80 ? 'var(--color-success)' : pct >= 60 ? 'var(--color-warning)' : 'var(--color-error)',
            border: `4px solid ${pct >= 80 ? 'var(--color-success)' : pct >= 60 ? 'var(--color-warning)' : 'var(--color-error)'}`,
            width: 100, height: 100,
          }}>
            <span style={{ fontSize: 28, fontWeight: 800 }}>{pct}%</span>
            <span style={{ fontSize: 11 }}>{totalScore}/{totalPossible}</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
            <div style={{ padding: '12px', background: 'var(--bg-surface)', borderRadius: 8 }}>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Grammar</div>
              <div style={{ fontWeight: 700, fontSize: 18 }}>{grammarScore}/{grammarQuestions.length}</div>
            </div>
            <div style={{ padding: '12px', background: 'var(--bg-surface)', borderRadius: 8 }}>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Listening ({listeningAnswers.length} answered)</div>
              <div style={{ fontWeight: 700, fontSize: 18 }}>{listeningScore}/{listeningEx?.questions.length || 0}</div>
            </div>
          </div>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 24 }}>
            {pct >= 80 ? 'Excellent performance! Keep it up.' : pct >= 60 ? 'Good work! Review your mistakes and practise more.' : 'Keep practising! Focus on grammar and listening daily.'}
          </p>
          <button className="btn btn-primary" onClick={() => setPhase('config')}>
            <RefreshCw size={16} /> Take Another Test
          </button>
        </div>
      )}
    </div>
  );
}
