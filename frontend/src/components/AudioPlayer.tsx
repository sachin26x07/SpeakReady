import { useState, useEffect } from 'react';
import { Play, Square, Volume2, VolumeX } from 'lucide-react';
import { speak, stopSpeaking, isTTSSupported } from '../services/speech';
import { useSettings } from '../context/SettingsContext';

interface AudioPlayerProps {
  text: string;
  label?: string;
  onDone?: () => void;
  autoPlay?: boolean;
  compact?: boolean;
}

export default function AudioPlayer({ text, label, onDone, autoPlay = false, compact = false }: AudioPlayerProps) {
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState('');
  const { settings } = useSettings();
  const supported = isTTSSupported();

  const handlePlay = () => {
    if (playing) {
      stopSpeaking();
      setPlaying(false);
      return;
    }
    setError('');
    setPlaying(true);
    speak(
      text,
      { rate: settings.ttsRate, pitch: settings.ttsPitch, volume: settings.ttsVolume },
      () => { setPlaying(false); onDone?.(); },
      (e) => { setPlaying(false); setError(`TTS error: ${e.error}`); }
    );
  };

  useEffect(() => {
    if (autoPlay && supported && settings.autoPlayTTS) {
      setTimeout(handlePlay, 500);
    }
    return () => stopSpeaking();
  }, [text]);

  if (!supported) {
    return (
      <div className="alert alert-warning">
        <VolumeX size={16} />
        Text-to-speech is not supported in this browser. Please use Chrome or Edge for audio playback.
      </div>
    );
  }

  if (compact) {
    return (
      <button
        className={`btn ${playing ? 'btn-secondary' : 'btn-primary'} btn-sm`}
        onClick={handlePlay}
      >
        {playing ? <Square size={14} /> : <Play size={14} />}
        {playing ? 'Stop' : label || 'Play Audio'}
      </button>
    );
  }

  return (
    <div className="audio-controls">
      <button
        className={`btn ${playing ? 'btn-secondary' : 'btn-primary'}`}
        onClick={handlePlay}
        title={playing ? 'Stop' : 'Play Audio'}
      >
        {playing ? <Square size={16} /> : <Volume2 size={16} />}
        {playing ? 'Stop Audio' : label || 'Play Audio'}
      </button>
      {playing && (
        <div className="audio-wave">
          {[1,2,3,4,5].map(i => (
            <div key={i} className="audio-wave-bar" style={{ height: `${6 + Math.random()*14}px` }} />
          ))}
        </div>
      )}
      {error && <span style={{ fontSize: 12, color: 'var(--color-error)' }}>{error}</span>}
    </div>
  );
}
