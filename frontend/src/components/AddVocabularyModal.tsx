import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Volume2, Sparkles, Check, BookMarked } from 'lucide-react';
import { speak } from '../services/speech';
import { saveVocabularyItem } from '../services/storage';
import type { SavedVocabularyItem } from '../types';

interface AddVocabularyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: (item: SavedVocabularyItem) => void;
  initialData?: Partial<SavedVocabularyItem> | null;
}

const PARTS_OF_SPEECH = [
  'adjective',
  'noun',
  'verb',
  'adverb',
  'phrase',
  'idiom',
  'conjunction',
  'preposition',
  'interjection',
];

export default function AddVocabularyModal({
  isOpen,
  onClose,
  onSaved,
  initialData,
}: AddVocabularyModalProps) {
  const [word, setWord] = useState('');
  const [pronunciation, setPronunciation] = useState('');
  const [partOfSpeech, setPartOfSpeech] = useState('adjective');
  const [meaning, setMeaning] = useState('');
  const [examples, setExamples] = useState<string[]>(['']);
  const [synonyms, setSynonyms] = useState('');
  const [antonyms, setAntonyms] = useState('');
  const [usageTip, setUsageTip] = useState('');
  const [memoryTrick, setMemoryTrick] = useState('');
  const [error, setError] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  // Initialize or reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setWord(initialData.word || '');
        setPronunciation(initialData.pronunciation || '');
        setPartOfSpeech(initialData.part_of_speech || 'adjective');
        setMeaning(initialData.meaning || '');
        setExamples(
          initialData.examples && initialData.examples.length > 0
            ? [...initialData.examples]
            : ['']
        );
        setSynonyms(initialData.synonyms ? initialData.synonyms.join(', ') : '');
        setAntonyms(initialData.antonyms ? initialData.antonyms.join(', ') : '');
        setUsageTip(initialData.usage_tip || '');
        setMemoryTrick(initialData.memory_trick || '');
      } else {
        setWord('');
        setPronunciation('');
        setPartOfSpeech('adjective');
        setMeaning('');
        setExamples(['']);
        setSynonyms('');
        setAntonyms('');
        setUsageTip('');
        setMemoryTrick('');
      }
      setError('');
      setIsSuccess(false);
    }
  }, [isOpen, initialData]);

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleAddExample = () => {
    setExamples(prev => [...prev, '']);
  };

  const handleExampleChange = (index: number, val: string) => {
    setExamples(prev => {
      const next = [...prev];
      next[index] = val;
      return next;
    });
  };

  const handleRemoveExample = (index: number) => {
    if (examples.length === 1) {
      setExamples(['']);
      return;
    }
    setExamples(prev => prev.filter((_, i) => i !== index));
  };

  const handlePronounce = () => {
    if (!word.trim()) return;
    speak(word.trim());
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!word.trim()) {
      setError('Please enter a vocabulary word.');
      return;
    }
    if (!meaning.trim()) {
      setError('Please provide a meaning or definition.');
      return;
    }

    const filteredExamples = examples
      .map(ex => ex.trim())
      .filter(ex => ex.length > 0);

    const parsedSynonyms = synonyms
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);

    const parsedAntonyms = antonyms
      .split(',')
      .map(a => a.trim())
      .filter(Boolean);

    try {
      const saved = saveVocabularyItem({
        id: initialData?.id,
        word: word.trim(),
        meaning: meaning.trim(),
        examples: filteredExamples,
        pronunciation: pronunciation.trim() || undefined,
        part_of_speech: partOfSpeech,
        synonyms: parsedSynonyms.length > 0 ? parsedSynonyms : undefined,
        antonyms: parsedAntonyms.length > 0 ? parsedAntonyms : undefined,
        usage_tip: usageTip.trim() || undefined,
        memory_trick: memoryTrick.trim() || undefined,
        savedAt: initialData?.savedAt,
      });

      setIsSuccess(true);
      setTimeout(() => {
        onSaved(saved);
        onClose();
      }, 500);
    } catch (err: any) {
      setError(err?.message || 'Failed to save vocabulary word.');
    }
  };

  return (
    <div
      className="modal-backdrop"
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal-container" role="dialog" aria-modal="true">
        {/* Header */}
        <div className="modal-header">
          <div className="modal-title">
            <BookMarked size={20} color="var(--color-primary-600)" />
            <span>{initialData?.id ? 'Edit Vocabulary Word' : 'Add New Vocabulary Word'}</span>
          </div>
          <button
            type="button"
            className="btn btn-ghost btn-icon"
            onClick={onClose}
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
          <div className="modal-body">
            {error && (
              <div className="alert alert-error" style={{ padding: '8px 12px', fontSize: 13 }}>
                {error}
              </div>
            )}

            {isSuccess && (
              <div
                className="alert alert-success"
                style={{
                  background: 'var(--color-primary-50)',
                  color: 'var(--color-primary-800)',
                  padding: '8px 12px',
                  fontSize: 13,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <Check size={16} /> Word saved successfully!
              </div>
            )}

            {/* Word & Pronounce */}
            <div className="form-group">
              <label htmlFor="vocab-word">
                Word or Phrase <span style={{ color: 'var(--color-error)' }}>*</span>
              </label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  id="vocab-word"
                  type="text"
                  className="input"
                  placeholder="e.g. Resilient, Articulate, Epiphany"
                  value={word}
                  onChange={e => {
                    setWord(e.target.value);
                    if (error) setError('');
                  }}
                  autoFocus
                  required
                />
                <button
                  type="button"
                  className="btn btn-secondary btn-icon"
                  onClick={handlePronounce}
                  title="Listen to pronunciation"
                  disabled={!word.trim()}
                >
                  <Volume2 size={18} />
                </button>
              </div>
            </div>

            {/* Part of Speech & Pronunciation hint */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="form-group">
                <label htmlFor="vocab-pos">Part of Speech</label>
                <select
                  id="vocab-pos"
                  className="select"
                  value={partOfSpeech}
                  onChange={e => setPartOfSpeech(e.target.value)}
                >
                  {PARTS_OF_SPEECH.map(pos => (
                    <option key={pos} value={pos}>
                      {pos.charAt(0).toUpperCase() + pos.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="vocab-pronunciation">Pronunciation (Optional)</label>
                <input
                  id="vocab-pronunciation"
                  type="text"
                  className="input"
                  placeholder="e.g. /rɪˈzɪl.jənt/"
                  value={pronunciation}
                  onChange={e => setPronunciation(e.target.value)}
                />
              </div>
            </div>

            {/* Meaning */}
            <div className="form-group">
              <label htmlFor="vocab-meaning">
                Meaning / Definition <span style={{ color: 'var(--color-error)' }}>*</span>
              </label>
              <textarea
                id="vocab-meaning"
                className="textarea"
                rows={2}
                placeholder="Clear and concise explanation of the word's meaning..."
                value={meaning}
                onChange={e => {
                  setMeaning(e.target.value);
                  if (error) setError('');
                }}
                required
                style={{ minHeight: 68 }}
              />
            </div>

            {/* Examples list */}
            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label>Example Sentences</label>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={handleAddExample}
                  style={{ fontSize: 12, padding: '2px 8px', color: 'var(--color-primary-600)' }}
                >
                  <Plus size={14} /> Add Another Example
                </button>
              </div>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: -2, marginBottom: 6 }}>
                Real-world examples help you remember and use the word correctly in conversation.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {examples.map((ex, index) => (
                  <div key={index} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input
                      type="text"
                      className="input"
                      placeholder={`Example ${index + 1}: e.g. She remained resilient despite setbacks.`}
                      value={ex}
                      onChange={e => handleExampleChange(index, e.target.value)}
                    />
                    {examples.length > 1 && (
                      <button
                        type="button"
                        className="btn btn-ghost btn-icon"
                        onClick={() => handleRemoveExample(index)}
                        title="Remove example"
                        style={{ color: 'var(--color-error)', padding: 6 }}
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Synonyms & Antonyms */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="form-group">
                <label htmlFor="vocab-synonyms">Synonyms (Comma-separated)</label>
                <input
                  id="vocab-synonyms"
                  type="text"
                  className="input"
                  placeholder="e.g. tough, adaptable, buoyant"
                  value={synonyms}
                  onChange={e => setSynonyms(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label htmlFor="vocab-antonyms">Antonyms (Comma-separated)</label>
                <input
                  id="vocab-antonyms"
                  type="text"
                  className="input"
                  placeholder="e.g. fragile, weak, vulnerable"
                  value={antonyms}
                  onChange={e => setAntonyms(e.target.value)}
                />
              </div>
            </div>

            {/* Usage Tip & Memory Trick */}
            <div className="form-group">
              <label htmlFor="vocab-tip">💡 Usage Tip (Optional)</label>
              <input
                id="vocab-tip"
                type="text"
                className="input"
                placeholder="e.g. Often used in interviews to describe handling workplace challenges."
                value={usageTip}
                onChange={e => setUsageTip(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label htmlFor="vocab-trick">🧠 Memory Trick (Optional)</label>
              <input
                id="vocab-trick"
                type="text"
                className="input"
                placeholder="e.g. Think of 'silent rubber band' that always snaps back into shape."
                value={memoryTrick}
                onChange={e => setMemoryTrick(e.target.value)}
              />
            </div>
          </div>

          {/* Footer */}
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={isSuccess}>
              <Sparkles size={16} />
              {initialData?.id ? 'Update Word' : 'Save Vocabulary Word'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
