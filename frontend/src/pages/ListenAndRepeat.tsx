import { useState, useCallback, useRef } from 'react';
import { RefreshCw, Eye, EyeOff, CheckCircle, Mic, Info } from 'lucide-react';
import { generateRepeatSentences, compareTranscript } from '../services/api';
import { useSettings } from '../context/SettingsContext';
import { addRecentSentence, getProgress } from '../services/storage';
import AudioPlayer from '../components/AudioPlayer';
import VoiceRecorder from '../components/VoiceRecorder';
import type { RepeatSentence, TranscriptComparison, WordDiff } from '../types';

function WordDiffDisplay({ diffs }: { diffs: WordDiff[] }) {
  return (
    <div className="word-diff-container">
      {diffs.map((d, i) => (
        <span key={i} className={`word-token ${d.status}`} title={
          d.status === 'substituted' ? `Expected: "${d.expected}"` :
          d.status === 'omitted' ? 'Word was omitted' :
          d.status === 'extra' ? 'Extra word' : 'Correct'
        }>
          {d.word}
        </span>
      ))}
    </div>
  );
}

function AccuracyCircle({ accuracy }: { accuracy: number }) {
  const color = accuracy >= 90 ? 'var(--color-success)' : accuracy >= 70 ? 'var(--color-warning)' : 'var(--color-error)';
  return (
    <div className="score-circle" style={{ background: color + '15', color, border: `3px solid ${color}`, width: 80, height: 80 }}>
      <span className="score-value">{accuracy}%</span>
      <span className="score-label">Match</span>
    </div>
  );
}

