// ============================================================
// Text-to-Speech Service (Browser SpeechSynthesis)
// ============================================================

export interface TTSOptions {
  rate?: number;
  pitch?: number;
  volume?: number;
  voice?: SpeechSynthesisVoice;
  lang?: string;
}

// Track current utterance (write-only reference used indirectly by stopSpeaking)
type UtteranceRef = { current: SpeechSynthesisUtterance | null };
const _uRef: UtteranceRef = { current: null };

export function isTTSSupported(): boolean {
  return 'speechSynthesis' in window;
}

export function getAvailableVoices(): SpeechSynthesisVoice[] {
  if (!isTTSSupported()) return [];
  return window.speechSynthesis.getVoices().filter(v => v.lang.startsWith('en'));
}

export function speak(
  text: string,
  options: TTSOptions = {},
  onEnd?: () => void,
  onError?: (e: SpeechSynthesisErrorEvent) => void
): void {
  if (!isTTSSupported()) {
    onError?.({ error: 'not-supported' } as unknown as SpeechSynthesisErrorEvent);
    return;
  }

  stopSpeaking();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = options.rate ?? 0.9;
  utterance.pitch = options.pitch ?? 1;
  utterance.volume = options.volume ?? 1;
  utterance.lang = options.lang ?? 'en-US';

  if (options.voice) {
    utterance.voice = options.voice;
  } else {
    // Try to find a good English voice
    const voices = getAvailableVoices();
    const preferred = voices.find(v => v.name.includes('Google') && v.lang === 'en-US')
      || voices.find(v => v.lang === 'en-US')
      || voices.find(v => v.lang.startsWith('en'))
      || null;
    if (preferred) utterance.voice = preferred;
  }

  utterance.onend = () => onEnd?.();
  utterance.onerror = (e) => onError?.(e);

  _uRef.current = utterance;
  window.speechSynthesis.speak(utterance);
}

export function stopSpeaking(): void {
  if (isTTSSupported()) {
    window.speechSynthesis.cancel();
    _uRef.current = null;
  }
}

export function isSpeaking(): boolean {
  return isTTSSupported() && window.speechSynthesis.speaking;
}

// Wait for voices to load (they load asynchronously)
export function waitForVoices(): Promise<SpeechSynthesisVoice[]> {
  return new Promise(resolve => {
    if (!isTTSSupported()) return resolve([]);
    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) return resolve(voices);
    window.speechSynthesis.onvoiceschanged = () => {
      resolve(window.speechSynthesis.getVoices());
    };
  });
}

// ============================================================
// Speech Recognition Service
// ============================================================


declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

export function isSpeechRecognitionSupported(): boolean {
  return 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window;
}

export interface RecognitionResult {
  transcript: string;
  confidence: number;
  isFinal: boolean;
}

export function startSpeechRecognition(
  onResult: (result: RecognitionResult) => void,
  onEnd: () => void,
  onError: (error: string) => void,
  continuous = true,
  interimResults = true
): (() => void) | null {
  if (!isSpeechRecognitionSupported()) {
    onError('Speech recognition is not supported in this browser. Please use Chrome or Edge.');
    return null;
  }

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const recognition = new SpeechRecognition();
  recognition.lang = 'en-US';
  recognition.continuous = continuous;
  recognition.interimResults = interimResults;
  recognition.maxAlternatives = 1;

  recognition.onresult = (event: any) => {
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const result = event.results[i];
      onResult({
        transcript: result[0].transcript,
        confidence: result[0].confidence,
        isFinal: result.isFinal,
      });
    }
  };

  recognition.onend = () => onEnd();
  recognition.onerror = (event: any) => {
    const errMap: Record<string, string> = {
      'not-allowed': 'Microphone access was denied. Please allow microphone permission in your browser.',
      'service-not-allowed': 'Speech recognition is blocked by the browser or device settings.',
      'no-speech': 'No speech detected. Please speak clearly into the microphone.',
      'audio-capture': 'No microphone found. Please connect a microphone.',
      'network': 'Network error during speech recognition.',
      'aborted': 'Recording was stopped.',
    };
    onError(errMap[event.error] || `Speech recognition error: ${event.error}`);
  };

  try {
    recognition.start();
    return () => recognition.stop();
  } catch (e: any) {
    onError(`Could not start recognition: ${e.message}`);
    return null;
  }
}

// ============================================================
// MediaRecorder for audio capture
// ============================================================

export function isMediaRecorderSupported(): boolean {
  return 'MediaRecorder' in window && 'mediaDevices' in navigator;
}

export interface AudioRecorderControls {
  stop: () => void;
  getBlob: () => Promise<Blob>;
  cancel: () => void;
}

export async function startAudioRecording(
  onStateChange?: (state: 'recording' | 'stopped' | 'error', message?: string) => void
): Promise<AudioRecorderControls> {
  if (!isMediaRecorderSupported()) {
    throw new Error('Audio recording is not supported in this browser.');
  }

  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  let recorder: MediaRecorder;
  try {
    recorder = new MediaRecorder(stream);
  } catch (error) {
    stream.getTracks().forEach(track => track.stop());
    throw new Error(`Could not initialize audio recording: ${error instanceof Error ? error.message : String(error)}`);
  }
  const chunks: Blob[] = [];
  let stoppedByUser = false;
  let blobPromise: Promise<Blob> | null = null;

  const stopTracks = () => stream.getTracks().forEach(track => track.stop());

  blobPromise = new Promise<Blob>((resolve, reject) => {
    recorder.ondataavailable = event => {
      if (event.data.size > 0) chunks.push(event.data);
    };
    recorder.onerror = event => {
      const message = event instanceof ErrorEvent ? event.message : 'Audio recording failed.';
      onStateChange?.('error', message);
      if (recorder.state !== 'inactive') recorder.stop();
      else stopTracks();
    };
    recorder.onstop = () => {
      stopTracks();
      onStateChange?.('stopped');
      const type = recorder.mimeType || chunks.find(chunk => chunk.type)?.type || 'audio/webm';
      if (chunks.length) resolve(new Blob(chunks, { type }));
      else reject(new Error('No audio was captured. Check your microphone and try again.'));
    };
  });

  for (const track of stream.getAudioTracks()) {
    track.addEventListener('ended', () => {
      if (recorder.state !== 'inactive') {
        onStateChange?.('error', 'The microphone disconnected. Stop and restart the recording after reconnecting it.');
        recorder.stop();
      }
    }, { once: true });
  }

  try {
    recorder.start(1000);
  } catch (error) {
    stopTracks();
    throw new Error(`Could not start audio recording: ${error instanceof Error ? error.message : String(error)}`);
  }
  onStateChange?.('recording');

  return {
    stop: () => {
      if (recorder.state !== 'inactive') {
        stoppedByUser = true;
        recorder.stop();
      }
    },
    getBlob: () => {
      if (!stoppedByUser && recorder.state !== 'inactive') {
        throw new Error('Stop the recording before retrieving its audio.');
      }
      return blobPromise;
    },
    cancel: () => {
      stoppedByUser = true;
      if (recorder.state !== 'inactive') recorder.stop();
      else stopTracks();
    },
  };
}

// Create a playable URL from blob
export function createAudioURL(blob: Blob): string {
  return URL.createObjectURL(blob);
}
