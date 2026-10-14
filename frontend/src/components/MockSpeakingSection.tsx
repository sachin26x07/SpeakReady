import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowRight, CheckCircle, Clock, RefreshCw } from 'lucide-react';
import {
  compareTranscript,
  evaluateSpeaking,
  generateGrammar,
  generateReading,
  generateRepeatSentences,
  getSpeakingPrompt,
} from '../services/api';
import AudioPlayer from './AudioPlayer';
import VoiceRecorder from './VoiceRecorder';
import { resolveOptionAnswer } from '../utils/answers';
import type { Difficulty, GrammarQuestion, RepeatSentence, SpeakingEvaluation, SpeakingPrompt } from '../types';

const SECTIONS = [
  { key: 'reading', label: 'Reading Sentences', count: 8 },
  { key: 'repeat', label: 'Repeat Sentences', count: 16 },
  { key: 'jumbled', label: 'Jumbled Sentences', count: 10 },
  { key: 'qa', label: 'Q&A', count: 24 },
  { key: 'storytelling', label: 'Storytelling', count: 2 },
] as const;

type SectionKey = typeof SECTIONS[number]['key'];

export interface MockSpeakingResult {
  readingScore: number;
  repeatScore: number;
  jumbledScore: number;
  qaScore: number;
  storytellingScore: number;
  totalScore: number;
  totalPossible: number;
  percentage: number;
}

interface MockSpeakingSectionProps {
  difficulty: Difficulty;
  provider: string;
  feedbackLanguage: string;
  onComplete: (result: MockSpeakingResult) => void;
}

function splitPassageIntoSentences(passage: string): string[] {
  return (passage.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [])
    .map(sentence => sentence.trim())
    .filter(Boolean);
}

