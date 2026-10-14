import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowRight, CheckCircle, Clock, RefreshCw } from 'lucide-react';
import {
  compareTranscript,
  evaluateSpeaking,
  generateReading,
  generateRepeatSentences,
  getSpeakingPrompt,
} from '../services/api';
import AudioPlayer from './AudioPlayer';
import VoiceRecorder from './VoiceRecorder';
import { resolveOptionAnswer, writtenAnswersMatch } from '../utils/answers';
import { addRecentSentence, getProgress } from '../services/storage';
import type {
  Difficulty,
  GrammarQuestion,
  MockSpeakingProgress,
  RepeatSentence,
  SpeakingEvaluation,
  SpeakingPrompt,
} from '../types';

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
  initialProgress: MockSpeakingProgress | null;
  onProgressChange: (progress: MockSpeakingProgress) => void;
  onComplete: (result: MockSpeakingResult) => void;
}

function splitPassageIntoSentences(passage: string): string[] {
  return (passage.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [])
    .map(sentence => sentence.trim())
    .filter(Boolean);
}

function shuffle<T>(items: T[]): T[] {
  const shuffled = [...items];
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const randomIndex = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[i]];
  }
  return shuffled;
}

function createJumbledQuestions(count: number, difficulty: Difficulty, recentSentences: string[]): GrammarQuestion[] {
  const sentenceBank = [
    'The analyst submitted the report yesterday.',
    'Our team will review the proposal tomorrow.',
    'The manager approved the revised schedule.',
    'She has completed the presentation for the client.',
    'The meeting was postponed because of heavy rain.',
    'Please send the updated document before noon.',
    'The company is launching a new training program.',
    'We discussed the project timeline during the meeting.',
    'The employees received their new access cards.',
    'He carefully checked the figures in the spreadsheet.',
    'The customer appreciated our prompt response.',
    'They are preparing for the quarterly review.',
    'The department achieved its targets this month.',
    'I will share the meeting notes with everyone.',
    'The new software reduced processing time significantly.',
    'Our supervisor explained the safety procedures clearly.',
    'The interview panel asked several thoughtful questions.',
    'She presented her findings to the leadership team.',
    'The support team resolved the issue within an hour.',
    'We should confirm the appointment by Friday.',
    'The candidate described her experience confidently.',
    'All visitors must sign in at the reception desk.',
    'The engineers tested the updated application carefully.',
    'He usually arrives at the office before nine.',
    'The finance team prepared a detailed annual budget.',
    'Please place the completed forms on my desk.',
    'The client requested a few changes to the design.',
    'They have been working on this project since April.',
    'Clear communication helps teams solve problems faster.',
    'The presentation included examples from recent projects.',
  ];
  const recentlyUsed = new Set(recentSentences.slice(-10).map(sentence => sentence.toLowerCase()));
  const freshSentences = shuffle(sentenceBank.filter(sentence => !recentlyUsed.has(sentence.toLowerCase())));
  const shuffledSentences = [...freshSentences, ...shuffle(sentenceBank.filter(sentence => recentlyUsed.has(sentence.toLowerCase())))]
    .slice(0, count);

  return shuffledSentences.map((sentence, index) => {
    const words = sentence.replace(/[.!?]+$/, '').split(/\s+/);
    let fragments = shuffle(words);
    if (fragments.join(' ').toLowerCase() === words.join(' ').toLowerCase()) {
      fragments = [...fragments].reverse();
    }

    return {
      id: `mock-jumbled-${Date.now()}-${index}`,
      type: 'sentence-ordering',
      question: `Arrange the following words to form a correct sentence: ${fragments.map((word, wordIndex) => `${wordIndex + 1}) ${word}`).join(' ')}`,
      answer: sentence,
      explanation: 'Put the words in their natural English sentence order.',
      rule: 'Sentence structure',
      examples: [],
      topic: 'Sentence Structure',
      difficulty,
    };
  });
}

function hasSavedSectionContent(progress: MockSpeakingProgress | null): boolean {
  if (!progress) return false;
  switch (SECTIONS[progress.sectionIndex]?.key) {
    case 'reading':
      return progress.readingSentences.length === 8;
    case 'repeat':
      return progress.repeatSentences.length === 16;
    case 'jumbled':
      return progress.jumbledQuestions.length === 10;
    case 'qa':
    case 'storytelling':
      return progress.prompt !== null;
    default:
      return false;
  }
}