export default function ListenAndRepeat() {
  const { settings } = useSettings();
  const [sentences, setSentences] = useState<RepeatSentence[]>([]);
  const [current, setCurrent] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showSentence, setShowSentence] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [comparison, setComparison] = useState<TranscriptComparison | null>(null);
  const [checking, setChecking] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const [level, setLevel] = useState(1);
  const [retries, setRetries] = useState(0);
  const transcriptRef = useRef('');

  const progress = getProgress();

  const loadSentences = useCallback(async (lvl = level) => {
    setLoading(true);
    setError('');
    setSentences([]);
    setCurrent(0);
    setShowSentence(false);
    setTranscript('');
    setComparison(null);
    setAttempted(false);
    setRetries(0);
    transcriptRef.current = '';

    try {
      const res = await generateRepeatSentences({
        level: lvl,
        count: 5,
        provider: settings.provider,
        recentSentences: progress.recentSentences,
      });
      setSentences(res.sentences);
    } catch (e: any) {
      setError(e.message || 'Failed to generate sentences.');
    } finally {
      setLoading(false);
    }
  }, [level, settings.provider, progress.recentSentences]);

  const s = sentences[current];

  const handleTranscript = (t: string, isFinal: boolean) => {
    transcriptRef.current = isFinal ? t : transcriptRef.current;
    setTranscript(t);
  };

  const checkAnswer = async () => {
    if (!s || !transcriptRef.current.trim()) return;
    setChecking(true);
    setAttempted(true);
    try {
      const result = await compareTranscript({
        original: s.sentence,
        transcript: transcriptRef.current,
      });
      setComparison(result);
      addRecentSentence(s.sentence);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setChecking(false);
    }
  };

  const tryAgain = () => {
    setComparison(null);
    setTranscript('');
    setAttempted(false);
    setRetries(r => r + 1);
    transcriptRef.current = '';
  };

  const nextSentence = () => {
    if (current + 1 >= sentences.length) {
      loadSentences();
    } else {
      setCurrent(c => c + 1);
      setComparison(null);
      setTranscript('');
      setAttempted(false);
      setRetries(0);
      setShowSentence(false);
      transcriptRef.current = '';
    }
  };

  const LEVEL_LABELS = ['', '3–5 words', '6–10 words', '11–15 words', '15–20 words', 'Complex'];

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">🎙️ Listen & Repeat</h1>
        <p className="page-subtitle">Listen to the AI say a sentence, then repeat it. See how many words you got right!</p>
      </div>

      <div className="alert alert-info" style={{ marginBottom: 20 }}>
        <Info size={16} />
        <div>
          <strong>How it works:</strong> Listen to the sentence, then speak it into your microphone.
          The app compares your transcript word-by-word.
          <strong> Note:</strong> This measures transcription accuracy, not pronunciation quality.
          Browser speech recognition accuracy varies — Chrome/Edge work best.
        </div>
      </div>

      {/* Level selector */}
      <div className="card" style={{ marginBottom: 20, display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'flex-end' }}>
        <div className="form-group">
          <label>Difficulty Level</label>
          <select className="select" value={level} onChange={e => setLevel(+e.target.value)} style={{ minWidth: 200 }}>
            {[1,2,3,4,5].map(l => <option key={l} value={l}>Level {l}: {LEVEL_LABELS[l]}</option>)}
          </select>
        </div>
        <button className="btn btn-primary" onClick={() => loadSentences(level)} disabled={loading}>
          {loading ? <span className="spinner" style={{ width: 14, height: 14 }} /> : <RefreshCw size={16} />}
          {sentences.length ? 'New Set' : 'Start Practice'}
        </button>
      </div>

      {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>}

      {loading && (
        <div className="card" style={{ textAlign: 'center', padding: 48 }}>
          <div className="spinner" style={{ margin: '0 auto 16px' }} />
          <p style={{ color: 'var(--text-secondary)' }}>Generating sentences…</p>
        </div>
      )}

      {!loading && !s && sentences.length === 0 && !error && (
        <div className="empty-state card">
          <div className="empty-state-icon"><Mic size={28} /></div>
          <div className="empty-state-title">Ready to Practise?</div>
          <div className="empty-state-description">
            Click "Start Practice" to get sentences. Listen carefully, then repeat what you hear.
          </div>
          <button className="btn btn-primary" onClick={() => loadSentences(level)}>Start Practice</button>
        </div>
      )}

      {!loading && s && (
        <div style={{ maxWidth: 680 }}>
          {/* Progress */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              Sentence {current + 1} of {sentences.length} • Level {level} • {s.topic}
            </span>
            {retries > 0 && <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Retries: {retries}</span>}
          </div>
          <div className="progress-bar" style={{ marginBottom: 20 }}>
            <div className="progress-bar-fill" style={{ width: `${(current / sentences.length) * 100}%` }} />
          </div>

          <div className="card card-elevated fade-in">
            {/* Step 1: Listen */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-secondary)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Step 1 — Listen
              </div>
              <AudioPlayer
                text={s.sentence}
                label="Play Sentence"
                autoPlay
              />
              <AudioPlayer
                text={s.sentence}
                label="Replay"
                compact
              />
            </div>

            {/* Step 2: Repeat */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-secondary)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Step 2 — Repeat Into Your Microphone
              </div>
              <VoiceRecorder
                onTranscript={handleTranscript}
                label="Start Recording"
              />
              {transcript && (
                <div style={{ marginTop: 10, padding: '10px 14px', background: 'var(--bg-surface)', borderRadius: 8, fontSize: 14 }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>You said: </span>
                  {transcript}
                </div>
              )}
            </div>

            {/* Sentence reveal */}
            <div style={{ marginBottom: 20 }}>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => setShowSentence(!showSentence)}
              >
                {showSentence ? <EyeOff size={14} /> : <Eye size={14} />}
                {showSentence ? 'Hide Sentence' : 'Show Correct Sentence'}
              </button>
              {showSentence && (
                <div className="card fade-in" style={{ marginTop: 10, background: 'var(--color-primary-50)', border: '1px solid var(--color-primary-200)' }}>
                  <p style={{ fontSize: 17, fontWeight: 600, lineHeight: 1.8, color: 'var(--color-primary-900)' }}>
                    "{s.sentence}"
                  </p>
                  {s.phonetic_hint && (
                    <p style={{ fontSize: 12, color: 'var(--color-primary-600)', marginTop: 4 }}>
                      💡 {s.phonetic_hint}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button
                className="btn btn-primary"
                onClick={checkAnswer}
                disabled={!transcript || checking || attempted}
              >
                {checking ? <span className="spinner" style={{ width: 14, height: 14 }} /> : <CheckCircle size={16} />}
                Check My Answer
              </button>
              {attempted && (
                <>
                  <button className="btn btn-secondary" onClick={tryAgain}>
                    <RefreshCw size={16} /> Try Again
                  </button>
                  <button className="btn btn-primary" onClick={nextSentence}>
                    {current + 1 >= sentences.length ? 'New Set' : 'Next Sentence →'}
                  </button>
                </>
              )}
            </div>

            {/* Results */}
            {comparison && (
              <div className="fade-in" style={{ marginTop: 24 }}>
                <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                  <AccuracyCircle accuracy={comparison.accuracy} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 8 }}>Word-by-word comparison:</div>
                    <WordDiffDisplay diffs={comparison.diffs} />
                    <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 12, fontSize: 13 }}>
                      {comparison.omitted.length > 0 && (
                        <span style={{ color: 'var(--color-error)' }}>❌ Omitted: {comparison.omitted.join(', ')}</span>
                      )}
                      {comparison.extra.length > 0 && (
                        <span style={{ color: 'var(--color-info)' }}>➕ Extra: {comparison.extra.join(', ')}</span>
                      )}
                      {comparison.substituted.length > 0 && (
                        <span style={{ color: 'var(--color-warning)' }}>
                          🔄 Substituted: {comparison.substituted.map(s => `"${s.got}" for "${s.expected}"`).join(', ')}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div style={{ marginTop: 12, padding: '10px 14px', background: 'var(--bg-surface)', borderRadius: 8, fontSize: 13 }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
                    <span className="word-token correct">■ Correct</span>
                    <span className="word-token omitted">■ Omitted</span>
                    <span className="word-token substituted">■ Substituted</span>
                    <span className="word-token extra">■ Extra</span>
                  </div>
                  <p style={{ marginTop: 8, color: 'var(--text-muted)', fontSize: 12 }}>
                    ⚠️ This shows transcript match accuracy only. Pronunciation quality is not evaluated here.
                  </p>
                </div>

                {comparison.accuracy >= 90 && (
                  <div className="alert alert-success" style={{ marginTop: 10 }}>
                    <CheckCircle size={14} /> Excellent! Over 90% word match!
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
