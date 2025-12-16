import React, { useState, useEffect, useRef } from 'react';
import { COLORS } from '../types';

interface RecorderProps {
  onTranscriptUpdate: (text: string) => void;
  onFinish: (blob: Blob, duration: number, transcript: string) => void;
}

export const Recorder: React.FC<RecorderProps> = ({ onTranscriptUpdate, onFinish }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [duration, setDuration] = useState(0);
  const [localTranscript, setLocalTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recognitionRef = useRef<any>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    // Initialize Speech Recognition
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;

      recognitionRef.current.onresult = (event: any) => {
        let interim = '';
        let final = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            final += event.results[i][0].transcript;
          } else {
            interim += event.results[i][0].transcript;
          }
        }
        
        if (final) {
            setLocalTranscript(prev => {
                const newVal = prev + ' ' + final;
                onTranscriptUpdate(newVal);
                return newVal;
            });
            // Interim handled by loop, but if final is processed, we might want to clear interim for this specific chunk scope
            // However, SpeechRecognition API continues sending interim events. 
            // We rely on the loop to rebuild interim string from current results.
        }
        setInterimTranscript(interim);
      };
    }
  }, [onTranscriptUpdate]);

  useEffect(() => {
    if (isRecording && !isPaused) {
      timerRef.current = setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isRecording, isPaused]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleToggleRecord = async () => {
    if (!isRecording) {
      // Start Recording
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorderRef.current = new MediaRecorder(stream);
        audioChunksRef.current = [];

        mediaRecorderRef.current.ondataavailable = (event) => {
          if (event.data.size > 0) audioChunksRef.current.push(event.data);
        };

        mediaRecorderRef.current.start();
        recognitionRef.current?.start();
        setIsRecording(true);
        setIsPaused(false);
      } catch (err) {
        console.error("Error accessing microphone:", err);
        alert("Microphone permission denied.");
      }
    } else if (isPaused) {
      // Resume
      mediaRecorderRef.current?.resume();
      recognitionRef.current?.start();
      setIsPaused(false);
    } else {
      // Pause
      mediaRecorderRef.current?.pause();
      recognitionRef.current?.stop();
      setIsPaused(true);
    }
  };

  const handleStop = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      recognitionRef.current?.stop();
      
      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        // Include interim in final transcript if any remains
        const fullTranscript = localTranscript + (interimTranscript ? ' ' + interimTranscript : '');
        onFinish(audioBlob, duration, fullTranscript);
        
        // Reset state
        setIsRecording(false);
        setIsPaused(false);
        setDuration(0);
        setLocalTranscript('');
        setInterimTranscript('');
        audioChunksRef.current = [];
      };
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-full space-y-8 bg-gray-50 relative overflow-hidden">
      
      {/* Visualizer Circles */}
      <div className="relative flex items-center justify-center">
        {isRecording && !isPaused && (
           <div className="absolute w-64 h-64 rounded-full bg-purple-200 opacity-30 animate-ping"></div>
        )}
        {isRecording && !isPaused && (
           <div className="absolute w-48 h-48 rounded-full bg-purple-300 opacity-40 animate-pulse"></div>
        )}
        
        <button
          onClick={handleToggleRecord}
          className={`relative z-10 w-32 h-32 rounded-full shadow-xl flex items-center justify-center transition-all duration-300 transform active:scale-95 ${isRecording && !isPaused ? 'bg-red-500' : 'bg-[#6A0DAD]'}`}
        >
          {/* Custom Silver Mic Icon */}
          {!isRecording || isPaused ? (
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
              <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
              <line x1="12" y1="19" x2="12" y2="23"/>
              <line x1="8" y1="23" x2="16" y2="23"/>
            </svg>
          ) : (
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
               <rect x="6" y="4" width="4" height="16" />
               <rect x="14" y="4" width="4" height="16" />
            </svg>
          )}
        </button>
      </div>

      <div className="text-center space-y-2">
        <h2 className="text-4xl font-mono font-bold text-gray-800 tracking-wider">
          {formatTime(duration)}
        </h2>
        <p className="text-gray-500 text-sm font-medium">
            {isRecording ? (isPaused ? 'RECORDING PAUSED' : 'LISTENING...') : 'TAP TO RECORD'}
        </p>
      </div>

      {isRecording && (
        <button 
            onClick={handleStop}
            className="px-12 py-5 bg-gray-900 text-white text-lg rounded-full font-bold shadow-xl hover:bg-gray-800 transition-colors transform hover:scale-105 active:scale-95"
        >
            Stop Session
        </button>
      )}

      {/* Live Transcript Preview */}
      <div className="w-full px-6 max-h-64 overflow-y-auto text-center scrollbar-hide">
        <p className="text-gray-800 text-lg leading-relaxed font-medium">
            {localTranscript}
            <span className="text-gray-400">{interimTranscript}</span>
            {(!localTranscript && !interimTranscript && isRecording) && <span className="text-gray-400 italic">Listening...</span>}
        </p>
      </div>
    </div>
  );
};