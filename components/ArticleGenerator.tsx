import React, { useState } from 'react';
import { ArticleStyle, ArticleTone, ArticleLength, ArticleAudience, COLORS } from '../types';

interface ArticleGeneratorProps {
  onGenerate: (config: { style: ArticleStyle; tone: ArticleTone; length: ArticleLength; audience: ArticleAudience }) => void;
  onCancel: () => void;
  isLoading: boolean;
}

export const ArticleGenerator: React.FC<ArticleGeneratorProps> = ({ onGenerate, onCancel, isLoading }) => {
  const [style, setStyle] = useState<ArticleStyle>(ArticleStyle.Professional);
  const [tone, setTone] = useState<ArticleTone>(ArticleTone.Formal);
  const [length, setLength] = useState<ArticleLength>(ArticleLength.Medium);
  const [audience, setAudience] = useState<ArticleAudience>(ArticleAudience.General);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden animate-slide-up">
        <div className="p-6 space-y-6">
          <div className="text-center">
            <h3 className="text-xl font-bold text-gray-900">Generate Article</h3>
            <p className="text-sm text-gray-500 mt-1">Configure your session summary</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold uppercase text-gray-500 tracking-wide">Style</label>
              <div className="grid grid-cols-3 gap-2 mt-1">
                {Object.values(ArticleStyle).map((s) => (
                  <button
                    key={s}
                    onClick={() => setStyle(s)}
                    className={`text-sm py-2 rounded-lg border transition-all ${style === s ? `bg-[${COLORS.POST_ORANGE}] text-white border-transparent` : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'}`}
                    style={{ backgroundColor: style === s ? COLORS.POST_ORANGE : '' }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold uppercase text-gray-500 tracking-wide">Tone</label>
              <div className="grid grid-cols-3 gap-2 mt-1">
                {Object.values(ArticleTone).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTone(t)}
                    className={`text-sm py-2 rounded-lg border transition-all ${tone === t ? 'text-white border-transparent' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'}`}
                    style={{ backgroundColor: tone === t ? COLORS.POST_ORANGE : '' }}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

             <div>
              <label className="text-xs font-semibold uppercase text-gray-500 tracking-wide">Length</label>
              <select 
                value={length} 
                onChange={(e) => setLength(e.target.value as ArticleLength)}
                className="w-full mt-1 p-3 bg-gray-50 border border-gray-200 rounded-lg text-sm"
              >
                {Object.values(ArticleLength).map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold uppercase text-gray-500 tracking-wide">Audience</label>
              <select 
                value={audience} 
                onChange={(e) => setAudience(e.target.value as ArticleAudience)}
                className="w-full mt-1 p-3 bg-gray-50 border border-gray-200 rounded-lg text-sm"
              >
                {Object.values(ArticleAudience).map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
          </div>

          <div className="flex space-x-3 pt-4">
             <button 
                onClick={onCancel}
                className="flex-1 py-3 text-gray-600 font-medium hover:bg-gray-100 rounded-xl"
             >
                Cancel
             </button>
             <button 
                disabled={isLoading}
                onClick={() => onGenerate({ style, tone, length, audience })}
                className="flex-1 py-3 text-white font-bold rounded-xl shadow-md flex justify-center items-center"
                style={{ backgroundColor: COLORS.POST_ORANGE }}
             >
                {isLoading ? (
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                    </svg>
                ) : 'Generate Content'}
             </button>
          </div>
        </div>
      </div>
    </div>
  );
};