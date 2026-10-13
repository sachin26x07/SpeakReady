import { useState, useCallback } from 'react';
import { RefreshCw, BookMarked } from 'lucide-react';
import { generateVocabulary } from '../services/api';
import { useSettings } from '../context/SettingsContext';
import AudioPlayer from '../components/AudioPlayer';
import type { VocabularyWord } from '../types';

const THEMES = [
  'professional communication', 'technology & IT', 'workplace', 'interview vocabulary',
  'academic English', 'business English', 'daily conversation', 'leadership & management',
];

export default function VocabularyBuilder() {
  const { settings } = useSettings();
  const [words, setWords] = useState<VocabularyWord[]>([]);
  const [current, setCurrent] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showDefinition, setShowDefinition] = useState(false);
  const [config, setConfig] = useState({ theme: 'professional communication', count: 5, level: 'intermediate' });

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    setWords([]);
    setCurrent(0);
    setShowDefinition(false);

    try {
      const res = await generateVocabulary({
        theme: config.theme,
        count: config.count,
        level: config.level,
        provider: settings.provider,
      });
      setWords(res.words);
    } catch (e: any) {
      setError(e.message || 'Failed to generate vocabulary.');
    } finally {
      setLoading(false);
    }
  }, [config, settings.provider]);

  const w = words[current];

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">📚 Vocabulary Builder</h1>
        <p className="page-subtitle">Learn new words with pronunciation, examples, and memory tricks</p>
      </div>

      <div className="card" style={{ marginBottom: 20, display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'flex-end' }}>
        <div className="form-group">
          <label>Theme</label>
          <select className="select" value={config.theme} onChange={e => setConfig(c => ({ ...c, theme: e.target.value }))}>
            {THEMES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label>Level</label>
          <select className="select" value={config.level} onChange={e => setConfig(c => ({ ...c, level: e.target.value }))}>
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </select>
        </div>
        <div className="form-group">
          <label>Words</label>
          <select className="select" value={config.count} onChange={e => setConfig(c => ({ ...c, count: +e.target.value }))}>
            {[5, 8, 10, 15].map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
        <button className="btn btn-primary" onClick={load} disabled={loading}>
          {loading ? <span className="spinner" style={{ width: 14, height: 14 }} /> : <RefreshCw size={16} />}
          Load Words
        </button>
      </div>

      {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>}

      {loading && <div className="card" style={{ textAlign: 'center', padding: 48 }}>
        <div className="spinner" style={{ margin: '0 auto 16px' }} />
        <p>Generating vocabulary words…</p>
      </div>}

      {!loading && words.length === 0 && !error && (
        <div className="empty-state card">
          <div className="empty-state-icon"><BookMarked size={28} /></div>
          <div className="empty-state-title">Build Your Vocabulary</div>
          <div className="empty-state-description">Learn words with clear definitions, examples, and memory tricks to help you communicate better.</div>
          <button className="btn btn-primary" onClick={load}>Load Words</button>
        </div>
      )}

      {!loading && w && (
        <div style={{ maxWidth: 640 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Word {current + 1} of {words.length}</span>
          </div>

          {/* Word card */}
          <div className="card card-elevated fade-in" style={{ marginBottom: 20 }}>
            <div style={{ textAlign: 'center', padding: '8px 0 16px' }}>
              <div style={{ fontSize: 36, fontFamily: 'var(--font-heading)', fontWeight: 800, color: 'var(--color-primary-700)', marginBottom: 4 }}>
                {w.word}
              </div>
              <div style={{ fontSize: 15, color: 'var(--text-muted)', marginBottom: 8 }}>/{w.pronunciation}/</div>
              <span className="badge badge-neutral">{w.part_of_speech}</span>
            </div>

            <div style={{ marginBottom: 16 }}>
              <AudioPlayer text={`${w.word}. ${w.definition}`} label="Hear Pronunciation" compact />
            </div>

            {!showDefinition ? (
              <div style={{ textAlign: 'center', marginBottom: 16 }}>
                <button className="btn btn-primary" onClick={() => setShowDefinition(true)}>
                  Reveal Definition
                </button>
              </div>
            ) : (
              <div className="fade-in">
                <div style={{ padding: '14px 16px', background: 'var(--color-primary-50)', borderRadius: 8, marginBottom: 16 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--color-primary-800)', marginBottom: 4 }}>Definition</div>
                  <div style={{ fontSize: 14, lineHeight: 1.7 }}>{w.definition}</div>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
                    Simply: {w.simple_definition}
                  </div>
                </div>

                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 6 }}>📝 Examples:</div>
                  {w.examples.map((ex, i) => (
                    <div key={i} style={{ fontSize: 13, color: 'var(--text-primary)', fontStyle: 'italic', marginBottom: 4 }}>
                      "{ex}"
                    </div>
                  ))}
                </div>

                <div className="grid-2" style={{ marginBottom: 12 }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 12, marginBottom: 4, color: 'var(--color-success)' }}>Synonyms</div>
                    {w.synonyms.map(s => <span key={s} className="badge badge-success" style={{ marginRight: 4, marginBottom: 4 }}>{s}</span>)}
                  </div>
                  {w.antonyms.length > 0 && (
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 12, marginBottom: 4, color: 'var(--color-error)' }}>Antonyms</div>
                      {w.antonyms.map(a => <span key={a} className="badge badge-error" style={{ marginRight: 4, marginBottom: 4 }}>{a}</span>)}
                    </div>
                  )}
                </div>

                <div style={{ padding: '10px 14px', background: '#fef3c7', borderRadius: 8, marginBottom: 12 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#92400e', marginBottom: 3 }}>💡 Usage Tip</div>
                  <div style={{ fontSize: 13, color: '#78350f' }}>{w.usage_tip}</div>
                </div>

                <div style={{ padding: '10px 14px', background: 'var(--bg-surface)', borderRadius: 8 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 3 }}>🧠 Memory Trick</div>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{w.memory_trick}</div>
                </div>
              </div>
            )}
          </div>

          {/* Navigation */}
          {showDefinition && (
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-secondary" onClick={() => { setCurrent(c => Math.max(0, c-1)); setShowDefinition(false); }} disabled={current === 0}>
                ← Previous
              </button>
              <button className="btn btn-primary" onClick={() => {
                if (current + 1 >= words.length) load();
                else { setCurrent(c => c + 1); setShowDefinition(false); }
              }}>
                {current + 1 >= words.length ? 'Load More' : 'Next Word →'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
