import React, { useState, useRef } from 'react';

const AudioRecorder: React.FC = () => {
  const [recording, setRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      
      mediaRecorderRef.current.ondataavailable = (event) => {
        chunksRef.current.push(event.data);
      };
      
      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        chunksRef.current = [];
      };
      
      mediaRecorderRef.current.start();
      setRecording(true);
      console.log('Recording started');
    } catch (error: any) {
      console.error(error);
      let message = 'Unknown error accessing microphone';
      
      if (error.name === 'NotAllowedError') {
        message = 'Microphone access denied. Allow it in site settings, reload, and tap Start again.';
      } else if (error.name === 'NotSecureContext') {
        message = 'Requires HTTPS. Test on a secure URL.';
      } else if (error.message) {
        message = error.message;
      }
      
      alert(message);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      setRecording(false);
    }
  };

  return (
    <div style={{ padding: '20px' }}>
      <h2>Audio Recorder</h2>
      <div style={{ marginBottom: '10px' }}>
        <button 
          onClick={startRecording} 
          disabled={recording}
          style={{ 
            padding: '10px 20px', 
            marginRight: '10px',
            fontSize: '16px',
            cursor: recording ? 'not-allowed' : 'pointer'
          }}
        >
          Start Recording
        </button>
        <button 
          onClick={stopRecording} 
          disabled={!recording}
          style={{ 
            padding: '10px 20px',
            fontSize: '16px',
            cursor: !recording ? 'not-allowed' : 'pointer'
          }}
        >
          Stop Recording
        </button>
      </div>
      {recording && <p style={{ color: 'red' }}>🔴 Recording in progress...</p>}
      {audioUrl && (
        <div style={{ marginTop: '20px' }}>
          <p>Recording complete:</p>
          <audio controls src={audioUrl} style={{ width: '100%' }} />
        </div>
      )}
    </div>
  );
};

export default AudioRecorder;
