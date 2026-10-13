import { useCallback, useEffect, useRef, useState } from 'react';
import { Mic, Square, Play, RotateCcw, X } from 'lucide-react';
import {
  isSpeechRecognitionSupported,
  isMediaRecorderSupported,
  startSpeechRecognition,
  startAudioRecording,
  createAudioURL,
  type RecognitionResult,
  type AudioRecorderControls,
} from '../services/speech';

interface VoiceRecorderProps {
  onTranscript: (transcript: string, isFinal: boolean) => void;
  onRecordingStart?: () => void;
  onRecordingComplete?: (blob: Blob, audioUrl: string) => void;
  onCancel?: () => void;
  onError?: (error: string) => void;
  disabled?: boolean;
  label?: string;
}

function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60).toString().padStart(2, '0');
  const remainder = (seconds % 60).toString().padStart(2, '0');
  return `${minutes}:${remainder}`;
}

export default function VoiceRecorder({
  onTranscript,
  onRecordingStart,
  onRecordingComplete,
  onCancel,
  onError,
  disabled = false,
  label = 'Start Recording',
}: VoiceRecorderProps) {
  const [recording, setRecording] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [interimText, setInterimText] = useState('');
  const [error, setError] = useState('');
  const recorderRef = useRef<AudioRecorderControls | null>(null);
  const stopRecognitionRef = useRef<(() => void) | null>(null);
  const recordingRef = useRef(false);
  const startPendingRef = useRef(false);
  const recognitionRetryRef = useRef<number | null>(null);
  const recognitionRetryDelayRef = useRef(250);
  const recognitionRestartCountRef = useRef(0);
  const recognitionFailedRef = useRef(false);
  const interimTextRef = useRef('');
  const stopRecordingRef = useRef<() => void>(() => {});
  const mountedRef = useRef(true);
  const onTranscriptRef = useRef(onTranscript);
  const onRecordingStartRef = useRef(onRecordingStart);
  const onRecordingCompleteRef = useRef(onRecordingComplete);
  const onErrorRef = useRef(onError);
  const onCancelRef = useRef(onCancel);

  onTranscriptRef.current = onTranscript;
  onRecordingStartRef.current = onRecordingStart;
  onRecordingCompleteRef.current = onRecordingComplete;
  onErrorRef.current = onError;
  onCancelRef.current = onCancel;

  const speechSupported = isSpeechRecognitionSupported();
  const mediaSupported = isMediaRecorderSupported();

  useEffect(() => {
    if (!recording) return;
    const timer = window.setInterval(() => setElapsed(value => value + 1), 1000);
    return () => window.clearInterval(timer);
  }, [recording]);

  const clearRecognitionRetry = () => {
    if (recognitionRetryRef.current !== null) {
      window.clearTimeout(recognitionRetryRef.current);
      recognitionRetryRef.current = null;
    }
  };

  const stopRecognition = useCallback(() => {
    clearRecognitionRetry();
    const stop = stopRecognitionRef.current;
    stopRecognitionRef.current = null;
    stop?.();
  }, []);

  const reportError = useCallback((message: string) => {
    setError(message);
    onErrorRef.current?.(message);
  }, []);

  const startRecognitionRef = useRef<() => void>(() => {});
  startRecognitionRef.current = () => {
    if (!recordingRef.current || recognitionFailedRef.current) return;
    try {
      const stop = startSpeechRecognition(
        (result: RecognitionResult) => {
          if (result.isFinal) {
            interimTextRef.current = '';
            setInterimText('');
            recognitionRestartCountRef.current = 0;
            recognitionRetryDelayRef.current = 250;
            onTranscriptRef.current(result.transcript, true);
          } else {
            interimTextRef.current = result.transcript;
            setInterimText(result.transcript);
            onTranscriptRef.current(result.transcript, false);
          }
        },
        () => {
          stopRecognitionRef.current = null;
          if (!recordingRef.current || recognitionFailedRef.current) return;
          if (interimTextRef.current.trim()) {
            onTranscriptRef.current(interimTextRef.current, true);
            interimTextRef.current = '';
            setInterimText('');
          }
          if (recognitionRestartCountRef.current >= 20) {
            recognitionFailedRef.current = true;
            reportError('Live transcription restarted repeatedly and has paused. Audio recording remains active; stop it when finished.');
            return;
          }
          recognitionRestartCountRef.current += 1;
          clearRecognitionRetry();
          recognitionRetryRef.current = window.setTimeout(() => {
            recognitionRetryRef.current = null;
            startRecognitionRef.current();
          }, recognitionRetryDelayRef.current);
          recognitionRetryDelayRef.current = Math.min(recognitionRetryDelayRef.current * 2, 2000);
        },
        message => {
          if (!recordingRef.current) return;
          if (message.includes('Microphone access was denied') || message.includes('No microphone found')) {
            recognitionFailedRef.current = true;
            reportError(`${message} Audio capture has stopped.`);
            stopRecordingRef.current();
            return;
          }
          if (message.includes('Speech recognition is blocked')) {
            recognitionFailedRef.current = true;
            reportError(`${message} Audio recording remains active; stop it when finished.`);
            return;
          }
          if (message.includes('Network error')) {
            recognitionFailedRef.current = true;
            reportError(`${message} Audio recording is still active; stop it when finished. Transcription may be incomplete.`);
            return;
          }
          if (!message.includes('No speech detected') && !message.includes('Recording was stopped.')) {
            reportError(message);
          }
        },
        true,
        true
      );
      stopRecognitionRef.current = stop;
      if (!stop) {
        recognitionFailedRef.current = true;
        reportError('Could not start speech recognition. Your microphone recording can still be stopped and saved.');
      }
    } catch (e) {
      recognitionFailedRef.current = true;
      reportError(e instanceof Error ? e.message : 'Could not start speech recognition.');
    }
  };

  const start = useCallback(async () => {
    if (startPendingRef.current || recordingRef.current || disabled) return;
    startPendingRef.current = true;
    setError('');
    interimTextRef.current = '';
    setInterimText('');
    setElapsed(0);
    setProcessing(false);
    setAudioUrl(null);
    recognitionFailedRef.current = false;
    recognitionRestartCountRef.current = 0;
    recognitionRetryDelayRef.current = 250;

    if (!mediaSupported) {
      reportError('Audio recording is not supported in this browser.');
      startPendingRef.current = false;
      return;
    }

    try {
      recorderRef.current = await startAudioRecording((state, message) => {
        if (state === 'error' && message) reportError(message);
        if (state === 'stopped' && recordingRef.current) {
          recordingRef.current = false;
          setRecording(false);
          setProcessing(true);
          stopRecognition();
          void recorderRef.current?.getBlob()
            .then(blob => {
              const url = createAudioURL(blob);
              setAudioUrl(url);
              onRecordingCompleteRef.current?.(blob, url);
            })
            .catch(e => reportError(e instanceof Error ? e.message : 'Could not save the interrupted recording.'))
            .finally(() => {
              recorderRef.current = null;
              setProcessing(false);
            });
        }
      });
      if (!mountedRef.current) {
        recorderRef.current.cancel();
        recorderRef.current = null;
        startPendingRef.current = false;
        return;
      }
      recordingRef.current = true;
      setRecording(true);
      onRecordingStartRef.current?.();

      if (speechSupported) {
        startRecognitionRef.current();
      } else {
        reportError('Live speech recognition is unavailable in this browser. Audio will still be recorded, but no transcript can be generated.');
      }
    } catch (e) {
      reportError(e instanceof Error ? e.message : 'Could not access the microphone.');
      recordingRef.current = false;
      setRecording(false);
    } finally {
      startPendingRef.current = false;
    }
  }, [disabled, mediaSupported, reportError, speechSupported]);

  const stop = useCallback(async () => {
    if (!recordingRef.current || !recorderRef.current) return;
    recordingRef.current = false;
    setRecording(false);
    setProcessing(true);
    if (interimTextRef.current.trim()) {
      onTranscriptRef.current(interimTextRef.current, true);
      interimTextRef.current = '';
    }
    stopRecognition();
    setInterimText('');

    try {
      recorderRef.current.stop();
      const blob = await recorderRef.current.getBlob();
      const url = createAudioURL(blob);
      setAudioUrl(url);
      onRecordingCompleteRef.current?.(blob, url);
    } catch (e) {
      reportError(e instanceof Error ? e.message : 'Could not finish saving the recording.');
    } finally {
      recorderRef.current = null;
      setProcessing(false);
    }
  }, [reportError, stopRecognition]);
  stopRecordingRef.current = stop;

  const cancel = useCallback(() => {
    recordingRef.current = false;
    stopRecognition();
    recorderRef.current?.cancel();
    recorderRef.current = null;
    setRecording(false);
    setProcessing(false);
    setElapsed(0);
    interimTextRef.current = '';
    setInterimText('');
    setError('');
    setAudioUrl(null);
    onCancelRef.current?.();
  }, [stopRecognition]);

  const reset = useCallback(() => {
    setAudioUrl(null);
    setInterimText('');
    setError('');
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      recordingRef.current = false;
      startPendingRef.current = false;
      clearRecognitionRetry();
      stopRecognitionRef.current?.();
      recorderRef.current?.cancel();
      recorderRef.current = null;
    };
  }, []);

  useEffect(() => () => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
  }, [audioUrl]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        {!recording ? (
          <button
            className="btn btn-record"
            onClick={start}
            disabled={disabled || processing}
          >
            <Mic size={18} />
            {label}
          </button>
        ) : (
          <>
            <button className="btn btn-record recording" onClick={stop}>
              <Square size={18} />
              Stop Recording
            </button>
            {onCancel && (
              <button className="btn btn-secondary btn-sm" onClick={cancel}>
                <X size={16} />
                Cancel
              </button>
            )}
          </>
        )}
        {recording && (
          <span role="status" style={{ color: 'var(--color-error)', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
            ● Recording {formatDuration(elapsed)}
          </span>
        )}
        {processing && (
          <span role="status" style={{ color: 'var(--text-secondary)' }}>
            Saving recording…
          </span>
        )}
        {audioUrl && !recording && !processing && (
          <span role="status" style={{ color: 'var(--color-success)' }}>
            Recording saved
          </span>
        )}
        {audioUrl && !recording && (
          <button className="btn btn-ghost btn-icon" onClick={reset} title="Clear recording">
            <RotateCcw size={16} />
          </button>
        )}
      </div>

      {!speechSupported && (
        <div className="alert alert-warning" style={{ fontSize: 13 }}>
          Live transcription requires Chrome or Edge. The audio recording can still be saved.
        </div>
      )}

      {recording && interimText && (
        <div style={{
          padding: '10px 14px',
          background: 'var(--color-primary-50)',
          border: '1px solid var(--color-primary-200)',
          borderRadius: 'var(--border-radius-sm)',
          fontSize: 14,
          color: 'var(--text-secondary)',
          fontStyle: 'italic',
        }}>
          🎙️ {interimText}...
        </div>
      )}

      {audioUrl && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Play size={14} color="var(--color-primary-600)" />
          <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Your recording:</span>
          <audio controls src={audioUrl} style={{ height: 36 }} />
        </div>
      )}

      {error && (
        <div className="alert alert-error" style={{ fontSize: 13 }}>
          <Mic size={14} />
          {error}
        </div>
      )}
    </div>
  );
}
