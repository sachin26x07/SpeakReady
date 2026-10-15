import { useState, useCallback, useEffect, useMemo } from 'react';
import {
  RefreshCw,
  BookMarked,
  Bookmark,
  BookmarkCheck,
  Plus,
  Search,
  Trash2,
  Edit3,
  Volume2,
  Sparkles,
  Layers,
  CheckCircle2,
  X,
  RotateCcw,
  Download,
} from 'lucide-react';
import { generateVocabulary } from '../services/api';
import { useSettings } from '../context/SettingsContext';
import { exportVocabularyToPdf } from '../utils/vocabularyPdf';
import {
  getSavedVocabulary,
  saveVocabularyItem,
  deleteSavedVocabularyItem,
  isVocabularySaved,
} from '../services/storage';
import { speak } from '../services/speech';
import AudioPlayer from '../components/AudioPlayer';
import AddVocabularyModal from '../components/AddVocabularyModal';
import type { VocabularyWord, SavedVocabularyItem } from '../types';

const THEMES = [
  'professional communication',
  'technology & IT',
  'workplace',
  'interview vocabulary',
  'academic English',
  'business English',
  'daily conversation',
  'leadership & management',
];

type ActiveTab = 'explore' | 'saved' | 'practice';

export default function VocabularyBuilder() {
  const { settings } = useSettings();

  // Tab state
  const [activeTab, setActiveTab] = useState<ActiveTab>('explore');

  // AI Generator state
  const [words, setWords] = useState<VocabularyWord[]>([]);
  const [current, setCurrent] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showDefinition, setShowDefinition] = useState(false);
  const [config, setConfig] = useState({
    theme: 'professional communication',
    count: 5,
    level: 'intermediate',
  });

  // Saved vocabulary state
  const [savedWords, setSavedWords] = useState<SavedVocabularyItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [posFilter, setPosFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'alpha'>('newest');

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<SavedVocabularyItem | null>(null);

  // Flashcard practice state
  const [practiceIndex, setPracticeIndex] = useState(0);
  const [practiceRevealed, setPracticeRevealed] = useState(false);

  // Notification / Toast state
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Load saved words from localStorage on mount
  const refreshSavedWords = useCallback(() => {
    const list = getSavedVocabulary();
    setSavedWords(list);
  }, []);

  useEffect(() => {
    refreshSavedWords();
  }, [refreshSavedWords]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Generate words via AI
  const loadAIWords = useCallback(async () => {
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

  // Current AI word
  const currentWord = words[current];

  // Save or bookmark current AI word
  const handleToggleSaveAIWord = (w: VocabularyWord) => {
    const alreadySaved = isVocabularySaved(w.word);
    if (alreadySaved) {
      const existing = savedWords.find(item => item.word.toLowerCase() === w.word.toLowerCase());
      if (existing) {
        deleteSavedVocabularyItem(existing.id);
        refreshSavedWords();
        showToast(`Removed "${w.word}" from saved vocabulary`);
      }
    } else {
      saveVocabularyItem({
        word: w.word,
        meaning: w.definition,
        simple_definition: w.simple_definition,
        examples: w.examples,
        pronunciation: w.pronunciation,
        part_of_speech: w.part_of_speech,
        synonyms: w.synonyms,
        antonyms: w.antonyms,
        usage_tip: w.usage_tip,
        memory_trick: w.memory_trick,
      });
      refreshSavedWords();
      showToast(`Saved "${w.word}" to your vocabulary!`);
    }
  };

  // Delete saved word
  const handleDeleteSavedWord = (item: SavedVocabularyItem) => {
    if (window.confirm(`Are you sure you want to delete "${item.word}" from your saved vocabulary?`)) {
      deleteSavedVocabularyItem(item.id);
      refreshSavedWords();
      showToast(`Deleted "${item.word}"`);
    }
  };

  // Edit saved word
  const handleEditSavedWord = (item: SavedVocabularyItem) => {
    setEditingItem(item);
    setIsModalOpen(true);
  };

  // Open modal for adding a new word
  const handleAddNewWord = () => {
    setEditingItem(null);
    setIsModalOpen(true);
  };

  // Filtered & sorted saved words
  const filteredSavedWords = useMemo(() => {
    let result = [...savedWords];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(item => {
        const matchesWord = item.word.toLowerCase().includes(q);
        const matchesMeaning = item.meaning.toLowerCase().includes(q);
        const matchesExamples = item.examples.some(ex => ex.toLowerCase().includes(q));
        const matchesSynonyms = item.synonyms?.some(s => s.toLowerCase().includes(q));
        return matchesWord || matchesMeaning || matchesExamples || matchesSynonyms;
      });
    }

    if (posFilter !== 'all') {
      result = result.filter(item => item.part_of_speech?.toLowerCase() === posFilter);
    }

    if (sortBy === 'newest') {
      result.sort((a, b) => b.savedAt - a.savedAt);
    } else if (sortBy === 'oldest') {
      result.sort((a, b) => a.savedAt - b.savedAt);
    } else if (sortBy === 'alpha') {
      result.sort((a, b) => a.word.localeCompare(b.word));
    }

    return result;
  }, [savedWords, searchQuery, posFilter, sortBy]);

  // Flashcard items
  const practiceWord = filteredSavedWords[practiceIndex] || savedWords[practiceIndex];

  return (
    <div>
      {/* Toast Alert */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            background: 'var(--bg-sidebar)',
            color: 'var(--text-inverse)',
            padding: '12px 20px',
            borderRadius: 'var(--border-radius-md)',
            boxShadow: 'var(--shadow-lg)',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            zIndex: 1100,
            fontSize: 14,
            fontWeight: 500,
            animation: 'modalSlideUp 0.2s ease-out',
          }}
        >
          <CheckCircle2 size={18} color="var(--color-primary-400)" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Page Header */}
      <div
        className="page-header"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: 16,
        }}
      >
        <div>
          <h1 className="page-title">📚 Vocabulary Builder</h1>
          <p className="page-subtitle">
            Master powerful words with clear meanings, real-world examples, and your personal saved vocabulary
          </p>
        </div>

        {/* Action Buttons: Add Vocabulary & PDF Download */}
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          {savedWords.length > 0 && (
            <button
              className="btn btn-secondary"
              onClick={() => exportVocabularyToPdf(savedWords)}
              title="Download all saved vocabulary as PDF"
            >
              <Download size={16} />
              Save as PDF
            </button>
          )}

          <button className="btn btn-primary" onClick={handleAddNewWord}>
            <Plus size={16} />
            Add Vocabulary Word
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="nav-tabs">
        <button
          className={`tab-btn ${activeTab === 'explore' ? 'active' : ''}`}
          onClick={() => setActiveTab('explore')}
        >
          <Sparkles size={16} />
          Explore AI Words
        </button>

        <button
          className={`tab-btn ${activeTab === 'saved' ? 'active' : ''}`}
          onClick={() => setActiveTab('saved')}
        >
          <BookMarked size={16} />
          Saved Vocabulary
          <span
            className="badge badge-neutral"
            style={{
              marginLeft: 4,
              fontSize: 11,
              background:
                activeTab === 'saved' ? 'var(--color-primary-100)' : 'var(--bg-surface)',
              color:
                activeTab === 'saved' ? 'var(--color-primary-800)' : 'var(--text-secondary)',
            }}
          >
            {savedWords.length}
          </span>
        </button>

        {savedWords.length > 0 && (
          <button
            className={`tab-btn ${activeTab === 'practice' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('practice');
              setPracticeIndex(0);
              setPracticeRevealed(false);
            }}
          >
            <Layers size={16} />
            Practice Flashcards
          </button>
        )}
      </div>

      {/* ========================================================
          TAB 1: EXPLORE AI WORDS
         ======================================================== */}
      {activeTab === 'explore' && (
        <div>
          {/* Controls Card */}
          <div
            className="card"
            style={{
              marginBottom: 20,
              display: 'flex',
              flexWrap: 'wrap',
              gap: 12,
              alignItems: 'flex-end',
            }}
          >
            <div className="form-group" style={{ minWidth: 200, flex: 1 }}>
              <label>Theme</label>
              <select
                className="select"
                value={config.theme}
                onChange={e => setConfig(c => ({ ...c, theme: e.target.value }))}
              >
                {THEMES.map(t => (
                  <option key={t} value={t}>
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group" style={{ minWidth: 140 }}>
              <label>Level</label>
              <select
                className="select"
                value={config.level}
                onChange={e => setConfig(c => ({ ...c, level: e.target.value }))}
              >
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>

            <div className="form-group" style={{ minWidth: 100 }}>
              <label>Words</label>
              <select
                className="select"
                value={config.count}
                onChange={e => setConfig(c => ({ ...c, count: +e.target.value }))}
              >
                {[5, 8, 10, 15].map(n => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>

            <button className="btn btn-primary" onClick={loadAIWords} disabled={loading}>
              {loading ? (
                <span className="spinner" style={{ width: 14, height: 14 }} />
              ) : (
                <RefreshCw size={16} />
              )}
              {words.length > 0 ? 'Generate More' : 'Load Words'}
            </button>
          </div>

          {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>}

          {loading && (
            <div className="card" style={{ textAlign: 'center', padding: 48 }}>
              <div className="spinner" style={{ margin: '0 auto 16px' }} />
              <p style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                Generating vocabulary words with definitions & examples…
              </p>
            </div>
          )}

          {!loading && words.length === 0 && !error && (
            <div className="empty-state card">
              <div className="empty-state-icon">
                <Sparkles size={28} />
              </div>
              <div className="empty-state-title">Build Your Vocabulary</div>
              <div className="empty-state-description">
                Generate curated words tailored for professional communication and interviews, or add your
                own custom words.
              </div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
                <button className="btn btn-primary" onClick={loadAIWords}>
                  <Sparkles size={16} /> Load AI Words
                </button>
                <button className="btn btn-secondary" onClick={handleAddNewWord}>
                  <Plus size={16} /> Add Custom Word
                </button>
              </div>
            </div>
          )}

          {!loading && currentWord && (
            <div style={{ maxWidth: 680 }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 12,
                }}
              >
                <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                  Word {current + 1} of {words.length}
                </span>

                {/* Save Word Button directly on current card */}
                {(() => {
                  const isSaved = isVocabularySaved(currentWord.word);
                  return (
                    <button
                      className={`btn ${isSaved ? 'btn-secondary' : 'btn-primary'} btn-sm`}
                      onClick={() => handleToggleSaveAIWord(currentWord)}
                      title={isSaved ? 'Remove from saved' : 'Save to vocabulary'}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                    >
                      {isSaved ? (
                        <>
                          <BookmarkCheck size={16} color="var(--color-primary-600)" />
                          <span>Saved to Vocabulary</span>
                        </>
                      ) : (
                        <>
                          <Bookmark size={16} />
                          <span>Save Word</span>
                        </>
                      )}
                    </button>
                  );
                })()}
              </div>

              {/* Word card */}
              <div className="card card-elevated fade-in" style={{ marginBottom: 20 }}>
                <div style={{ textAlign: 'center', padding: '12px 0 16px' }}>
                  <div
                    style={{
                      fontSize: 36,
                      fontFamily: 'var(--font-heading)',
                      fontWeight: 800,
                      color: 'var(--color-primary-700)',
                      marginBottom: 4,
                    }}
                  >
                    {currentWord.word}
                  </div>
                  <div style={{ fontSize: 15, color: 'var(--text-muted)', marginBottom: 8 }}>
                    /{currentWord.pronunciation}/
                  </div>
                  <span className="badge badge-neutral" style={{ textTransform: 'capitalize' }}>
                    {currentWord.part_of_speech}
                  </span>
                </div>

                <div style={{ marginBottom: 16 }}>
                  <AudioPlayer
                    text={`${currentWord.word}. ${currentWord.definition}`}
                    label="Hear Pronunciation & Definition"
                    compact
                  />
                </div>

                {!showDefinition ? (
                  <div style={{ textAlign: 'center', marginBottom: 16 }}>
                    <button className="btn btn-primary" onClick={() => setShowDefinition(true)}>
                      Reveal Meaning & Examples
                    </button>
                  </div>
                ) : (
                  <div className="fade-in">
                    {/* Definition */}
                    <div
                      style={{
                        padding: '14px 16px',
                        background: 'var(--color-primary-50)',
                        borderRadius: 8,
                        marginBottom: 16,
                      }}
                    >
                      <div
                        style={{
                          fontWeight: 600,
                          fontSize: 14,
                          color: 'var(--color-primary-800)',
                          marginBottom: 4,
                        }}
                      >
                        Meaning & Definition
                      </div>
                      <div style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--text-primary)' }}>
                        {currentWord.definition}
                      </div>
                      {currentWord.simple_definition && (
                        <div
                          style={{
                            fontSize: 13,
                            color: 'var(--text-secondary)',
                            marginTop: 4,
                            fontWeight: 500,
                          }}
                        >
                          Simply put: {currentWord.simple_definition}
                        </div>
                      )}
                    </div>

                    {/* Examples */}
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8 }}>
                        📝 Example Sentences ({currentWord.examples.length}):
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {currentWord.examples.map((ex, i) => (
                          <div
                            key={i}
                            style={{
                              fontSize: 13.5,
                              color: 'var(--text-primary)',
                              fontStyle: 'italic',
                              padding: '8px 12px',
                              background: 'var(--bg-surface)',
                              borderRadius: 6,
                              borderLeft: '3px solid var(--color-primary-400)',
                            }}
                          >
                            "{ex}"
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Synonyms & Antonyms */}
                    <div className="grid-2" style={{ marginBottom: 16 }}>
                      <div>
                        <div
                          style={{
                            fontWeight: 600,
                            fontSize: 12,
                            marginBottom: 6,
                            color: 'var(--color-success)',
                          }}
                        >
                          Synonyms
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                          {currentWord.synonyms.map(s => (
                            <span key={s} className="badge badge-success">
                              {s}
                            </span>
                          ))}
                        </div>
                      </div>

                      {currentWord.antonyms && currentWord.antonyms.length > 0 && (
                        <div>
                          <div
                            style={{
                              fontWeight: 600,
                              fontSize: 12,
                              marginBottom: 6,
                              color: 'var(--color-error)',
                            }}
                          >
                            Antonyms
                          </div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                            {currentWord.antonyms.map(a => (
                              <span key={a} className="badge badge-error">
                                {a}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Usage tip */}
                    {currentWord.usage_tip && (
                      <div
                        style={{
                          padding: '10px 14px',
                          background: '#fef3c7',
                          borderRadius: 8,
                          marginBottom: 12,
                        }}
                      >
                        <div style={{ fontSize: 12, fontWeight: 600, color: '#92400e', marginBottom: 3 }}>
                          💡 Usage Tip
                        </div>
                        <div style={{ fontSize: 13, color: '#78350f' }}>{currentWord.usage_tip}</div>
                      </div>
                    )}

                    {/* Memory trick */}
                    {currentWord.memory_trick && (
                      <div
                        style={{
                          padding: '10px 14px',
                          background: 'var(--bg-surface)',
                          borderRadius: 8,
                        }}
                      >
                        <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 3 }}>
                          🧠 Memory Trick
                        </div>
                        <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                          {currentWord.memory_trick}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Navigation */}
              {showDefinition && (
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                  <button
                    className="btn btn-secondary"
                    onClick={() => {
                      setCurrent(c => Math.max(0, c - 1));
                      setShowDefinition(false);
                    }}
                    disabled={current === 0}
                  >
                    ← Previous
                  </button>

                  <button
                    className="btn btn-primary"
                    onClick={() => {
                      if (current + 1 >= words.length) loadAIWords();
                      else {
                        setCurrent(c => c + 1);
                        setShowDefinition(false);
                      }
                    }}
                  >
                    {current + 1 >= words.length ? 'Load More Words' : 'Next Word →'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ========================================================
          TAB 2: SAVED VOCABULARY
         ======================================================== */}
      {activeTab === 'saved' && (
        <div>
          {/* Action & Filter Toolbar */}
          <div
            className="card"
            style={{
              marginBottom: 20,
              display: 'flex',
              flexWrap: 'wrap',
              gap: 12,
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            {/* Search Input */}
            <div style={{ position: 'relative', minWidth: 240, flex: 1 }}>
              <Search
                size={16}
                color="var(--text-muted)"
                style={{ position: 'absolute', left: 12, top: 12 }}
              />
              <input
                type="text"
                className="input"
                placeholder="Search saved words, meanings, or examples…"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{ paddingLeft: 36 }}
              />
              {searchQuery && (
                <button
                  className="btn btn-ghost btn-icon"
                  onClick={() => setSearchQuery('')}
                  style={{ position: 'absolute', right: 4, top: 4, padding: 6 }}
                  title="Clear search"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Part of Speech Filter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <label style={{ fontSize: 13, whiteSpace: 'nowrap' }}>Part of Speech:</label>
              <select
                className="select"
                value={posFilter}
                onChange={e => setPosFilter(e.target.value)}
                style={{ width: 'auto', minWidth: 120 }}
              >
                <option value="all">All Types</option>
                <option value="noun">Noun</option>
                <option value="verb">Verb</option>
                <option value="adjective">Adjective</option>
                <option value="adverb">Adverb</option>
                <option value="phrase">Phrase</option>
                <option value="idiom">Idiom</option>
              </select>
            </div>

            {/* Sort Dropdown & PDF Export */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <label style={{ fontSize: 13, whiteSpace: 'nowrap' }}>Sort:</label>
                <select
                  className="select"
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value as any)}
                  style={{ width: 'auto', minWidth: 130 }}
                >
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                  <option value="alpha">A - Z</option>
                </select>
              </div>

              <button
                className="btn btn-secondary"
                onClick={() => exportVocabularyToPdf(filteredSavedWords.length > 0 ? filteredSavedWords : savedWords)}
                disabled={savedWords.length === 0}
                title="Download your saved vocabulary as PDF"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >
                <Download size={15} />
                <span>Save as PDF</span>
              </button>
            </div>
          </div>

          {/* Empty State */}
          {filteredSavedWords.length === 0 && (
            <div className="empty-state card">
              <div className="empty-state-icon">
                <BookMarked size={28} />
              </div>
              <div className="empty-state-title">
                {savedWords.length === 0
                  ? 'No Saved Vocabulary Words Yet'
                  : 'No Matching Words Found'}
              </div>
              <div className="empty-state-description">
                {savedWords.length === 0
                  ? 'Build your personal vocabulary bank! Add words manually or save them from the Explore tab.'
                  : `No words matched your search "${searchQuery}". Try a different keyword or reset filters.`}
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                <button className="btn btn-primary" onClick={handleAddNewWord}>
                  <Plus size={16} /> Add Your First Word
                </button>
                {savedWords.length === 0 && (
                  <button className="btn btn-secondary" onClick={() => setActiveTab('explore')}>
                    <Sparkles size={16} /> Explore AI Words
                  </button>
                )}
                {savedWords.length > 0 && searchQuery && (
                  <button className="btn btn-secondary" onClick={() => setSearchQuery('')}>
                    Reset Search
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Words Grid */}
          {filteredSavedWords.length > 0 && (
            <div className="vocab-grid">
              {filteredSavedWords.map(item => (
                <div key={item.id} className="vocab-card card-elevated fade-in">
                  {/* Top Bar: Word, Pos, Actions */}
                  <div>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        gap: 8,
                        marginBottom: 6,
                      }}
                    >
                      <div>
                        <div
                          style={{
                            fontFamily: 'var(--font-heading)',
                            fontSize: 22,
                            fontWeight: 700,
                            color: 'var(--color-primary-700)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                          }}
                        >
                          <span>{item.word}</span>
                          <button
                            type="button"
                            className="btn btn-ghost btn-icon"
                            onClick={() => speak(item.word)}
                            title="Hear pronunciation"
                            style={{ padding: 4, color: 'var(--color-primary-600)' }}
                          >
                            <Volume2 size={16} />
                          </button>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                          {item.pronunciation && (
                            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                              /{item.pronunciation}/
                            </span>
                          )}
                          {item.part_of_speech && (
                            <span className="badge badge-neutral" style={{ textTransform: 'capitalize' }}>
                              {item.part_of_speech}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Card Actions: Edit & Delete */}
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button
                          className="btn btn-ghost btn-icon"
                          onClick={() => handleEditSavedWord(item)}
                          title="Edit word"
                          style={{ padding: 6 }}
                        >
                          <Edit3 size={15} />
                        </button>
                        <button
                          className="btn btn-ghost btn-icon"
                          onClick={() => handleDeleteSavedWord(item)}
                          title="Delete word"
                          style={{ padding: 6, color: 'var(--color-error)' }}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>

                    {/* Meaning Block */}
                    <div
                      style={{
                        padding: '10px 12px',
                        background: 'var(--color-primary-50)',
                        borderRadius: 8,
                        marginTop: 10,
                        marginBottom: 12,
                      }}
                    >
                      <div
                        style={{
                          fontSize: 12,
                          fontWeight: 600,
                          color: 'var(--color-primary-800)',
                          marginBottom: 3,
                        }}
                      >
                        Meaning
                      </div>
                      <div style={{ fontSize: 13.5, lineHeight: 1.6, color: 'var(--text-primary)' }}>
                        {item.meaning}
                      </div>
                    </div>

                    {/* Examples Block */}
                    {item.examples && item.examples.length > 0 && (
                      <div style={{ marginBottom: 12 }}>
                        <div
                          style={{
                            fontSize: 12,
                            fontWeight: 600,
                            color: 'var(--text-secondary)',
                            marginBottom: 4,
                          }}
                        >
                          Examples ({item.examples.length}):
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          {item.examples.map((ex, idx) => (
                            <div
                              key={idx}
                              style={{
                                fontSize: 13,
                                color: 'var(--text-primary)',
                                fontStyle: 'italic',
                                padding: '4px 8px',
                                background: 'var(--bg-surface)',
                                borderRadius: 4,
                                borderLeft: '2.5px solid var(--color-primary-400)',
                              }}
                            >
                              "{ex}"
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Synonyms */}
                    {item.synonyms && item.synonyms.length > 0 && (
                      <div style={{ marginBottom: 10 }}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'center' }}>
                          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)' }}>
                            Synonyms:
                          </span>
                          {item.synonyms.map(syn => (
                            <span key={syn} className="badge badge-success" style={{ fontSize: 10.5 }}>
                              {syn}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Usage tip / memory trick preview */}
                    {item.usage_tip && (
                      <div
                        style={{
                          fontSize: 12,
                          color: '#92400e',
                          background: '#fef3c7',
                          padding: '6px 10px',
                          borderRadius: 6,
                          marginTop: 6,
                        }}
                      >
                        💡 <strong>Tip:</strong> {item.usage_tip}
                      </div>
                    )}
                  </div>

                  {/* Card Footer */}
                  <div
                    style={{
                      borderTop: '1px solid var(--border-color)',
                      marginTop: 12,
                      paddingTop: 8,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      Added {new Date(item.savedAt).toLocaleDateString()}
                    </span>
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => speak(`${item.word}. ${item.meaning}`)}
                      style={{ fontSize: 12, padding: '2px 6px' }}
                    >
                      <Volume2 size={13} /> Listen All
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================
          TAB 3: PRACTICE FLASHCARDS
         ======================================================== */}
      {activeTab === 'practice' && practiceWord && (
        <div style={{ maxWidth: 640, margin: '0 auto' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 16,
            }}
          >
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              Flashcard {practiceIndex + 1} of {filteredSavedWords.length || savedWords.length}
            </span>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => setActiveTab('saved')}
              style={{ fontSize: 13 }}
            >
              ← Back to List
            </button>
          </div>

          <div
            className="card card-elevated fade-in"
            style={{
              padding: '32px 24px',
              textAlign: 'center',
              minHeight: 320,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              position: 'relative',
            }}
          >
            <span
              className="badge badge-neutral"
              style={{ position: 'absolute', top: 16, left: 16, textTransform: 'capitalize' }}
            >
              {practiceWord.part_of_speech || 'Vocabulary'}
            </span>

            <div
              style={{
                fontSize: 38,
                fontFamily: 'var(--font-heading)',
                fontWeight: 800,
                color: 'var(--color-primary-700)',
                marginBottom: 6,
              }}
            >
              {practiceWord.word}
            </div>

            {practiceWord.pronunciation && (
              <div style={{ fontSize: 16, color: 'var(--text-muted)', marginBottom: 12 }}>
                /{practiceWord.pronunciation}/
              </div>
            )}

            <div style={{ marginBottom: 20 }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => speak(practiceWord.word)}
              >
                <Volume2 size={16} /> Listen Pronunciation
              </button>
            </div>

            {!practiceRevealed ? (
              <div>
                <button
                  className="btn btn-primary"
                  onClick={() => setPracticeRevealed(true)}
                  style={{ minWidth: 200 }}
                >
                  Reveal Meaning & Examples
                </button>
              </div>
            ) : (
              <div className="fade-in" style={{ textAlign: 'left', marginTop: 12 }}>
                {/* Meaning */}
                <div
                  style={{
                    padding: '12px 16px',
                    background: 'var(--color-primary-50)',
                    borderRadius: 8,
                    marginBottom: 14,
                  }}
                >
                  <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--color-primary-800)', marginBottom: 3 }}>
                    Meaning:
                  </div>
                  <div style={{ fontSize: 14, lineHeight: 1.6 }}>{practiceWord.meaning}</div>
                </div>

                {/* Examples */}
                {practiceWord.examples && practiceWord.examples.length > 0 && (
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4 }}>Examples:</div>
                    {practiceWord.examples.map((ex, i) => (
                      <div
                        key={i}
                        style={{
                          fontSize: 13,
                          fontStyle: 'italic',
                          padding: '4px 8px',
                          background: 'var(--bg-surface)',
                          borderRadius: 4,
                          marginBottom: 4,
                        }}
                      >
                        "{ex}"
                      </div>
                    ))}
                  </div>
                )}

                {/* Usage Tip */}
                {practiceWord.usage_tip && (
                  <div
                    style={{
                      padding: '8px 12px',
                      background: '#fef3c7',
                      color: '#92400e',
                      borderRadius: 6,
                      fontSize: 12,
                    }}
                  >
                    💡 <strong>Tip:</strong> {practiceWord.usage_tip}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Navigation Controls */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: 16,
            }}
          >
            <button
              className="btn btn-secondary"
              onClick={() => {
                setPracticeIndex(i => Math.max(0, i - 1));
                setPracticeRevealed(false);
              }}
              disabled={practiceIndex === 0}
            >
              ← Previous
            </button>

            <button
              className="btn btn-ghost"
              onClick={() => {
                setPracticeRevealed(false);
              }}
              title="Reset card flip"
            >
              <RotateCcw size={16} /> Flip Card
            </button>

            <button
              className="btn btn-primary"
              onClick={() => {
                const total = filteredSavedWords.length || savedWords.length;
                if (practiceIndex + 1 < total) {
                  setPracticeIndex(i => i + 1);
                  setPracticeRevealed(false);
                } else {
                  setPracticeIndex(0);
                  setPracticeRevealed(false);
                  showToast('You completed all flashcards! Starting over.');
                }
              }}
            >
              {practiceIndex + 1 >= (filteredSavedWords.length || savedWords.length)
                ? 'Start Over'
                : 'Next Word →'}
            </button>
          </div>
        </div>
      )}

      {/* Add / Edit Vocabulary Modal */}
      <AddVocabularyModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingItem(null);
        }}
        onSaved={item => {
          refreshSavedWords();
          showToast(`Successfully saved "${item.word}"!`);
        }}
        initialData={editingItem}
      />
    </div>
  );
}
