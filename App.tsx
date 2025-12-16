import React, { useState, useEffect } from 'react';
import { Recorder } from './components/Recorder';
import { SessionDetail } from './components/SessionDetail';
import { ModelManager } from './components/ModelManager';
import { getSessions, saveSession, getSettings, saveSettings } from './services/storageService';
import { Session, AppSettings, COLORS } from './types';

// Simple Router State
type View = 'onboarding' | 'recorder' | 'sessions' | 'settings' | 'detail';

const App: React.FC = () => {
  const [view, setView] = useState<View>('recorder');
  const [sessions, setSessions] = useState<Session[]>([]);
  const [currentSession, setCurrentSession] = useState<Session | null>(null);
  const [settings, setAppStateSettings] = useState<AppSettings>(getSettings());
  
  // Settings Tab State
  const [settingsTab, setSettingsTab] = useState<'cloud' | 'local'>('cloud');

  useEffect(() => {
    // Load data on mount
    loadSessions();
    if (!settings.isOnboardingComplete) {
      // Typically show onboarding here
    }
  }, []);

  const loadSessions = async () => {
    const data = await getSessions();
    setSessions(data);
  };

  const handleFinishRecording = async (blob: Blob, duration: number, transcript: string) => {
    const newSession: Session = {
      id: Date.now().toString(),
      title: `Session ${new Date().toLocaleTimeString()}`,
      date: new Date().toLocaleDateString(),
      location: '',
      durationSeconds: duration,
      transcript: transcript || "(No speech detected)",
      participants: ['Me'],
      audioBlob: blob
    };

    await saveSession(newSession);
    setSessions([newSession, ...sessions]);
    setCurrentSession(newSession);
    setView('detail');
  };

  const updateSettings = (newSettings: Partial<AppSettings>) => {
    const updated = { ...settings, ...newSettings };
    setAppStateSettings(updated);
    saveSettings(updated);
  };

  // --- Views ---

  const renderNav = () => (
    <div className="fixed bottom-0 w-full bg-white border-t flex justify-around p-3 pb-safe z-40 shadow-lg">
      <button onClick={() => setView('sessions')} className={`flex flex-col items-center ${view === 'sessions' ? 'text-purple-600' : 'text-gray-400'}`}>
        <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M4 6h16M4 12h16M4 18h16"></path></svg>
        <span className="text-[10px] font-medium mt-1">Sessions</span>
      </button>
      
      <div className="relative -top-6">
        <button 
          onClick={() => setView('recorder')}
          className="w-16 h-16 bg-[#6A0DAD] rounded-full shadow-lg flex items-center justify-center text-white transform transition active:scale-95 border-4 border-gray-50"
        >
          <svg width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>
        </button>
      </div>

      <button onClick={() => setView('settings')} className={`flex flex-col items-center ${view === 'settings' ? 'text-purple-600' : 'text-gray-400'}`}>
        <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
        <span className="text-[10px] font-medium mt-1">Settings</span>
      </button>
    </div>
  );

  return (
    <div className="h-screen w-full flex flex-col bg-gray-50">
      
      {/* Content Area */}
      <div className="flex-1 overflow-hidden relative">
        
        {/* RECORDER VIEW */}
        {view === 'recorder' && (
           <Recorder 
             onTranscriptUpdate={() => {}} 
             onFinish={handleFinishRecording} 
           />
        )}

        {/* DETAIL VIEW */}
        {view === 'detail' && currentSession && (
          <SessionDetail 
            session={currentSession} 
            settings={settings}
            onUpdateSession={async (updated) => {
                await saveSession(updated);
                setCurrentSession(updated);
                loadSessions();
            }}
            onBack={() => setView('sessions')} 
          />
        )}

        {/* SESSIONS LIST VIEW */}
        {view === 'sessions' && (
          <div className="p-4 h-full overflow-y-auto pb-24">
            <h1 className="text-2xl font-bold mb-6 text-gray-900">Your Sessions</h1>
            {sessions.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                    <p>No sessions recorded yet.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {sessions.map(sess => (
                        <div 
                            key={sess.id} 
                            onClick={() => { setCurrentSession(sess); setView('detail'); }}
                            className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 active:bg-gray-50 transition"
                        >
                            <div className="flex justify-between items-start">
                                <h3 className="font-semibold text-gray-800">{sess.title}</h3>
                                <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full">{sess.durationSeconds}s</span>
                            </div>
                            <p className="text-sm text-gray-500 mt-1 line-clamp-2">{sess.transcript}</p>
                            <div className="mt-3 text-xs text-gray-400 flex items-center gap-2">
                                <span>{sess.date}</span>
                                {sess.location && <span className="text-gray-500">• {sess.location}</span>}
                                {sess.article && <span className="text-orange-500 font-medium">• Article Ready</span>}
                            </div>
                        </div>
                    ))}
                </div>
            )}
          </div>
        )}

        {/* SETTINGS VIEW */}
        {view === 'settings' && (
          <div className="p-4 bg-gray-50 h-full overflow-y-auto pb-24">
            <h1 className="text-2xl font-bold mb-6 text-gray-900">Settings</h1>
            
            <div className="space-y-6">

                {/* Model Provider Tabs */}
                <div className="bg-white p-1 rounded-xl border border-gray-200 flex mb-4">
                  <button 
                    onClick={() => {
                        setSettingsTab('cloud');
                        updateSettings({ modelProvider: 'cloud' });
                    }}
                    className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${settingsTab === 'cloud' ? 'bg-purple-100 text-purple-700 shadow-sm' : 'text-gray-500 hover:bg-gray-50'}`}
                  >
                    Cloud (Gemini)
                  </button>
                  <button 
                    onClick={() => {
                        setSettingsTab('local');
                        updateSettings({ modelProvider: 'local' });
                    }}
                    className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${settingsTab === 'local' ? 'bg-purple-100 text-purple-700 shadow-sm' : 'text-gray-500 hover:bg-gray-50'}`}
                  >
                    Local (Offline)
                  </button>
                </div>

                {settingsTab === 'cloud' ? (
                    <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 animate-slide-up">
                        <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                            <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"></path></svg>
                            Google Cloud Models
                        </h2>
                        <div className="space-y-2">
                            {['gemini-2.5-flash', 'gemini-3-pro-preview'].map(model => (
                                <label key={model} className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                                    <input 
                                        type="radio" 
                                        name="model" 
                                        value={model} 
                                        checked={settings.model === model}
                                        onChange={() => updateSettings({ model })}
                                        className="text-purple-600 focus:ring-purple-500"
                                    />
                                    <span className="text-sm font-medium">{model}</span>
                                </label>
                            ))}
                        </div>
                        <p className="text-xs text-gray-400 mt-4">
                            Requires active internet connection. Optimized for complex tasks and fast generation.
                        </p>
                    </div>
                ) : (
                    <div className="animate-slide-up">
                        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 mb-4">
                            <h2 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
                                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"></path></svg>
                                On-Device Models
                            </h2>
                            <p className="text-xs text-gray-500 mb-4">
                                Download models to run completely offline. Ensure you have enough storage space (Wi-Fi recommended for download).
                            </p>
                            
                            <ModelManager 
                                selectedModelId={settings.localModelId}
                                onSelectModel={(id) => updateSettings({ localModelId: id })}
                            />
                        </div>
                    </div>
                )}
                
                <div className="text-center text-xs text-gray-400 mt-8">
                    <p>Record and Post v1.1.0</p>
                    <p>Mode: {settings.modelProvider === 'cloud' ? 'Cloud API' : 'Local Offline'}</p>
                </div>
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      {renderNav()}
    </div>
  );
};

export default App;