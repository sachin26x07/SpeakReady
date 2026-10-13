import { useState, useRef } from 'react';
import { Upload, FileText, RefreshCw, ChevronRight, CheckCircle, AlertCircle, Info, Trash2 } from 'lucide-react';
import { parseResume, generateInterviewQuestions, evaluateInterview } from '../services/api';
import { getResume, saveResume, clearResume } from '../services/storage';
import { useSettings } from '../context/SettingsContext';
import VoiceRecorder from '../components/VoiceRecorder';
import type { InterviewQuestion, InterviewEvaluation, ResumeData } from '../types';

const INTERVIEW_TYPES = [
  { value: 'mixed', label: 'Mixed Interview' },
  { value: 'hr', label: 'HR Interview' },
  { value: 'technical', label: 'Technical Interview' },
  { value: 'project', label: 'Project Explanation' },
  { value: 'cross-question', label: 'Resume Cross-Questioning' },
  { value: 'communication', label: 'Communication Assessment' },
];

export default function ResumeInterview() {
  const { settings } = useSettings();
  const [resume, setResume] = useState<ResumeData | null>(getResume);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [extractedText, setExtractedText] = useState('');
  const [editingText, setEditingText] = useState(false);

  const [questions, setQuestions] = useState<InterviewQuestion[]>([]);
  const [current, setCurrent] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [evaluation, setEvaluation] = useState<InterviewEvaluation | null>(null);
  const [evaluating, setEvaluating] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [textAnswer, setTextAnswer] = useState('');
  const [useText, setUseText] = useState(false);
  const [error, setError] = useState('');
  const transcriptRef = useRef('');

  const [config, setConfig] = useState({
    type: 'mixed',
    difficulty: 'intermediate' as 'beginner' | 'intermediate' | 'advanced',
    count: 5,
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileDrop = async (file: File) => {
    setUploading(true);
    setUploadError('');
    try {
      const res = await parseResume(file);
      setExtractedText(res.text);
      setEditingText(true);
    } catch (e: any) {
      setUploadError(e.message || 'Failed to parse resume.');
    } finally {
      setUploading(false);
    }
  };

  const confirmResume = () => {
    const data: ResumeData = {
      filename: 'My Resume',
      text: extractedText,
      wordCount: extractedText.split(/\s+/).length,
      uploadedAt: Date.now(),
    };
    saveResume(data);
    setResume(data);
    setEditingText(false);
  };

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFileDrop(file);
  };

  const generateQuestions = async () => {
    if (!resume) return;
    setGenerating(true);
    setError('');
    setQuestions([]);
    setCurrent(0);
    setEvaluation(null);
    setTranscript('');
    setTextAnswer('');

    try {
      const res = await generateInterviewQuestions({
        resumeText: resume.text,
        interviewType: config.type,
        difficulty: config.difficulty,
        count: config.count,
        provider: settings.provider,
      });
      setQuestions(res.questions);
    } catch (e: any) {
      setError(e.message || 'Failed to generate questions.');
    } finally {
      setGenerating(false);
    }
  };

  const handleTranscript = (t: string, isFinal: boolean) => {
    if (isFinal) transcriptRef.current += ' ' + t;
    setTranscript(transcriptRef.current.trim() || t);
  };

  const evaluate = async () => {
    const q = questions[current];
    if (!q) return;
    const answer = useText ? textAnswer : transcriptRef.current;
    if (!answer.trim()) { setError('Please provide an answer.'); return; }

    setEvaluating(true);
    setError('');
    try {
      const res = await evaluateInterview({
        question: q.question,
        answer,
        resumeContext: resume?.text.slice(0, 1000) || '',
        language: settings.feedbackLanguage,
        provider: settings.provider,
      });
      setEvaluation(res.evaluation);
    } catch (e: any) {
      setError(e.message || 'Evaluation failed.');
    } finally {
      setEvaluating(false);
    }
  };

  const nextQuestion = () => {
    if (current + 1 >= questions.length) {
      generateQuestions();
    } else {
      setCurrent(c => c + 1);
      setEvaluation(null);
      setTranscript('');
      setTextAnswer('');
      transcriptRef.current = '';
    }
  };

  const q = questions[current];

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">📋 Resume Interview Trainer</h1>
        <p className="page-subtitle">Upload your resume and practise personalized interview questions</p>
      </div>

      <div className="alert alert-info" style={{ marginBottom: 20 }}>
        <Info size={16} />
        <div>
          <strong>Privacy:</strong> Your resume text is stored locally on your device.
          When you click "Generate Questions", the resume text is sent to the selected AI provider to generate questions.
          You will be asked to confirm before this happens.
        </div>
      </div>

      {/* Resume upload section */}
      {!resume && !editingText && (
        <div className="card card-elevated" style={{ maxWidth: 560, marginBottom: 24 }}>
          <h2 style={{ fontWeight: 700, fontSize: 18, marginBottom: 16 }}>Step 1: Upload Your Resume</h2>
          <div
            className="upload-area"
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload size={32} color="var(--color-primary-400)" style={{ margin: '0 auto 12px' }} />
            <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 6 }}>Drag & drop your resume here</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>or click to browse</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>PDF, DOCX, DOC, TXT • Max 5MB</div>
            {uploading && <div className="spinner" style={{ margin: '12px auto 0' }} />}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx,.doc,.txt"
            style={{ display: 'none' }}
            onChange={e => { if (e.target.files?.[0]) handleFileDrop(e.target.files[0]); }}
          />
          {uploadError && <div className="alert alert-error" style={{ marginTop: 10 }}><AlertCircle size={14} />{uploadError}</div>}
        </div>
      )}

      {/* Text review after extraction */}
      {editingText && (
        <div className="card card-elevated" style={{ maxWidth: 720, marginBottom: 24 }}>
          <h2 style={{ fontWeight: 700, fontSize: 18, marginBottom: 8 }}>Step 2: Review Extracted Text</h2>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>
            Please review the extracted text and correct any errors before proceeding.
          </p>
          <textarea
            className="textarea"
            value={extractedText}
            onChange={e => setExtractedText(e.target.value)}
            rows={15}
            style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}
          />
          <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
            <button className="btn btn-primary" onClick={confirmResume} disabled={extractedText.length < 50}>
              <CheckCircle size={16} /> Confirm & Save Resume
            </button>
            <button className="btn btn-secondary" onClick={() => setEditingText(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Resume loaded */}
      {resume && !editingText && (
        <>
          <div className="card" style={{ marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 36, height: 36, background: 'var(--color-primary-100)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <FileText size={18} color="var(--color-primary-600)" />
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{resume.filename}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{resume.wordCount} words • Saved locally</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-secondary btn-sm" onClick={() => { setEditingText(true); setExtractedText(resume.text); }}>
                Edit Text
              </button>
              <button className="btn btn-danger btn-sm" onClick={() => { clearResume(); setResume(null); setQuestions([]); }}>
                <Trash2 size={13} /> Remove
              </button>
            </div>
          </div>

          {/* Config */}
          <div className="card" style={{ marginBottom: 20, display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'flex-end' }}>
            <div className="form-group">
              <label>Interview Type</label>
              <select className="select" value={config.type} onChange={e => setConfig(c => ({ ...c, type: e.target.value }))}>
                {INTERVIEW_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Difficulty</label>
              <select className="select" value={config.difficulty} onChange={e => setConfig(c => ({ ...c, difficulty: e.target.value as any }))}>
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>
            <div className="form-group">
              <label>Questions</label>
              <select className="select" value={config.count} onChange={e => setConfig(c => ({ ...c, count: +e.target.value }))}>
                {[3,5,7,10,15].map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <button className="btn btn-primary" onClick={generateQuestions} disabled={generating}>
              {generating ? <span className="spinner" style={{ width: 14, height: 14 }} /> : <RefreshCw size={16} />}
              Generate Questions
            </button>
          </div>

          {error && <div className="alert alert-error" style={{ marginBottom: 16 }}><AlertCircle size={14} />{error}</div>}

          {generating && (
            <div className="card" style={{ textAlign: 'center', padding: 48 }}>
              <div className="spinner" style={{ margin: '0 auto 16px' }} />
              <p>Generating personalized questions from your resume…</p>
            </div>
          )}

          {/* Question card */}
          {!generating && q && (
            <div style={{ maxWidth: 720 }} className="fade-in">
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                  Question {current + 1} of {questions.length}
                </span>
                <span className={`badge badge-neutral`}>{q.type}</span>
              </div>

              <div className="card card-elevated" style={{ marginBottom: 20 }}>
                <div style={{ fontWeight: 700, fontSize: 18, lineHeight: 1.6, marginBottom: 12, color: 'var(--text-primary)' }}>
                  {q.question}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>
                  From your resume: <em>{q.resume_reference}</em>
                </div>
                <div style={{ marginBottom: 4, fontWeight: 600, fontSize: 13 }}>💡 Cover these points:</div>
                {q.what_to_cover.map((p, i) => (
                  <div key={i} style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 3 }}>• {p}</div>
                ))}
              </div>

              {/* Answer */}
              {!evaluation && (
                <div className="card" style={{ marginBottom: 16 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, marginBottom: 12 }}>
                    <input type="checkbox" checked={useText} onChange={e => setUseText(e.target.checked)} />
                    Type my answer instead
                  </label>
                  {useText ? (
                    <textarea
                      className="textarea"
                      placeholder="Type your answer..."
                      value={textAnswer}
                      onChange={e => setTextAnswer(e.target.value)}
                      rows={5}
                    />
                  ) : (
                    <VoiceRecorder onTranscript={handleTranscript} label="Record Answer" />
                  )}
                  {transcript && !useText && (
                    <div style={{ marginTop: 10, padding: '10px 14px', background: 'var(--bg-surface)', borderRadius: 8, fontSize: 13 }}>
                      <div style={{ color: 'var(--text-muted)', marginBottom: 4 }}>Your answer:</div>
                      {transcript}
                    </div>
                  )}
                  <button
                    className="btn btn-primary"
                    style={{ marginTop: 12 }}
                    onClick={evaluate}
                    disabled={evaluating || (!transcript && !textAnswer)}
                  >
                    {evaluating ? <span className="spinner" style={{ width: 14, height: 14 }} /> : '🤖 Evaluate My Answer'}
                  </button>
                </div>
              )}

              {/* Evaluation */}
              {evaluation && (
                <div className="fade-in">
                  <div className="card card-elevated" style={{ marginBottom: 16 }}>
                    <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                      <div className="score-circle" style={{
                        background: 'var(--color-primary-50)', color: 'var(--color-primary-600)',
                        border: '3px solid var(--color-primary-400)', width: 80, height: 80,
                      }}>
                        <span style={{ fontSize: 24, fontWeight: 800 }}>{evaluation.score}</span>
                        <span style={{ fontSize: 9, fontWeight: 600, textTransform: 'uppercase' }}>/10</span>
                      </div>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--text-primary)' }}>{evaluation.feedback}</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid-2" style={{ marginBottom: 16 }}>
                    <div className="card">
                      <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8, color: 'var(--color-success)' }}>✅ Strengths</div>
                      {evaluation.strengths.map((s, i) => <div key={i} style={{ fontSize: 13, marginBottom: 3 }}>• {s}</div>)}
                    </div>
                    <div className="card">
                      <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8, color: 'var(--color-warning)' }}>⚠️ Missing Points</div>
                      {evaluation.missing_points.map((p, i) => <div key={i} style={{ fontSize: 13, marginBottom: 3 }}>• {p}</div>)}
                    </div>
                  </div>

                  {evaluation.grammar_issues.length > 0 && (
                    <div className="card" style={{ marginBottom: 16 }}>
                      <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10 }}>🔧 Grammar Corrections</div>
                      {evaluation.grammar_issues.map((g, i) => (
                        <div key={i} style={{ marginBottom: 8, padding: '8px 12px', background: 'var(--bg-surface)', borderRadius: 6 }}>
                          <div style={{ fontSize: 12, color: 'var(--color-error)' }}>❌ {g.original}</div>
                          <div style={{ fontSize: 12, color: 'var(--color-success)' }}>✅ {g.corrected}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Rule: {g.rule}</div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="card" style={{ marginBottom: 20 }}>
                    <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8 }}>🌟 Better Answer</div>
                    <p style={{ fontSize: 13, lineHeight: 1.8, fontStyle: 'italic', background: 'var(--bg-surface)', padding: '10px 14px', borderRadius: 8, borderLeft: '3px solid var(--color-primary-400)' }}>
                      {evaluation.suggested_answer}
                    </p>
                  </div>

                  <div style={{ padding: '12px 16px', background: 'var(--color-primary-50)', borderRadius: 8, marginBottom: 20 }}>
                    <div style={{ fontSize: 12, color: 'var(--color-primary-600)', fontWeight: 600, marginBottom: 4 }}>Follow-up Question:</div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{evaluation.follow_up_question}</div>
                  </div>

                  <div style={{ display: 'flex', gap: 10 }}>
                    <button className="btn btn-secondary" onClick={() => { setEvaluation(null); setTranscript(''); setTextAnswer(''); transcriptRef.current = ''; }}>
                      Try Again
                    </button>
                    <button className="btn btn-primary" onClick={nextQuestion}>
                      {current + 1 >= questions.length ? 'New Set' : 'Next Question'} <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {!generating && questions.length === 0 && (
            <div className="empty-state card">
              <div className="empty-state-icon"><FileText size={28} /></div>
              <div className="empty-state-title">Resume Ready!</div>
              <div className="empty-state-description">
                Configure your interview type and difficulty, then click "Generate Questions" to start.
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