export default function MockSpeakingSection({
  difficulty,
  provider,
  feedbackLanguage,
  onComplete,
}: MockSpeakingSectionProps) {
  const [sectionIndex, setSectionIndex] = useState(0);
  const [taskIndex, setTaskIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [recording, setRecording] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(58 * 60);
  const [timeExpired, setTimeExpired] = useState(false);
  const [error, setError] = useState('');
  const [readingSentences, setReadingSentences] = useState<string[]>([]);
  const [repeatSentences, setRepeatSentences] = useState<RepeatSentence[]>([]);
  const [jumbledQuestions, setJumbledQuestions] = useState<GrammarQuestion[]>([]);
  const [prompt, setPrompt] = useState<SpeakingPrompt | null>(null);
  const [transcript, setTranscript] = useState('');
  const [textAnswer, setTextAnswer] = useState('');
  const [useTextAnswer, setUseTextAnswer] = useState(false);
  const [comparisonAccuracy, setComparisonAccuracy] = useState<number | null>(null);
  const [speakingEvaluation, setSpeakingEvaluation] = useState<SpeakingEvaluation | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [typedAnswer, setTypedAnswer] = useState('');
  const [jumbledSubmitted, setJumbledSubmitted] = useState(false);
  const resultsRef = useRef<number[][]>(SECTIONS.map(() => []));
  const transcriptRef = useRef('');
  const remainingSecondsRef = useRef(58 * 60);

  useEffect(() => {
    const timer = window.setInterval(() => {
      remainingSecondsRef.current -= 1;
      setRemainingSeconds(remainingSecondsRef.current);
      if (remainingSecondsRef.current <= 0) {
        window.clearInterval(timer);
        setTimeExpired(true);
      }
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  const resetTask = () => {
    setTranscript('');
    transcriptRef.current = '';
    setTextAnswer('');
    setUseTextAnswer(false);
    setComparisonAccuracy(null);
    setSpeakingEvaluation(null);
    setSelectedAnswer(null);
    setTypedAnswer('');
    setJumbledSubmitted(false);
  };

  const loadPrompt = useCallback(async (section: SectionKey) => {
    const result = await getSpeakingPrompt({
      category: section === 'qa' ? 'Q&A' : 'storytelling',
      difficulty,
      provider,
    });
    setPrompt(result.prompt);
  }, [difficulty, provider]);

  const loadSection = useCallback(async (index: number) => {
    const section = SECTIONS[index];
    setLoading(true);
    setError('');
    setPrompt(null);
    resetTask();

    try {
      switch (section.key) {
        case 'reading': {
          const sentences: string[] = [];
          for (let attempt = 0; attempt < 3 && sentences.length < section.count; attempt += 1) {
            const result = await generateReading({
              difficulty: difficulty === 'easy' ? 'beginner' : difficulty === 'hard' ? 'advanced' : 'intermediate',
              topic: 'workplace English',
              provider,
            });
            sentences.push(...splitPassageIntoSentences(result.passage.passage));
          }
          if (sentences.length < section.count) {
            throw new Error('Could not generate enough reading sentences. Please try again.');
          }
          setReadingSentences(sentences.slice(0, section.count));
          break;
        }
        case 'repeat': {
          const firstBatch = await generateRepeatSentences({ level: 2, count: 10, provider });
          const secondBatch = await generateRepeatSentences({ level: 3, count: 6, provider });
          if (firstBatch.sentences.length !== 10 || secondBatch.sentences.length !== 6) {
            throw new Error('Could not generate all 16 repeat sentences. Please try again.');
          }
          setRepeatSentences([...firstBatch.sentences, ...secondBatch.sentences]);
          break;
        }
        case 'jumbled': {
          const result = await generateGrammar({
            count: section.count,
            difficulty,
            topic: 'sentence ordering',
            questionType: 'sentence-ordering',
            provider,
          });
          if (result.questions.length !== section.count || result.questions.some(question => question.type !== 'sentence-ordering')) {
            throw new Error('Could not generate 10 jumbled-sentence questions. Please try again.');
          }
          setJumbledQuestions(result.questions);
          break;
        }
        case 'qa':
        case 'storytelling':
          await loadPrompt(section.key);
          break;
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load this speaking section.');
    } finally {
      setLoading(false);
    }
  }, [difficulty, loadPrompt, provider]);

  useEffect(() => {
    void loadSection(0);
  }, [loadSection]);

  const section = SECTIONS[sectionIndex];
  const currentReadingSentence = readingSentences[taskIndex];
  const currentRepeatSentence = repeatSentences[taskIndex];
  const currentJumbledQuestion = jumbledQuestions[taskIndex];
  const currentJumbledCorrectAnswer = currentJumbledQuestion
    ? resolveOptionAnswer(currentJumbledQuestion.answer, currentJumbledQuestion.options)
    : '';
  const currentJumbledAnswer = selectedAnswer ?? typedAnswer;

  const handleTranscript = (value: string, isFinal: boolean) => {
    if (!isFinal) return;
    transcriptRef.current = [transcriptRef.current, value].filter(Boolean).join(' ').trim();
    setTranscript(transcriptRef.current);
  };

  const finish = useCallback(() => {
    const [readingResults, repeatResults, jumbledResults, qaResults, storytellingResults] = resultsRef.current;
    const sectionScores = [
      readingResults.reduce((sum, score) => sum + score, 0),
      repeatResults.reduce((sum, score) => sum + score, 0),
      jumbledResults.reduce((sum, score) => sum + score, 0),
      qaResults.reduce((sum, score) => sum + score, 0),
      storytellingResults.reduce((sum, score) => sum + score, 0),
    ];
    const totalPossible = SECTIONS.reduce((sum, item) => sum + item.count, 0);
    const totalScore = sectionScores.reduce((sum, score) => sum + score, 0);

    onComplete({
      readingScore: sectionScores[0],
      repeatScore: sectionScores[1],
      jumbledScore: sectionScores[2],
      qaScore: sectionScores[3],
      storytellingScore: sectionScores[4],
      totalScore,
      totalPossible,
      percentage: Math.round((totalScore / totalPossible) * 100),
    });
  }, [onComplete]);

  useEffect(() => {
    if (timeExpired) finish();
  }, [finish, timeExpired]);

  const advanceTask = async (score: number) => {
    resultsRef.current[sectionIndex].push(score);
    const nextTask = taskIndex + 1;
    if (nextTask < section.count) {
      setTaskIndex(nextTask);
      resetTask();
      if (section.key === 'qa' || section.key === 'storytelling') {
        setLoading(true);
        setError('');
        setPrompt(null);
        try {
          await loadPrompt(section.key);
        } catch (e) {
          setError(e instanceof Error ? e.message : 'Failed to load the next speaking prompt.');
        } finally {
          setLoading(false);
        }
      }
      return;
    }

    if (sectionIndex + 1 < SECTIONS.length) {
      const nextSection = sectionIndex + 1;
      setSectionIndex(nextSection);
      setTaskIndex(0);
      await loadSection(nextSection);
      return;
    }
    finish();
  };

  const checkTranscript = async (expected: string) => {
    if (!transcript.trim()) return;
    setChecking(true);
    setError('');
    try {
      const result = await compareTranscript({ original: expected, transcript });
      setComparisonAccuracy(result.accuracy);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to compare your response.');
    } finally {
      setChecking(false);
    }
  };

  const submitJumbled = () => {
    if (!currentJumbledQuestion) return;
    const answer = currentJumbledQuestion.options ? selectedAnswer : typedAnswer.trim();
    if (!answer) return;
    setJumbledSubmitted(true);
  };

  const submitSpeakingAnswer = async () => {
    if (!prompt) return;
    const answer = useTextAnswer ? textAnswer : transcript;
    if (!answer.trim()) return;

    setChecking(true);
    setError('');
    try {
      const result = await evaluateSpeaking({
        question: prompt.question,
        transcript: answer,
        language: feedbackLanguage,
        provider,
      });
      setSpeakingEvaluation(result.evaluation);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to evaluate your speaking response.');
    } finally {
      setChecking(false);
    }
  };

  const questionNumber = taskIndex + 1;
  const priorQuestions = SECTIONS.slice(0, sectionIndex).reduce((sum, item) => sum + item.count, 0);
  const overallProgress = Math.round(((priorQuestions + taskIndex) / 60) * 100);
  const minutesRemaining = Math.floor(remainingSeconds / 60).toString().padStart(2, '0');
  const secondsRemaining = (remainingSeconds % 60).toString().padStart(2, '0');

  return (
    <div style={{ maxWidth: 720 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
        <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
          Speaking · {section.label}: Question {questionNumber}/{section.count}
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 13, color: remainingSeconds < 5 * 60 ? 'var(--color-error)' : 'var(--text-muted)' }}>
          <Clock size={14} /> Time remaining: {minutesRemaining}:{secondsRemaining}
        </span>
      </div>
      <div className="progress-bar" style={{ marginBottom: 20 }}>
        <div className="progress-bar-fill" style={{ width: `${overallProgress}%` }} />
      </div>
      <div className="card card-elevated fade-in">
        <div style={{ marginBottom: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', marginBottom: 8 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700 }}>{section.label}</h2>
            <span className="badge badge-neutral">{questionNumber} of {section.count}</span>
          </div>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            {section.key === 'reading' && 'Read each sentence aloud; your transcript is compared with the prompt.'}
            {section.key === 'repeat' && 'Listen to each sentence, then repeat it aloud.'}
            {section.key === 'jumbled' && 'Arrange the words into a correct sentence.'}
            {section.key === 'qa' && 'Answer each question aloud or type your response.'}
            {section.key === 'storytelling' && 'Respond to each storytelling prompt aloud or by typing.'}
          </p>
        </div>

        {loading && (
          <div style={{ textAlign: 'center', padding: 28 }}>
            <div className="spinner" style={{ margin: '0 auto 12px' }} />
            <p style={{ color: 'var(--text-secondary)' }}>Preparing {section.label.toLowerCase()}…</p>
          </div>
        )}

        {!loading && error && (
          <div className="alert alert-error" style={{ marginBottom: 16 }}>
            {error}
            <button className="btn btn-secondary btn-sm" style={{ marginLeft: 12 }} onClick={() => loadSection(sectionIndex)}>
              <RefreshCw size={14} /> Try again
            </button>
          </div>
        )}

        {!loading && !error && section.key === 'reading' && currentReadingSentence && (
          <>
            <p style={{ fontSize: 18, fontWeight: 600, lineHeight: 1.7, padding: 16, marginBottom: 16, background: 'var(--bg-surface)', borderRadius: 8 }}>
              {currentReadingSentence}
            </p>
            <VoiceRecorder
              onTranscript={handleTranscript}
              onRecordingStart={() => setRecording(true)}
              onRecordingComplete={() => setRecording(false)}
              onCancel={() => setRecording(false)}
              label="Read Sentence"
            />
            {transcript && <p style={{ marginTop: 12, fontSize: 14, color: 'var(--text-secondary)' }}>You said: {transcript}</p>}
            {transcript && comparisonAccuracy === null && (
              <button className="btn btn-primary" style={{ marginTop: 14 }} disabled={checking || recording} onClick={() => checkTranscript(currentReadingSentence)}>
                {checking ? 'Checking…' : 'Check Sentence'}
              </button>
            )}
            {comparisonAccuracy !== null && (
              <div style={{ marginTop: 14 }}>
                <div className="alert alert-info">Transcript match: <strong>{comparisonAccuracy}%</strong></div>
                <button className="btn btn-primary" onClick={() => advanceTask(comparisonAccuracy / 100)}>
                  {questionNumber === section.count ? 'Continue to Repeat Sentences' : 'Next Sentence'} <ArrowRight size={16} />
                </button>
              </div>
            )}
          </>
        )}

        {!loading && !error && section.key === 'repeat' && currentRepeatSentence && (
          <>
            <div style={{ marginBottom: 18 }}>
              <AudioPlayer text={currentRepeatSentence.sentence} label="Listen to Sentence" />
            </div>
            <VoiceRecorder
              onTranscript={handleTranscript}
              onRecordingStart={() => setRecording(true)}
              onRecordingComplete={() => setRecording(false)}
              onCancel={() => setRecording(false)}
              label="Repeat Sentence"
            />
            {transcript && <p style={{ marginTop: 12, fontSize: 14, color: 'var(--text-secondary)' }}>You said: {transcript}</p>}
            {transcript && comparisonAccuracy === null && (
              <button className="btn btn-primary" style={{ marginTop: 14 }} disabled={checking || recording} onClick={() => checkTranscript(currentRepeatSentence.sentence)}>
                {checking ? 'Checking…' : 'Check Repetition'}
              </button>
            )}
            {comparisonAccuracy !== null && (
              <div style={{ marginTop: 14 }}>
                <div className="alert alert-info">Transcript match: <strong>{comparisonAccuracy}%</strong></div>
                <button className="btn btn-primary" onClick={() => advanceTask(comparisonAccuracy / 100)}>
                  {questionNumber === section.count ? 'Continue to Jumbled Sentences' : 'Next Sentence'} <ArrowRight size={16} />
                </button>
              </div>
            )}
          </>
        )}

        {!loading && !error && section.key === 'jumbled' && currentJumbledQuestion && (
          <>
            <p style={{ fontSize: 17, fontWeight: 600, lineHeight: 1.6, marginBottom: 16 }}>{currentJumbledQuestion.question}</p>
            {currentJumbledQuestion.options ? (
              currentJumbledQuestion.options.map(option => (
                <button
                  key={option}
                  className={`option-btn${selectedAnswer === option ? ' selected' : ''}${jumbledSubmitted && option.toLowerCase() === currentJumbledCorrectAnswer.toLowerCase() ? ' correct' : ''}${jumbledSubmitted && selectedAnswer === option && option.toLowerCase() !== currentJumbledCorrectAnswer.toLowerCase() ? ' incorrect' : ''}`}
                  onClick={() => !jumbledSubmitted && setSelectedAnswer(option)}
                  disabled={jumbledSubmitted}
                >
                  {option}
                </button>
              ))
            ) : (
              <textarea
                className="textarea"
                placeholder="Type the words in the correct order..."
                value={typedAnswer}
                onChange={e => setTypedAnswer(e.target.value)}
                disabled={jumbledSubmitted}
                rows={3}
              />
            )}
            {!jumbledSubmitted ? (
              <button
                className="btn btn-primary"
                style={{ marginTop: 14 }}
                onClick={submitJumbled}
                disabled={currentJumbledQuestion.options ? !selectedAnswer : !typedAnswer.trim()}
              >
                Submit Answer
              </button>
            ) : (
              <div style={{ marginTop: 14 }}>
                <div className={`alert ${currentJumbledAnswer.trim().toLowerCase() === currentJumbledCorrectAnswer.trim().toLowerCase() ? 'alert-success' : 'alert-error'}`}>
                  {currentJumbledAnswer.trim().toLowerCase() === currentJumbledCorrectAnswer.trim().toLowerCase()
                    ? <><CheckCircle size={14} /> Correct!</>
                    : <>Correct answer: <strong>{currentJumbledCorrectAnswer}</strong></>}
                </div>
                <button
                  className="btn btn-primary"
                  onClick={() => advanceTask(currentJumbledAnswer.trim().toLowerCase() === currentJumbledCorrectAnswer.trim().toLowerCase() ? 1 : 0)}
                >
                  {questionNumber === section.count ? 'Continue to Q&A' : 'Next Sentence'} <ArrowRight size={16} />
                </button>
              </div>
            )}
          </>
        )}

        {!loading && !error && (section.key === 'qa' || section.key === 'storytelling') && prompt && (
          <>
            <div style={{ padding: 16, marginBottom: 16, borderRadius: 8, background: 'var(--bg-surface)', fontSize: 17, fontWeight: 600, lineHeight: 1.6 }}>
              {prompt.question}
            </div>
            {!speakingEvaluation && (
              <>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, marginBottom: 12 }}>
                  <input type="checkbox" checked={useTextAnswer} disabled={recording} onChange={e => setUseTextAnswer(e.target.checked)} />
                  Type my answer instead of speaking
                </label>
                {useTextAnswer ? (
                  <textarea
                    className="textarea"
                    placeholder="Type your response here..."
                    value={textAnswer}
                    onChange={e => setTextAnswer(e.target.value)}
                    rows={5}
                  />
                ) : (
                  <VoiceRecorder
                    onTranscript={handleTranscript}
                    onRecordingStart={() => setRecording(true)}
                    onRecordingComplete={() => setRecording(false)}
                    onCancel={() => setRecording(false)}
                    label="Record My Answer"
                  />
                )}
                {transcript && !useTextAnswer && (
                  <p style={{ marginTop: 12, fontSize: 14, color: 'var(--text-secondary)' }}>Your response: {transcript}</p>
                )}
                <button
                  className="btn btn-primary"
                  style={{ marginTop: 14 }}
                  onClick={submitSpeakingAnswer}
                  disabled={checking || recording || !(useTextAnswer ? textAnswer.trim() : transcript.trim())}
                >
                  {checking ? 'Evaluating…' : 'Evaluate Answer'}
                </button>
              </>
            )}
            {speakingEvaluation && (
              <div style={{ marginTop: 16 }}>
                <div className="alert alert-info">
                  Score: <strong>{speakingEvaluation.overall_score}/10</strong> · {speakingEvaluation.feedback_summary}
                </div>
                <button className="btn btn-primary" onClick={() => advanceTask(speakingEvaluation.overall_score / 10)}>
                  {questionNumber === section.count
                    ? section.key === 'qa' ? 'Continue to Storytelling' : 'Finish Speaking Section'
                    : 'Next Prompt'}
                  <ArrowRight size={16} />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
