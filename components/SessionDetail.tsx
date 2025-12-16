import React, { useState, useEffect } from 'react';
import { Session, AppSettings, COLORS, ChatMessage } from '../types';
import * as Gemini from '../services/geminiService';
import { ArticleGenerator } from './ArticleGenerator';
import { parse } from 'marked';

interface SessionDetailProps {
  session: Session;
  settings: AppSettings;
  onUpdateSession: (updated: Session) => void;
  onBack: () => void;
}

export const SessionDetail: React.FC<SessionDetailProps> = ({ session, settings, onUpdateSession, onBack }) => {
  const [activeTab, setActiveTab] = useState<'transcript' | 'article'>('transcript');
  
  // Editing States
  const [isEditingTranscript, setIsEditingTranscript] = useState(false);
  const [transcriptText, setTranscriptText] = useState(session.transcript);
  
  const [isEditingArticle, setIsEditingArticle] = useState(false);
  const [articleText, setArticleText] = useState(session.article || '');

  // Metadata Editing
  const [isEditingMetadata, setIsEditingMetadata] = useState(false);
  const [metadata, setMetadata] = useState({
    title: session.title,
    location: session.location || '',
    participants: session.participants.join(', ')
  });

  // Generation States
  const [showGenerator, setShowGenerator] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRegeneratingImage, setIsRegeneratingImage] = useState(false);
  const [showImagePrompt, setShowImagePrompt] = useState(false);
  const [customImagePrompt, setCustomImagePrompt] = useState('');
  
  // Chat States
  const [showChat, setShowChat] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [isChatting, setIsChatting] = useState(false);

  useEffect(() => {
    setArticleText(session.article || '');
    setTranscriptText(session.transcript);
    setMetadata({
        title: session.title,
        location: session.location || '',
        participants: session.participants.join(', ')
    });
  }, [session]);

  const handleSaveTranscript = () => {
    onUpdateSession({ ...session, transcript: transcriptText });
    setIsEditingTranscript(false);
  };

  const handleSaveArticle = () => {
    onUpdateSession({ ...session, article: articleText });
    setIsEditingArticle(false);
  };

  const handleSaveMetadata = () => {
    onUpdateSession({
        ...session,
        title: metadata.title,
        location: metadata.location,
        participants: metadata.participants.split(',').map(p => p.trim()).filter(Boolean)
    });
    setIsEditingMetadata(false);
  };

  const handleGenerateArticle = async (config: any) => {
    setIsGenerating(true);
    try {
      // 1. Generate Article Text
      const result = await Gemini.generateArticle(settings.model, session.transcript, config);
      
      // 2. Generate Image Prompt based on result
      const imgPrompt = await Gemini.generateImagePrompt(result.title || "Session", result.content?.substring(0,100) || "");
      
      // 3. Generate Image
      const imageUrl = await Gemini.generateBlogImage(imgPrompt);
      
      // Construct Article Markdown/HTML
      // We use blockquote (>) syntax to style the takeaway specifically via CSS
      const hashtags = result.hashtags || '#RecordAndPost';
      const takeawayBlock = result.takeaway ? `> ## Final Takeaway\n> ${result.takeaway.replace(/\n/g, '\n> ')}` : '';
      
      const articleMarkdown = `
# ${result.title}

${result.content}

${takeawayBlock}

${hashtags}
      `;

      onUpdateSession({
        ...session,
        article: articleMarkdown,
        generatedImageUrl: imageUrl || undefined
      });
      
      setActiveTab('article');
      setShowGenerator(false);
    } catch (e) {
      alert("Failed to generate article. Check connection.");
      console.error(e);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRegenerateImage = async (customPrompt?: string) => {
    setIsRegeneratingImage(true);
    // Keep prompt open while loading so user sees the "Updating..." state in the Go button
    try {
        let prompt = customPrompt;
        if (!prompt) {
             // Derive prompt from current article title if no custom prompt
             prompt = await Gemini.generateImagePrompt(session.title, session.article?.substring(0, 50) || "Session summary");
        }
        const imageUrl = await Gemini.generateBlogImage(prompt);
        if (imageUrl) {
            onUpdateSession({ ...session, generatedImageUrl: imageUrl });
            setShowImagePrompt(false); // Close on success
            setCustomImagePrompt(''); // Clear input
        } else {
            alert("Could not generate image. Try a different prompt.");
        }
    } catch(e) {
        alert("Image generation failed.");
    } finally {
        setIsRegeneratingImage(false);
    }
  };

  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userMsg: ChatMessage = { role: 'user', text: chatInput };
    setChatHistory(prev => [...prev, userMsg]);
    setChatInput('');
    setIsChatting(true);

    try {
      const historyForApi = chatHistory.map(m => ({
        role: m.role,
        parts: [{ text: m.text }]
      }));
      
      const responseText = await Gemini.chatWithSession(settings.model, session.transcript, historyForApi, userMsg.text);
      
      setChatHistory(prev => [...prev, { role: 'model', text: responseText }]);
    } catch (err) {
      setChatHistory(prev => [...prev, { role: 'model', text: "Error connecting to AI. Please try again." }]);
    } finally {
      setIsChatting(false);
    }
  };

  const copyToClipboard = () => {
      const text = activeTab === 'transcript' ? session.transcript : session.article;
      if (text) {
          navigator.clipboard.writeText(text);
          alert("Copied to clipboard!");
      }
  };

  const getMarkdownText = (text: string) => {
     try {
         // Using marked.parse for robust markdown rendering
         const html = parse(text);
         return { __html: html as string };
     } catch (e) {
         console.error("Markdown parsing error:", e);
         return { __html: text }; // Fallback
     }
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Fixed Header */}
      <div className="flex items-center justify-between p-4 border-b bg-white z-20 shadow-sm">
        <button onClick={onBack} className="p-2 -ml-2 text-gray-600 hover:bg-gray-100 rounded-full">
           <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
        </button>
        <div className="flex-1 text-center mx-2">
            {isEditingMetadata ? (
                <input 
                    className="w-full text-center font-bold text-gray-800 border-b border-purple-300 focus:outline-none"
                    value={metadata.title}
                    onChange={(e) => setMetadata({...metadata, title: e.target.value})}
                />
            ) : (
                <h1 className="font-bold text-gray-800 truncate">{session.title}</h1>
            )}
        </div>
        <button 
            onClick={() => isEditingMetadata ? handleSaveMetadata() : setIsEditingMetadata(true)} 
            className="text-sm font-semibold text-purple-600 px-2"
        >
            {isEditingMetadata ? 'Done' : 'Edit'}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex p-2 bg-gray-50 border-b z-10">
        <button 
            onClick={() => setActiveTab('transcript')}
            className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-colors ${activeTab === 'transcript' ? `text-[${COLORS.RECORD_PURPLE}] bg-white shadow-sm` : 'text-gray-500 hover:bg-gray-100'}`}
        >
            Transcript
        </button>
        <button 
            onClick={() => setActiveTab('article')}
            className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-colors ${activeTab === 'article' ? 'text-[#FF6F00] bg-white shadow-sm' : 'text-gray-500 hover:bg-gray-100'}`}
        >
            Article
        </button>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-4 bg-white relative">
        
        {/* Metadata Section (Visible in Transcript Tab) */}
        {activeTab === 'transcript' && (
            <div className="mb-6 p-4 bg-gray-50 rounded-xl border border-gray-100 space-y-3">
                <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                        <span className="block text-xs text-gray-400 uppercase font-bold">Date</span>
                        <span className="text-gray-700">{session.date}</span>
                    </div>
                    <div>
                        <span className="block text-xs text-gray-400 uppercase font-bold">Duration</span>
                        <span className="text-gray-700">{Math.floor(session.durationSeconds / 60)}m {session.durationSeconds % 60}s</span>
                    </div>
                    <div className="col-span-2">
                         <span className="block text-xs text-gray-400 uppercase font-bold">Location</span>
                         {isEditingMetadata ? (
                             <input 
                                className="w-full bg-white border rounded px-2 py-1 mt-1 text-gray-700"
                                placeholder="Add location..."
                                value={metadata.location}
                                onChange={(e) => setMetadata({...metadata, location: e.target.value})}
                             />
                         ) : (
                             <span className="text-gray-700">{session.location || 'Not specified'}</span>
                         )}
                    </div>
                    <div className="col-span-2">
                         <span className="block text-xs text-gray-400 uppercase font-bold">Participants</span>
                         {isEditingMetadata ? (
                             <input 
                                className="w-full bg-white border rounded px-2 py-1 mt-1 text-gray-700"
                                placeholder="Name 1, Name 2..."
                                value={metadata.participants}
                                onChange={(e) => setMetadata({...metadata, participants: e.target.value})}
                             />
                         ) : (
                             <div className="flex flex-wrap gap-1 mt-1">
                                 {session.participants.map((p, i) => (
                                     <span key={i} className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded-md text-xs font-medium">{p}</span>
                                 ))}
                             </div>
                         )}
                    </div>
                </div>
            </div>
        )}

        {activeTab === 'transcript' ? (
          <div className="space-y-2 pb-24">
             <div className="flex justify-between items-center mb-2 border-b pb-2">
                 <h3 className="font-bold text-gray-800">Transcript</h3>
                 <button onClick={() => isEditingTranscript ? handleSaveTranscript() : setIsEditingTranscript(true)} className="text-xs font-bold text-blue-600 px-3 py-1 bg-blue-50 rounded-full">
                     {isEditingTranscript ? 'SAVE TEXT' : 'EDIT TEXT'}
                 </button>
             </div>
             {isEditingTranscript ? (
                 <textarea 
                    className="w-full h-96 p-4 border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none text-base leading-relaxed font-mono text-sm"
                    value={transcriptText}
                    onChange={(e) => setTranscriptText(e.target.value)}
                 />
             ) : (
                 <div className="prose prose-sm max-w-none text-gray-700 leading-relaxed whitespace-pre-wrap">
                     {session.transcript}
                 </div>
             )}
          </div>
        ) : (
          <div className="space-y-6 pb-24 max-w-3xl mx-auto">
            {!session.article ? (
                <div className="text-center py-10">
                    <div className="mb-4 inline-block p-4 rounded-full bg-orange-100">
                       <svg className="w-8 h-8 text-[#FF6F00]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"></path></svg>
                    </div>
                    <h3 className="text-lg font-bold text-gray-900">No Article Yet</h3>
                    <p className="text-gray-500 mb-6 px-8 text-sm">Turn your recording into a polished blog post with AI.</p>
                    <button 
                        onClick={() => setShowGenerator(true)}
                        className="px-6 py-3 bg-[#FF6F00] text-white rounded-full font-bold shadow-lg hover:bg-orange-600 transition"
                    >
                        Generate Article
                    </button>
                </div>
            ) : (
                <div className="max-w-none">
                     {session.generatedImageUrl && (
                        <div className="relative group mb-8">
                            {/* Improved Image Container with Loading Overlay */}
                            <div className="w-full bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 relative min-h-[200px]">
                                {isRegeneratingImage && (
                                    <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center transition-all duration-300">
                                        <svg className="animate-spin h-8 w-8 text-purple-600 mb-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                                        </svg>
                                        <p className="text-sm font-bold text-purple-700 animate-pulse">Updating Graphic...</p>
                                    </div>
                                )}
                                <img 
                                    src={session.generatedImageUrl} 
                                    alt="Generated Header" 
                                    className={`w-full h-auto max-h-[500px] object-contain mx-auto transition-all duration-500 ${isRegeneratingImage ? 'scale-95 opacity-50' : 'scale-100 opacity-100'}`} 
                                />
                            </div>
                            
                            {/* Image Controls */}
                            <div className="flex gap-2 mt-3 justify-center">
                                <button 
                                    disabled={isRegeneratingImage}
                                    onClick={() => handleRegenerateImage()}
                                    className={`px-3 py-1.5 bg-white border text-gray-600 text-xs font-semibold rounded-lg hover:bg-gray-50 flex items-center gap-1 shadow-sm transition-all ${isRegeneratingImage ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 4v6h-6"/><path d="M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
                                    {isRegeneratingImage ? 'Updating...' : 'Try Again'}
                                </button>
                                <button 
                                    disabled={isRegeneratingImage}
                                    onClick={() => setShowImagePrompt(true)}
                                    className={`px-3 py-1.5 bg-white border text-gray-600 text-xs font-semibold rounded-lg hover:bg-gray-50 flex items-center gap-1 shadow-sm transition-all ${isRegeneratingImage ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                                    Customize
                                </button>
                            </div>
                        </div>
                     )}

                     {showImagePrompt && (
                         <div className="mb-6 p-4 bg-gray-50 rounded-lg border animate-slide-up">
                             <label className="block text-xs font-bold text-gray-500 mb-2">CUSTOM IMAGE PROMPT</label>
                             <div className="flex gap-2">
                                 <input 
                                    disabled={isRegeneratingImage}
                                    className="flex-1 border p-2 rounded text-sm disabled:bg-gray-100 disabled:text-gray-400 transition-colors"
                                    placeholder="E.g. Neon city skyline, purple theme"
                                    value={customImagePrompt}
                                    onChange={(e) => setCustomImagePrompt(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !isRegeneratingImage) {
                                            handleRegenerateImage(customImagePrompt);
                                        }
                                    }}
                                 />
                                 <button 
                                    onClick={() => handleRegenerateImage(customImagePrompt)}
                                    className={`bg-purple-600 text-white px-4 rounded text-sm font-bold flex items-center gap-2 transition-all ${isRegeneratingImage ? 'opacity-75 cursor-not-allowed' : 'hover:bg-purple-700'}`}
                                    disabled={isRegeneratingImage}
                                 >
                                     {isRegeneratingImage && (
                                        <svg className="animate-spin h-3 w-3 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                                        </svg>
                                     )}
                                     {isRegeneratingImage ? 'Updating...' : 'Go'}
                                 </button>
                             </div>
                         </div>
                     )}

                     <div className="flex justify-between items-center mb-4 pt-4 border-t">
                        <span className="text-xs font-bold text-gray-400">ARTICLE CONTENT</span>
                        <button onClick={() => isEditingArticle ? handleSaveArticle() : setIsEditingArticle(true)} className="text-xs font-bold text-orange-600 px-3 py-1 bg-orange-50 rounded-full">
                             {isEditingArticle ? 'SAVE ARTICLE' : 'EDIT ARTICLE'}
                        </button>
                     </div>

                     {isEditingArticle ? (
                         <textarea 
                            className="w-full h-96 p-4 border rounded-lg focus:ring-2 focus:ring-orange-500 outline-none text-base leading-relaxed font-mono text-sm"
                            value={articleText}
                            onChange={(e) => setArticleText(e.target.value)}
                         />
                     ) : (
                         <div 
                             className="prose prose-purple max-w-none prose-img:rounded-xl prose-headings:text-gray-800"
                             dangerouslySetInnerHTML={getMarkdownText(session.article)}
                         />
                     )}
                     
                     <div className="pt-8 flex gap-3">
                        <button onClick={copyToClipboard} className="flex-1 py-3 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50">
                            Copy to Clipboard
                        </button>
                        <button onClick={() => setShowGenerator(true)} className="flex-1 py-3 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800">
                            Full Regenerate
                        </button>
                     </div>
                </div>
            )}
          </div>
        )}
      </div>

      {/* Floating Action Button for Chat - Adjusted bottom position to sit above nav */}
      <button 
        onClick={() => setShowChat(true)}
        className="absolute bottom-24 right-6 w-14 h-14 bg-[#6A0DAD] text-white rounded-full shadow-xl flex items-center justify-center hover:scale-105 transition-transform z-20"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
      </button>

      {/* Chat Interface Modal */}
      {showChat && (
        <div className="fixed inset-0 z-50 bg-white flex flex-col animate-slide-up">
            <div className="p-4 border-b flex justify-between items-center bg-[#6A0DAD] text-white">
                <h3 className="font-bold">Ask AI about Session</h3>
                <button onClick={() => setShowChat(false)} className="p-1">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
                </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
                {chatHistory.map((msg, i) => (
                    <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] p-3 rounded-2xl text-sm ${msg.role === 'user' ? 'bg-[#6A0DAD] text-white rounded-tr-none' : 'bg-white border rounded-tl-none text-gray-800'}`}>
                            {msg.text}
                        </div>
                    </div>
                ))}
                {isChatting && (
                    <div className="flex justify-start">
                        <div className="bg-white border p-3 rounded-2xl rounded-tl-none text-gray-500 text-sm italic">
                            Thinking...
                        </div>
                    </div>
                )}
            </div>
            <form onSubmit={handleChatSubmit} className="p-4 border-t bg-white flex gap-2">
                <input 
                    type="text" 
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Ask a question..."
                    className="flex-1 border rounded-full px-4 py-2 focus:ring-2 focus:ring-purple-500 outline-none"
                />
                <button type="submit" disabled={isChatting} className="bg-[#6A0DAD] text-white p-2 rounded-full w-10 h-10 flex items-center justify-center">
                    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"></path></svg>
                </button>
            </form>
        </div>
      )}

      {/* Article Generator Modal */}
      {showGenerator && (
        <ArticleGenerator 
            isLoading={isGenerating}
            onGenerate={handleGenerateArticle}
            onCancel={() => setShowGenerator(false)}
        />
      )}
    </div>
  );
};