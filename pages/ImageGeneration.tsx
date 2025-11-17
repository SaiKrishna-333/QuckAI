import React, { useState, useEffect, useRef } from 'react';
import ReactCrop, { type Crop, type PixelCrop } from 'react-image-crop';
import { generateImage, rankTextsForImage, analyzeImage, detectImageSentiment } from '../services/geminiService';
import Spinner from '../components/Spinner';
import { Project, Asset } from '../types';
import { useHistoryState } from '../hooks/useHistoryState';
import { UndoIcon } from '../components/icons/UndoIcon';
import { RedoIcon } from '../components/icons/RedoIcon';

interface ImageGenerationProps {
    project: Project | undefined;
    onUpdateProject: (updatedProject: Project) => void;
}

// Helper function to get cropped image data URL
function getCroppedImg(
  image: HTMLImageElement,
  crop: PixelCrop,
): string {
  const canvas = document.createElement('canvas');
  const scaleX = image.naturalWidth / image.width;
  const scaleY = image.naturalHeight / image.height;
  canvas.width = Math.floor(crop.width * scaleX);
  canvas.height = Math.floor(crop.height * scaleY);
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Failed to get canvas context');
  }

  ctx.drawImage(
    image,
    crop.x * scaleX,
    crop.y * scaleY,
    crop.width * scaleX,
    crop.height * scaleY,
    0,
    0,
    canvas.width,
    canvas.height,
  );

  return canvas.toDataURL('image/png');
}