export default function MockSpeakingSection({
  difficulty,
  provider,
  feedbackLanguage,
  initialProgress,
  onProgressChange,
  onComplete,
}: MockSpeakingSectionProps) {
  const [sectionIndex, setSectionIndex] = useState(initialProgress?.sectionIndex ?? 0);
  const [taskIndex, setTaskIndex] = useState(initialProgress?.taskIndex ?? 0);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [recording, setRecording] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(initialProgress?.remainingSeconds ?? 58 * 60);
  const [timeExpired, setTimeExpired] = useState(false);
  const [error, setError] = useState('');
  const [readingSentences, setReadingSentences] = useState<string[]>(initialProgress?.readingSentences ?? []);
  const [repeatSentences, setRepeatSentences] = useState<RepeatSentence[]>(initialProgress?.repeatSentences ?? []);
  const [jumbledQuestions, setJumbledQuestions] = useState<GrammarQuestion[]>(initialProgress?.jumbledQuestions ?? []);
  const [prompt, setPrompt] = useState<SpeakingPrompt | null>(initialProgress?.prompt ?? null);
  const [transcript, setTranscript] = useState(initialProgress?.transcript ?? '');
  const [textAnswer, setTextAnswer] = useState(initialProgress?.textAnswer ?? '');
  const [useTextAnswer, setUseTextAnswer] = useState(initialProgress?.useTextAnswer ?? false);
  const [comparisonAccuracy, setComparisonAccuracy] = useState<number | null>(initialProgress?.comparisonAccuracy ?? null);
  const [speakingEvaluation, setSpeakingEvaluation] = useState<SpeakingEvaluation | null>(initialProgress?.speakingEvaluation ?? null);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(initialProgress?.selectedAnswer ?? null);
  const [typedAnswer, setTypedAnswer] = useState(initialProgress?.typedAnswer ?? '');
  const [jumbledSubmitted, setJumbledSubmitted] = useState(initialProgress?.jumbledSubmitted ?? false);
  const resultsRef = useRef<number[][]>(initialProgress?.results ?? SECTIONS.map(() => []));
  const transcriptRef = useRef(initialProgress?.transcript ?? '');
  const remainingSecondsRef = useRef(initialProgress?.remainingSeconds ?? 58 * 60);
  const resumedRef = useRef(hasSavedSectionContent(initialProgress));

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
          const questions = createJumbledQuestions(section.count, difficulty, getProgress().recentSentences);
          questions.forEach(question => addRecentSentence(question.answer));
          setJumbledQuestions(questions);
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
    onProgressChange({
      sectionIndex,
      taskIndex,
      remainingSeconds,
      readingSentences,
      repeatSentences,
      jumbledQuestions,
      prompt,
      transcript,
      textAnswer,
      useTextAnswer,
      comparisonAccuracy,
      speakingEvaluation,
      selectedAnswer,
      typedAnswer,
      jumbledSubmitted,
      results: resultsRef.current,
    });
  }, [
    comparisonAccuracy,
    jumbledQuestions,
    jumbledSubmitted,
    onProgressChange,
    prompt,
    readingSentences,
    remainingSeconds,
    repeatSentences,
    sectionIndex,
    selectedAnswer,
    speakingEvaluation,
    taskIndex,
    textAnswer,
    transcript,
    typedAnswer,
    useTextAnswer,
  ]);

  useEffect(() => {
    if (resumedRef.current) return;
    resumedRef.current = true;
    void loadSection(initialProgress?.sectionIndex ?? 0);
  }, [initialProgress?.sectionIndex, loadSection]);

  const section = SECTIONS[sectionIndex];
  const currentReadingSentence = readingSentences[taskIndex];
  const currentRepeatSentence = repeatSentences[taskIndex];
  const currentJumbledQuestion = jumbledQuestions[taskIndex];
  const currentJumbledCorrectAnswer = currentJumbledQuestion
    ? resolveOptionAnswer(currentJumbledQuestion.answer, currentJumbledQuestion.options)
    : '';
  const currentJumbledAnswer = selectedAnswer ?? typedAnswer;
  const currentJumbledIsCorrect = currentJumbledQuestion?.options
    ? currentJumbledAnswer.trim().toLowerCase() === currentJumbledCorrectAnswer.trim().toLowerCase()
    : writtenAnswersMatch(currentJumbledAnswer, currentJumbledCorrectAnswer);

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
                <div className={`alert ${currentJumbledIsCorrect ? 'alert-success' : 'alert-error'}`}>
                  {currentJumbledIsCorrect
                    ? <><CheckCircle size={14} /> Correct!</>
                    : <>Correct answer: <strong>{currentJumbledCorrectAnswer}</strong></>}
                </div>
                <button
                  className="btn btn-primary"
                  onClick={() => advanceTask(currentJumbledIsCorrect ? 1 : 0)}
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
