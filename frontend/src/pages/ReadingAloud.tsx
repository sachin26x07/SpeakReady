import { useState, useCallback, useRef } from 'react';
import { RefreshCw, BookOpen, Eye, Bookmark, BookmarkCheck } from 'lucide-react';
import { generateReading, compareTranscript } from '../services/api';
import { useSettings } from '../context/SettingsContext';
import {
  getElapsedPracticeMinutes,
  recordDailySession,
  saveVocabularyItem,
  isVocabularySaved,
} from '../services/storage';
import AudioPlayer from '../components/AudioPlayer';
import VoiceRecorder from '../components/VoiceRecorder';
import type { ReadingPassage, TranscriptComparison, WordDiff } from '../types';

const TOPICS = [
  'workplace English', 'technology', 'daily life', 'education',
  'interview tips', 'company culture', 'environment', 'health & wellness',
];

function WordDiffDisplay({ diffs }: { diffs: WordDiff[] }) {
  return (
    <div className="word-diff-container">
      {diffs.map((d, i) => (
        <span key={i} className={`word-token ${d.status}`}>{d.word}</span>
      ))}
    </div>
  );
}

export default function ReadingAloud() {
  const { settings } = useSettings();
  const [passage, setPassage] = useState<ReadingPassage | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [transcript, setTranscript] = useState('');
  const [comparison, setComparison] = useState<TranscriptComparison | null>(null);
  const [checking, setChecking] = useState(false);
  const [recording, setRecording] = useState(false);
  const [config, setConfig] = useState({ difficulty: 'intermediate' as 'beginner' | 'intermediate' | 'advanced', topic: 'workplace English' });
  const [savedMap, setSavedMap] = useState<Record<string, boolean>>({});

  const transcriptRef = useRef('');
  const transcriptBeforeRecordingRef = useRef('');
  const sessionStartedAt = useRef(Date.now());
  const sessionRecorded = useRef(false);

  const load = useCallback(async () => {
    sessionStartedAt.current = Date.now();
    sessionRecorded.current = false;
    setLoading(true);
    setError('');
    setPassage(null);
    setTranscript('');
    setComparison(null);
    transcriptRef.current = '';

    try {
      const res = await generateReading({
        difficulty: config.difficulty,
        topic: config.topic,
        provider: settings.provider,
      });
      setPassage(res.passage);
    } catch (e: any) {
      setError(e.message || 'Failed to generate passage.');
    } finally {
      setLoading(false);
    }
  }, [config, settings.provider]);

  const handleTranscript = (t: string, isFinal: boolean) => {
    if (!isFinal) return;
    transcriptRef.current = [transcriptRef.current, t].filter(Boolean).join(' ').trim();
    setTranscript(transcriptRef.current);
  };

  const handleRecordingStart = () => {
    transcriptBeforeRecordingRef.current = transcriptRef.current;
  };

  const handleRecordingCancel = () => {
    transcriptRef.current = transcriptBeforeRecordingRef.current;
    setTranscript(transcriptRef.current);
  };

  const checkReading = async () => {
    if (!passage || !transcriptRef.current.trim()) return;
    setChecking(true);
    try {
      const result = await compareTranscript({ original: passage.passage, transcript: transcriptRef.current });
      setComparison(result);
      if (!sessionRecorded.current) {
        recordDailySession({
          minutesPracticed: getElapsedPracticeMinutes(sessionStartedAt.current),
          activitiesCompleted: ['reading'],
          questionsAnswered: 1,
        });
        sessionRecorded.current = true;
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setChecking(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">📖 Reading Aloud</h1>
        <p className="page-subtitle">Read the passage aloud to practise pronunciation, pacing, and clarity</p>
      </div>

      <div className="card" style={{ marginBottom: 20, display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'flex-end' }}>
        <div className="form-group">
          <label>Difficulty</label>
          <select className="select" value={config.difficulty} onChange={e => setConfig(c => ({ ...c, difficulty: e.target.value as any }))}>
            <option value="beginner">Beginner (60-80 words)</option>
            <option value="intermediate">Intermediate (100-130 words)</option>
            <option value="advanced">Advanced (150-200 words)</option>
          </select>
        </div>
        <div className="form-group">
          <label>Topic</label>
          <select className="select" value={config.topic} onChange={e => setConfig(c => ({ ...c, topic: e.target.value }))}>
            {TOPICS.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
          </select>
        </div>
        <button className="btn btn-primary" onClick={load} disabled={loading || recording}>
          {loading ? <span className="spinner" style={{ width: 14, height: 14 }} /> : <RefreshCw size={16} />}
          {passage ? 'New Passage' : 'Generate Passage'}
        </button>
      </div>

      {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>}

      {loading && (
        <div className="card" style={{ textAlign: 'center', padding: 48 }}>
          <div className="spinner" style={{ margin: '0 auto 16px' }} />
          <p>Generating passage…</p>
        </div>
      )}

      {!loading && !passage && !error && (
        <div className="empty-state card">
          <div className="empty-state-icon"><BookOpen size={28} /></div>
          <div className="empty-state-title">Ready to Read?</div>
          <div className="empty-state-description">Generate a passage and read it aloud. Compare your spoken words with the original text.</div>
          <button className="btn btn-primary" onClick={load}>Generate Passage</button>
        </div>
      )}

      {passage && !loading && (
        <div style={{ maxWidth: 720 }} className="fade-in">
          <div className="card card-elevated" style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <div>
                <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 20, fontWeight: 700 }}>{passage.title}</h2>
                <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                  <span className="badge badge-neutral">{passage.topic}</span>
                  <span className="badge badge-neutral">{passage.word_count} words</span>
                  <span className={`badge badge-${passage.difficulty === 'beginner' ? 'success' : passage.difficulty === 'intermediate' ? 'warning' : 'error'}`}>
                    {passage.difficulty}
                  </span>
                </div>
              </div>
            </div>

            {/* Listen first */}
            <div style={{ marginBottom: 16 }}>
              <AudioPlayer text={passage.passage} label="Listen to Reference" />
            </div>

            {/* Passage text */}
            <div style={{ padding: '16px 20px', background: 'var(--bg-surface)', borderRadius: 8, marginBottom: 16 }}>
              <p className="passage-text">{passage.passage}</p>
            </div>

            {/* Difficult words */}
            {passage.difficult_words.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8 }}>💡 Difficult Words:</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {passage.difficult_words.map(w => {
                    const saved = savedMap[w.word.toLowerCase()] || isVocabularySaved(w.word);
                    return (
                      <div
                        key={w.word}
                        style={{
                          padding: '6px 12px',
                          background: 'var(--bg-card)',
                          border: '1px solid var(--border-color)',
                          borderRadius: 20,
                          fontSize: 13,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                        }}
                      >
                        <strong>{w.word}</strong>
                        <span style={{ color: 'var(--text-muted)' }}>/{w.pronunciation}/</span>
                        <span style={{ color: 'var(--text-secondary)' }}>— {w.meaning}</span>
                        <button
                          type="button"
                          className="btn btn-ghost btn-icon"
                          onClick={() => {
                            saveVocabularyItem({
                              word: w.word,
                              meaning: w.meaning,
                              pronunciation: w.pronunciation,
                              examples: passage ? [passage.passage.slice(0, 120) + '...'] : [],
                            });
                            setSavedMap(prev => ({ ...prev, [w.word.toLowerCase()]: true }));
                          }}
                          title={saved ? 'Saved in Vocabulary' : 'Save to Vocabulary'}
                          style={{
                            padding: 2,
                            marginLeft: 4,
                            color: saved ? 'var(--color-primary-600)' : 'var(--text-muted)',
                          }}
                        >
                          {saved ? <BookmarkCheck size={14} /> : <Bookmark size={14} />}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Tips */}
            {passage.reading_tips.length > 0 && (
              <div style={{ marginBottom: 16, padding: '10px 14px', background: 'var(--color-primary-50)', borderRadius: 8 }}>
                {passage.reading_tips.map((tip, i) => (
                  <div key={i} style={{ fontSize: 13, color: 'var(--color-primary-700)', marginBottom: 3 }}>💡 {tip}</div>
                ))}
              </div>
            )}

            {/* Record yourself */}
            <div style={{ marginTop: 16 }}>
              <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 10 }}>🎙️ Now Read It Aloud:</div>
              <VoiceRecorder
                onTranscript={handleTranscript}
                onRecordingStart={() => {
                  handleRecordingStart();
                  setRecording(true);
                }}
                onRecordingComplete={() => setRecording(false)}
                onCancel={() => {
                  handleRecordingCancel();
                  setRecording(false);
                }}
                label="Start Reading"
              />
              {transcript && (
                <div style={{ marginTop: 12, padding: '10px 14px', background: 'var(--bg-surface)', borderRadius: 8, fontSize: 13 }}>
                  <div style={{ color: 'var(--text-muted)', fontSize: 11, marginBottom: 4 }}>Your transcript:</div>
                  {transcript}
                </div>
              )}
              {transcript && !comparison && (
                <button
                  className="btn btn-primary"
                  style={{ marginTop: 12 }}
                  onClick={checkReading}
                  disabled={checking || recording}
                >
                  {checking ? <span className="spinner" style={{ width: 14, height: 14 }} /> : <Eye size={16} />}
                  Compare with Original
                </button>
              )}
            </div>
          </div>

          {/* Comparison result */}
          {comparison && (
            <div className="card fade-in" style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div style={{ fontWeight: 700, fontSize: 16 }}>📊 Reading Accuracy</div>
                <div style={{
                  fontSize: 22, fontWeight: 800,
                  color: comparison.accuracy >= 90 ? 'var(--color-success)' : comparison.accuracy >= 70 ? 'var(--color-warning)' : 'var(--color-error)'
                }}>
                  {comparison.accuracy}%
                </div>
              </div>
              <WordDiffDisplay diffs={comparison.diffs} />
              <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 8, fontSize: 13 }}>
                <span className="word-token correct" style={{ fontSize: 12 }}>Correct</span>
                <span className="word-token omitted" style={{ fontSize: 12 }}>Missed</span>
                <span className="word-token substituted" style={{ fontSize: 12 }}>Different word</span>
                <span className="word-token extra" style={{ fontSize: 12 }}>Extra word</span>
              </div>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8 }}>
                Note: This measures word accuracy from speech recognition, not pronunciation quality or accent.
              </p>
            </div>
          )}

          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-secondary" disabled={recording} onClick={() => { setComparison(null); setTranscript(''); transcriptRef.current = ''; }}>
              <RefreshCw size={16} /> Try Again
            </button>
            <button className="btn btn-primary" onClick={load} disabled={recording}>
              New Passage
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