const ImageGeneration: React.FC<ImageGenerationProps> = ({ project, onUpdateProject }) => {
  const { 
    state: prompt, 
    setState: setPrompt,
    undo: undoPrompt,
    redo: redoPrompt,
    canUndo: canUndoPrompt,
    canRedo: canRedoPrompt,
    resetState: resetPromptState
  } = useHistoryState('');
  const { 
    state: imageUrl, 
    setState: setImageUrl, 
    undo: undoImage, 
    redo: redoImage, 
    canUndo: canUndoImage, 
    canRedo: canRedoImage, 
    resetState: resetImageState 
  } = useHistoryState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [promptHistory, setPromptHistory] = useState<string[]>(() => {
    try {
      const item = window.localStorage.getItem('image-prompt-history');
      return item ? JSON.parse(item) : [];
    } catch (error) {
      console.warn('Error reading image prompt history from localStorage', error);
      return [];
    }
  });

  // Cropping state
  const [isEditing, setIsEditing] = useState(false);
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const imgRef = useRef<HTMLImageElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Ranking state
  const [rankingTexts, setRankingTexts] = useState('');
  const [rankedResults, setRankedResults] = useState<{ text: string, score: number }[] | null>(null);
  const [isRanking, setIsRanking] = useState(false);
  const [rankingError, setRankingError] = useState<string | null>(null);

  // Analysis state
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [analysisTags, setAnalysisTags] = useState<string[] | null>(null);

  // Sentiment state
  const [isDetectingSentiment, setIsDetectingSentiment] = useState(false);
  const [sentimentError, setSentimentError] = useState<string | null>(null);
  const [imageSentiment, setImageSentiment] = useState<string | null>(null);


  useEffect(() => {
    if (project) {
        resetPromptState(project.prompts.image);
        resetImageState(null);
    }
  }, [project, resetPromptState, resetImageState]);
  
  useEffect(() => {
    if (project && prompt !== project.prompts.image) {
        onUpdateProject({ 
            ...project, 
            prompts: { ...project.prompts, image: prompt } 
        });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prompt]);

  // Reset secondary states when image changes
  useEffect(() => {
      setRankingTexts('');
      setRankedResults(null);
      setRankingError(null);
      setAnalysisTags(null);
      setAnalysisError(null);
      setImageSentiment(null);
      setSentimentError(null);
  }, [imageUrl]);

  const handlePromptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setPrompt(e.target.value);
  };
  
  const handleSelectFromHistory = (historyPrompt: string) => {
    setPrompt(historyPrompt);
  };

  const handleGenerate = async () => {
    const trimmedPrompt = prompt.trim();
    if (!trimmedPrompt) {
      setError('Prompt cannot be empty.');
      return;
    }
     if (!process.env.API_KEY) {
      setError('API key is not set. Please set the API_KEY environment variable.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setImageUrl(null);

    try {
       if (trimmedPrompt && !promptHistory.includes(trimmedPrompt)) {
        const newHistory = [trimmedPrompt, ...promptHistory.slice(0, 19)]; // Keep latest 20
        setPromptHistory(newHistory);
        try {
            window.localStorage.setItem('image-prompt-history', JSON.stringify(newHistory));
        } catch (error) {
            console.warn('Error saving image prompt history to localStorage', error);
        }
      }
      const generatedImageUrl = await generateImage(trimmedPrompt);
      setImageUrl(generatedImageUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
        setError('Please upload a valid image file (e.g., PNG, JPG, WEBP).');
        return;
    }
    
    setError(null);
    setIsLoading(true); 
    setImageUrl(null);

    const reader = new FileReader();
    reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        setImageUrl(dataUrl);
        setIsLoading(false);
    };
    reader.onerror = () => {
        setError('Failed to read the uploaded image.');
        setIsLoading(false);
    };
    reader.readAsDataURL(file);

    // Reset file input to allow uploading the same file again
    if (event.target) {
        event.target.value = '';
    }
  };

  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };
  
  const handleSaveToProject = () => {
    if (project && imageUrl) {
      const newAsset: Asset = {
        id: `asset-${Date.now()}`,
        type: 'image',
        content: imageUrl,
        prompt: prompt,
      };
      onUpdateProject({
        ...project,
        assets: [...project.assets, newAsset],
      });
      resetImageState(null);
    }
  };

  const handleApplyCrop = () => {
    if (completedCrop?.width && completedCrop?.height && imgRef.current) {
      try {
        const croppedImageUrl = getCroppedImg(imgRef.current, completedCrop);
        setImageUrl(croppedImageUrl);
        setIsEditing(false);
        setCrop(undefined);
        setCompletedCrop(undefined);
      } catch (e) {
        console.error(e);
        setError('Failed to crop image.');
      }
    }
  };

  const handleClearHistory = () => {
    setPromptHistory([]);
    try {
      window.localStorage.removeItem('image-prompt-history');
    } catch (error) {
      console.warn('Error clearing image prompt history from localStorage', error);
    }
  };

  const handleDeleteAsset = (assetId: string) => {
    if (project) {
        if (window.confirm('Are you sure you want to delete this asset?')) {
            const updatedAssets = project.assets.filter(a => a.id !== assetId);
            onUpdateProject({ ...project, assets: updatedAssets });
        }
    }
  };

  const handleRank = async () => {
    if (!imageUrl) return;

    const textsToRank = rankingTexts.split('\n').map(t => t.trim()).filter(t => t.length > 0);
    if (textsToRank.length === 0) {
      setRankingError('Please enter at least one description to rank.');
      return;
    }

    setIsRanking(true);
    setRankingError(null);
    setRankedResults(null);

    try {
      const [, base64Data] = imageUrl.split(',');
      const mimeType = imageUrl.substring(imageUrl.indexOf(':') + 1, imageUrl.indexOf(';'));
      const results = await rankTextsForImage(base64Data, mimeType, textsToRank);
      results.sort((a, b) => b.score - a.score);
      setRankedResults(results);

    } catch (err) {
      setRankingError(err instanceof Error ? err.message : 'An unknown error occurred during ranking.');
    } finally {
      setIsRanking(false);
    }
  };
  
  const handleAnalyzeImage = async () => {
    if (!imageUrl) return;

    setIsAnalyzing(true);
    setAnalysisError(null);
    setAnalysisTags(null);

    try {
      const [, base64Data] = imageUrl.split(',');
      const mimeType = imageUrl.substring(imageUrl.indexOf(':') + 1, imageUrl.indexOf(';'));
      const tags = await analyzeImage(base64Data, mimeType);
      setAnalysisTags(tags);

    } catch (err) {
      setAnalysisError(err instanceof Error ? err.message : 'An unknown error occurred during analysis.');
    } finally {
      setIsAnalyzing(false);
    }
  };
  
  const handleDetectSentiment = async () => {
    if (!imageUrl) return;

    setIsDetectingSentiment(true);
    setSentimentError(null);
    setImageSentiment(null);

    try {
      const [, base64Data] = imageUrl.split(',');
      const mimeType = imageUrl.substring(imageUrl.indexOf(':') + 1, imageUrl.indexOf(';'));
      const sentiment = await detectImageSentiment(base64Data, mimeType);
      setImageSentiment(sentiment);
    } catch (err) {
      setSentimentError(err instanceof Error ? err.message : 'An unknown error occurred during sentiment detection.');
    } finally {
      setIsDetectingSentiment(false);
    }
  };

  if (!project) {
    return (
        <div className="text-center p-8 bg-white dark:bg-gray-800 rounded-xl shadow-lg">
            <h2 className="text-xl font-semibold">No Project Selected</h2>
            <p className="mt-2 text-gray-600 dark:text-gray-400">Please go to the dashboard to create or select a project.</p>
        </div>
    );
  }

  const imageAssets = project.assets.filter(asset => asset.type === 'image');

  return (
    <>
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Image Generation & Analysis</h1>
          <p className="mt-2 text-lg text-gray-600 dark:text-gray-400">Turn ideas into visuals or upload your own for analysis.</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 space-y-4">
          <div className="flex items-center justify-between">
            <label htmlFor="prompt" className="block text-lg font-medium text-gray-800 dark:text-gray-200">
              Image Prompt
            </label>
            <div className="flex items-center gap-2">
                <button onClick={undoPrompt} disabled={!canUndoPrompt} aria-label="Undo prompt change" title="Undo" className="p-2 rounded-full text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:text-gray-300 dark:disabled:text-gray-500 disabled:cursor-not-allowed transition"><UndoIcon /></button>
                <button onClick={redoPrompt} disabled={!canRedoPrompt} aria-label="Redo prompt change" title="Redo" className="p-2 rounded-full text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:text-gray-300 dark:disabled:text-gray-500 disabled:cursor-not-allowed transition"><RedoIcon /></button>
            </div>
          </div>
          <textarea id="prompt" value={prompt} onChange={handlePromptChange} placeholder="e.g., A photorealistic image of a cat wearing a tiny wizard hat." className="w-full h-24 p-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition" disabled={isLoading} />
          {promptHistory.length > 0 && (
              <div className="pt-2">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Prompt History</h3>
                    <button onClick={handleClearHistory} className="text-xs text-red-500 hover:text-red-700 dark:hover:text-red-400 transition" title="Clear history">Clear</button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                      {promptHistory.map((histPrompt, index) => (
                          <button key={index} onClick={() => handleSelectFromHistory(histPrompt)} className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-sm rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition" title={histPrompt}>
                              {histPrompt.substring(0, 30)}{histPrompt.length > 30 ? '...' : ''}
                          </button>
                      ))}
                  </div>
              </div>
          )}
           <div className="flex flex-wrap gap-4 items-center">
              <button onClick={handleGenerate} disabled={isLoading} className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-300 disabled:cursor-not-allowed">
                {isLoading && <Spinner size="sm" />}<span className={isLoading ? 'ml-2' : ''}>Generate Image</span>
              </button>
              
              <span className="text-gray-500 dark:text-gray-400">OR</span>

              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImageUpload}
                accept="image/*"
                className="hidden"
                aria-hidden="true"
              />
              <button
                onClick={triggerFileUpload}
                disabled={isLoading}
                className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                Upload for Analysis
              </button>
          </div>
        </div>

        {(isLoading || error || imageUrl) && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Result</h2>
            {isLoading && <div className="flex justify-center items-center h-64 bg-gray-100 dark:bg-gray-700 rounded-lg"><Spinner /></div>}
            {error && <div className="p-4 bg-red-100 dark:bg-red-900/50 border border-red-400 text-red-700 dark:text-red-300 rounded-lg"><p className="font-bold">Error</p><p>{error}</p></div>}
            {imageUrl && (
              <div className="flex flex-col items-center gap-4">
                <img src={imageUrl} alt={prompt} className="rounded-lg shadow-md mx-auto max-w-full h-auto" />
                <div className="flex flex-wrap justify-center items-center gap-4 mt-4">
                    <div className="flex items-center gap-2 order-first sm:order-none"><button onClick={undoImage} disabled={!canUndoImage} aria-label="Undo image change" title="Undo" className="p-2 rounded-full text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:text-gray-300 dark:disabled:text-gray-500 disabled:cursor-not-allowed transition"><UndoIcon /></button><button onClick={redoImage} disabled={!canRedoImage} aria-label="Redo image change" title="Redo" className="p-2 rounded-full text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:text-gray-300 dark:disabled:text-gray-500 disabled:cursor-not-allowed transition"><RedoIcon /></button></div>
                    <button onClick={() => setIsEditing(true)} className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-2 border border-transparent text-base font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200">Edit</button>
                    <button onClick={handleAnalyzeImage} disabled={isAnalyzing} className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-2 border border-transparent text-base font-medium rounded-md text-purple-700 bg-purple-100 hover:bg-purple-200 disabled:opacity-50">{isAnalyzing && <Spinner size="sm" /> }<span className={isAnalyzing ? 'ml-2' : ''}>Analyze Image (CNN)</span></button>
                    <button onClick={handleDetectSentiment} disabled={isDetectingSentiment} className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-2 border border-transparent text-base font-medium rounded-md text-teal-700 bg-teal-100 hover:bg-teal-200 disabled:opacity-50">{isDetectingSentiment && <Spinner size="sm" />}<span className={isDetectingSentiment ? 'ml-2' : ''}>Image Sentiment (NB)</span></button>
                    <a href={imageUrl} download={`quickai-image-${Date.now()}.png`} className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-2 border border-transparent text-base font-medium rounded-md text-gray-700 bg-gray-100 hover:bg-gray-200 dark:text-gray-200 dark:bg-gray-600 dark:hover:bg-gray-500">Download</a>
                    <button onClick={handleSaveToProject} className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-2 border border-transparent text-base font-medium rounded-md text-white bg-green-600 hover:bg-green-700">Save to Project</button>
                </div>

                <div className="mt-4 w-full pt-4 border-t border-gray-200 dark:border-gray-700 flex flex-wrap gap-4">
                  { (isAnalyzing || analysisError || analysisTags) && <div className="flex-1 min-w-[200px]">
                      <h4 className="font-semibold mb-2">Image Analysis Tags:</h4>
                      {isAnalyzing && <div className="flex justify-center"><Spinner/></div>}
                      {analysisError && <div className="p-3 bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 rounded-lg text-sm">{analysisError}</div>}
                      {analysisTags && <div className="flex flex-wrap gap-2">{analysisTags.map((tag, index) => (<span key={index} className="px-3 py-1 bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300 text-sm font-medium rounded-full">{tag}</span>))}</div>}
                  </div>}
                  { (isDetectingSentiment || sentimentError || imageSentiment) && <div className="flex-1 min-w-[200px]">
                      <h4 className="font-semibold mb-2">Image Sentiment:</h4>
                      {isDetectingSentiment && <div className="flex justify-center"><Spinner/></div>}
                      {sentimentError && <div className="p-3 bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 rounded-lg text-sm">{sentimentError}</div>}
                      {imageSentiment && <div className="px-3 py-1 text-lg font-bold rounded-full inline-block {
                        {'Positive': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
                         'Negative': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
                         'Neutral': 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'}[imageSentiment] || 'bg-gray-100 text-gray-800'
                      }">{imageSentiment}</div>}
                  </div>}
                </div>
                
                <div className="mt-6 w-full pt-6 border-t border-gray-200 dark:border-gray-700">
                  <h3 className="text-lg font-semibold mb-3">Image-Text Similarity Ranking (CLIP)</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">Enter text descriptions (one per line) to see how well they match the generated image.</p>
                  <textarea value={rankingTexts} onChange={(e) => setRankingTexts(e.target.value)} placeholder="A cat in a hat.&#10;A dog on a log.&#10;A wizard cat in a library." className="w-full h-24 p-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition" disabled={isRanking}/>
                  <button onClick={handleRank} disabled={isRanking} className="mt-3 w-full sm:w-auto inline-flex items-center justify-center px-5 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50">{isRanking && <Spinner size="sm"/>}<span className={isRanking ? 'ml-2' : ''}>Rank Descriptions</span></button>
                  {isRanking && <div className="mt-4 flex justify-center"><Spinner/></div>}
                  {rankingError && <div className="mt-4 p-3 bg-red-100 dark:bg-red-900/50 border border-red-400 text-red-700 dark:text-red-300 rounded-lg">{rankingError}</div>}
                  {rankedResults && (
                    <div className="mt-4 space-y-3">
                      <h4 className="font-semibold">Ranking Results:</h4>
                      <ul className="space-y-2">{rankedResults.map((result, index) => (<li key={index} className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg"><div className="flex justify-between items-center text-sm"><span className="text-gray-800 dark:text-gray-200">{result.text}</span><span className="font-mono text-indigo-600 dark:text-indigo-400">{(result.score * 100).toFixed(1)}%</span></div><div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-1"><div className="bg-indigo-500 h-2 rounded-full" style={{ width: `${result.score * 100}%` }}></div></div></li>))}</ul>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {imageAssets.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                <h2 className="text-xl font-semibold mb-4">Saved Image Assets</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {imageAssets.map(asset => (<div key={asset.id} className="relative group aspect-square"><img src={asset.content} alt={asset.prompt || 'Generated image'} className="w-full h-full object-cover rounded-lg shadow-md" /><button onClick={() => handleDeleteAsset(asset.id)} className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100" aria-label="Delete asset"><svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"></path></svg></button></div>))}
                </div>
            </div>
        )}
      </div>

      {isEditing && imageUrl && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50 p-4" onClick={() => setIsEditing(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-4 sm:p-6 max-w-3xl w-full" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-semibold mb-4">Crop Image</h3>
            <div className="flex justify-center bg-gray-200 dark:bg-gray-900 p-2 rounded-lg"><ReactCrop crop={crop} onChange={(_, percentCrop) => setCrop(percentCrop)} onComplete={(c) => setCompletedCrop(c)} aspect={1}><img ref={imgRef} alt="Crop me" src={imageUrl} style={{ maxHeight: '60vh', objectFit: 'contain' }} /></ReactCrop></div>
            <div className="flex justify-end gap-4 mt-6"><button onClick={() => setIsEditing(false)} className="px-4 py-2 bg-gray-200 dark:bg-gray-600 rounded-md hover:bg-gray-300 dark:hover:bg-gray-500 transition">Cancel</button><button onClick={handleApplyCrop} disabled={!completedCrop?.width || !completedCrop?.height} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition disabled:bg-blue-300 disabled:cursor-not-allowed">Apply Crop</button></div>
          </div>
        </div>
      )}
    </>
  );
};

export default ImageGeneration;