import React, { useState, useEffect, useRef } from 'react';
import { LocalModel } from '../types';
import { getStoredModels, saveModelsState } from '../services/localModelService';

interface ModelManagerProps {
  selectedModelId?: string;
  onSelectModel: (id: string) => void;
}

export const ModelManager: React.FC<ModelManagerProps> = ({ selectedModelId, onSelectModel }) => {
  const [models, setModels] = useState<LocalModel[]>([]);
  const downloadingRefs = useRef<Set<string>>(new Set());

  useEffect(() => {
    setModels(getStoredModels());
  }, []);

  const handleDownload = (id: string) => {
    if (downloadingRefs.current.has(id)) return;
    
    downloadingRefs.current.add(id);
    setModels(prev => prev.map(m => m.id === id ? { ...m, status: 'downloading', progress: 0 } : m));

    // Simulate Download Progress
    const interval = setInterval(() => {
      setModels(prev => {
        const newModels = prev.map(m => {
          if (m.id === id) {
            const newProgress = m.progress + Math.random() * 15;
            if (newProgress >= 100) {
              return { ...m, progress: 100, status: 'ready' as const };
            }
            return { ...m, progress: newProgress };
          }
          return m;
        });
        
        // Check if finished in this tick
        const model = newModels.find(m => m.id === id);
        if (model?.status === 'ready') {
            clearInterval(interval);
            downloadingRefs.current.delete(id);
            saveModelsState(newModels);
        }
        return newModels;
      });
    }, 500);
  };

  const handleDelete = (id: string) => {
    const updated = models.map(m => m.id === id ? { ...m, status: 'available' as const, progress: 0 } : m);
    setModels(updated);
    saveModelsState(updated);
    if (selectedModelId === id) {
      onSelectModel('');
    }
  };

  return (
    <div className="space-y-4">
      {models.map(model => (
        <div key={model.id} className={`bg-white rounded-xl border p-4 transition-all ${selectedModelId === model.id && model.status === 'ready' ? 'border-purple-500 ring-1 ring-purple-500 shadow-sm' : 'border-gray-200'}`}>
          <div className="flex justify-between items-start mb-2">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-gray-800">{model.name}</h3>
                <span className="text-[10px] px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full font-medium">{model.family}</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">{model.description}</p>
            </div>
            <div className="text-right">
              <span className="text-xs font-mono text-gray-400">{model.size}</span>
            </div>
          </div>

          {/* Status Bar / Actions */}
          <div className="mt-4 flex items-center justify-between gap-4">
            
            {/* Left Side: Status Indicator */}
            <div className="flex-1">
               {model.status === 'downloading' ? (
                 <div className="w-full">
                   <div className="flex justify-between text-xs mb-1">
                     <span className="text-purple-600 font-medium">Downloading...</span>
                     <span className="text-gray-500">{Math.round(model.progress)}%</span>
                   </div>
                   <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                     <div className="h-full bg-purple-500 transition-all duration-300" style={{ width: `${model.progress}%` }}></div>
                   </div>
                 </div>
               ) : model.status === 'ready' ? (
                 <div className="flex items-center gap-1.5 text-xs text-green-600 font-medium">
                   <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M20 6L9 17l-5-5"/></svg>
                   <span>Ready to use</span>
                 </div>
               ) : (
                 <span className="text-xs text-gray-400">Not downloaded</span>
               )}
            </div>

            {/* Right Side: Buttons */}
            <div>
              {model.status === 'available' && (
                <button 
                  onClick={() => handleDownload(model.id)}
                  className="px-3 py-1.5 bg-gray-900 text-white text-xs font-bold rounded-lg hover:bg-gray-800 transition-colors flex items-center gap-1"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                  Download
                </button>
              )}
              
              {model.status === 'downloading' && (
                 <button disabled className="px-3 py-1.5 bg-gray-100 text-gray-400 text-xs font-bold rounded-lg cursor-not-allowed">
                   Wait...
                 </button>
              )}

              {model.status === 'ready' && (
                <div className="flex items-center gap-2">
                   {selectedModelId === model.id ? (
                      <button disabled className="px-3 py-1.5 bg-purple-100 text-purple-700 text-xs font-bold rounded-lg cursor-default border border-purple-200">
                        Active
                      </button>
                   ) : (
                      <button 
                        onClick={() => onSelectModel(model.id)}
                        className="px-3 py-1.5 bg-white border border-gray-300 text-gray-700 text-xs font-bold rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        Select
                      </button>
                   )}
                   <button 
                      onClick={() => handleDelete(model.id)}
                      className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
                      title="Delete Model"
                   >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                   </button>
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
