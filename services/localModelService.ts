import { LocalModel } from '../types';

export const AVAILABLE_MODELS: LocalModel[] = [
  {
    id: 'gemma-2b-it-q4f16_1',
    name: 'Gemma 2B IT',
    family: 'Google',
    size: '1.4 GB',
    description: 'Lightweight instruction-tuned model by Google.',
    status: 'available',
    progress: 0
  },
  {
    id: 'phi-3-mini-4k-instruct-q4f16_1',
    name: 'Phi-3 Mini',
    family: 'Microsoft',
    size: '2.3 GB',
    description: 'High reasoning capability in a small package.',
    status: 'available',
    progress: 0
  },
  {
    id: 'tinyllama-1.1b-chat-v1.0-q4f16_1',
    name: 'TinyLlama 1.1B',
    family: 'Open Source',
    size: '640 MB',
    description: 'Extremely fast, suitable for older devices.',
    status: 'available',
    progress: 0
  },
  {
    id: 'llama-3-8b-instruct-q4f16_1',
    name: 'Llama 3 8B',
    family: 'Meta',
    size: '4.7 GB',
    description: 'State-of-the-art open model. Requires high RAM.',
    status: 'available',
    progress: 0
  }
];

// In a real app, this would use the Cache API or FileSystem to check existence
export const getStoredModels = (): LocalModel[] => {
  const stored = localStorage.getItem('local_models_state');
  if (stored) {
    return JSON.parse(stored);
  }
  return AVAILABLE_MODELS;
};

export const saveModelsState = (models: LocalModel[]) => {
  localStorage.setItem('local_models_state', JSON.stringify(models));
};
