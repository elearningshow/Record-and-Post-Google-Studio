// src/components/Recorder.tsx
import React, { useState, useRef, useEffect } from 'react';

interface RecorderProps {
  onTranscriptUpdate: (text: string) => void;
  onFinish: (blob: Blob, duration: number, transcript: string) => void;
}

export const Recorder: React.FC<RecorderProps> = ({
  onTranscriptUpdate,
  onFinish,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [status, setStatus] = useState<string>('Tap Start to record');
  const [transcript, setTranscript] = useState<string>('');
  const [startTime, setStartTime] = useState<number | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  // Optional: simple timer display
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const timerRef = useRef<number | null>(null);

  const clearMedia = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.ondataavailable = null;
      mediaRecorderRef.current.onstop = null;
      mediaRecorderRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }
    chunksRef.current = [];
  };

  const stopTimer = () => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const startTimer = () => {
    stopTimer();
    setElapsedSeconds(0);
    timerRef.current = window.setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
  };

  const describeError = (error: any): string => {
    if (!error) return 'Unknown error accessing microphone';

    // name comes from DOMException
    switch (error.name) {
      case 'NotAllowedError':
      case 'PermissionDeniedError':
        return 'Microphone access denied. Allow mic access in your browser settings, reload the page, and tap Start again.';
      case 'NotFoundError':
      case 'DevicesNotFoundError':
        return 'No microphone found on this device or it is disabled.';
      case 'NotReadableError':
      case 'TrackStartError':
        return 'Microphone is already in use by another application.';
      case 'NotSupportedError':
        return 'Microphone or recording is not supported in this browser.';
      case 'SecurityError':
      case 'NotSecureContextError':
        return 'Microphone access requires HTTPS or localhost. Use a secure URL (for example via ngrok).';
      case 'AbortError':
        return 'Microphone access was aborted. Try again.';
      default:
        break;
    }

    if (error.message) {
      // Handle some common mobile / iframe messages here if needed
      return error.message;
    }

    return 'Unknown error accessing microphone';
  };

  const startRecording = async () => {
    if (isRecording) return;

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setStatus('getUserMedia is not supported in this browser.');
      alert('This browser does not support audio recording (no getUserMedia).');
      return;
    }

    try {
      setStatus('Requesting microphone access…');

      // Must be invoked from a direct user gesture (button click) especially on mobile
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      mediaStreamRef.current = stream;

      const options: MediaRecorderOptions = {};
      // Choose a supported MIME type if possible
      const preferredTypes = ['audio/webm', 'audio/webm;codecs=opus', 'audio/mp4'];
      const supportedType = preferredTypes.find((t) =>
        MediaRecorder.isTypeSupported ? MediaRecorder.isTypeSupported(t) : false,
      );
      if (supportedType) {
        options.mimeType = supportedType;
      }

      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event: BlobEvent) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        stopTimer();
        const end = Date.now();
        const duration =
          startTime !== null ? Math.max(0, (end - startTime) / 1000) : 0;

        const blob = new Blob(chunksRef.current, {
          type: supportedType || 'audio/webm',
        });

        // Here you could do client-side transcription if you hook up a model.
        // For now, pass through whatever transcript state we have.
        onFinish(blob, duration, transcript);

        clearMedia();
        setIsRecording(false);
        setStatus('Recording finished. You can start a new one.');
      };

      mediaRecorder.start();
      setIsRecording(true);
      setStartTime(Date.now());
      startTimer();
      setStatus('Recording… Tap Stop when done.');
    } catch (error: any) {
      console.error('Error starting recording:', error);
      const msg = describeError(error);
      setStatus(msg);
      alert(msg);
      clearMedia();
      setIsRecording(false);
      stopTimer();
    }
  };

  const stopRecording = () => {
    if (!isRecording) return;

    try {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      } else {
        // If somehow inactive but still flagged as recording, just finalize cleanup
        stopTimer();
        clearMedia();
        setIsRecording(false);
        setStatus('Recording stopped.');
      }
    } catch (error) {
      console.error('Error stopping recording:', error);
      stopTimer();
      clearMedia();
      setIsRecording(false);
      setStatus('Error stopping recording.');
    }
  };

  // Simple mock transcript update handler; in your app this is likely driven by a model
  const handleTranscriptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setTranscript(value);
    onTranscriptUpdate(value);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopTimer();
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  const formatTime = (totalSeconds: number) => {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const mm = minutes.toString().padStart(2, '0');
    const ss = seconds.toString().padStart(2, '0');
    return `${mm}:${ss}`;
  };

  return (
    <div style={{ padding: '16px' }}>
      <h2>Recorder</h2>

      <p style={{ marginBottom: '8px' }}>{status}</p>

      <div style={{ marginBottom: '8px' }}>
        <strong>Elapsed:</strong> {formatTime(elapsedSeconds)}
      </div>

      <div style={{ marginBottom: '16px' }}>
        <button
          onClick={startRecording}
          disabled={isRecording}
          style={{
            padding: '8px 16px',
            marginRight: '8px',
            cursor: isRecording ? 'not-allowed' : 'pointer',
          }}
        >
          Start Recording
        </button>
        <button
          onClick={stopRecording}
          disabled={!isRecording}
          style={{
            padding: '8px 16px',
            cursor: !isRecording ? 'not-allowed' : 'pointer',
          }}
        >
          Stop Recording
        </button>
      </div>

      {isRecording && (
        <p style={{ color: 'red', marginBottom: '16px' }}>● Recording in progress…</p>
      )}

      <div style={{ marginTop: '16px' }}>
        <label
          htmlFor="transcript"
          style={{ display: 'block', marginBottom: '4px' }}
        >
          Transcript (live / editable)
        </label>
        <textarea
          id="transcript"
          value={transcript}
          onChange={handleTranscriptChange}
          rows={6}
          style={{ width: '100%', resize: 'vertical' }}
        />
      </div>
    </div>
  );
};
