import React, { useState, useEffect } from 'react';
import { generateVideo } from '../services/geminiService';
import Spinner from '../components/Spinner';
import { Project, Asset } from '../types';

interface VideoGenerationProps {
    project: Project | undefined;
    onUpdateProject: (updatedProject: Project) => void;
}

const VideoGeneration: React.FC<VideoGenerationProps> = ({ project, onUpdateProject }) => {
    const [prompt, setPrompt] = useState('');
    const [videoUrl, setVideoUrl] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [apiKeySelected, setApiKeySelected] = useState(false);

    useEffect(() => {
        const checkApiKey = async () => {
            if (window.aistudio) {
                const hasKey = await window.aistudio.hasSelectedApiKey();
                setApiKeySelected(hasKey);
            }
        };
        checkApiKey();
    }, []);

    useEffect(() => {
        if (project) {
            setPrompt(project.prompts.video);
            setVideoUrl(null); // Reset video when project changes
        }
    }, [project]);

    const handlePromptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newPrompt = e.target.value;
        setPrompt(newPrompt);
        if (project) {
            onUpdateProject({
                ...project,
                prompts: { ...project.prompts, video: newPrompt },
            });
        }
    };

    const handleGenerate = async () => {
        if (!prompt.trim()) {
            setError('Prompt cannot be empty.');
            return;
        }

        setIsLoading(true);
        setError(null);
        setVideoUrl(null);
        setLoadingMessage('Checking API key...');

        try {
            if (window.aistudio && !await window.aistudio.hasSelectedApiKey()) {
                await window.aistudio.openSelectKey();
                // Assume success after dialog opens to avoid race condition
                setApiKeySelected(true); 
            }
            
            setLoadingMessage('Initializing video generation...');
            
            const downloadLink = await generateVideo(prompt, (message) => {
                setLoadingMessage(message); // Update loading message from service
            });
            
            setLoadingMessage('Fetching generated video...');

            // The downloadLink already includes the API key from the service
            const response = await fetch(downloadLink);
            if (!response.ok) {
                throw new Error(`Failed to download video: ${response.statusText}`);
            }
            const videoBlob = await response.blob();
            const url = URL.createObjectURL(videoBlob);
            setVideoUrl(url);

        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
             if (errorMessage.includes("Requested entity was not found")) {
                setError("API key is invalid. Please select a valid key.");
                setApiKeySelected(false);
            } else {
                setError(errorMessage);
            }
        } finally {
            setIsLoading(false);
            setLoadingMessage('');
        }
    };
    
    const handleSelectKey = async () => {
        if (window.aistudio) {
            await window.aistudio.openSelectKey();
            // Optimistically assume key is selected
            setApiKeySelected(true);
            setError(null);
        }
    };

    const handleSaveToProject = () => {
        if (project && videoUrl) {
            const newAsset: Asset = {
                id: `asset-${Date.now()}`,
                type: 'video',
                content: videoUrl,
                prompt: prompt,
            };
            onUpdateProject({
                ...project,
                assets: [...project.assets, newAsset],
            });
            setVideoUrl(null); // Clear after saving
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
    
    const videoAssets = project.assets.filter(asset => asset.type === 'video');

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Video Generation Studio</h1>
                <p className="mt-2 text-lg text-gray-600 dark:text-gray-400">Create short video clips from text prompts using Veo.</p>
            </div>
            
             {!apiKeySelected && (
                <div className="p-4 bg-yellow-100 dark:bg-yellow-900/50 border border-yellow-400 text-yellow-800 dark:text-yellow-300 rounded-lg space-y-2">
                    <p className="font-bold">API Key Required for Veo</p>
                    <p>The Veo model requires you to select your own API key. Please ensure you have billing enabled for your project.</p>
                    <div className="flex flex-wrap gap-4 items-center">
                        <button onClick={handleSelectKey} className="px-4 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600">Select API Key</button>
                        <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="text-sm underline">Learn about billing</a>
                    </div>
                </div>
            )}

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 space-y-4">
                <label htmlFor="video-prompt" className="block text-lg font-medium text-gray-800 dark:text-gray-200">
                    Video Prompt
                </label>
                <textarea
                    id="video-prompt"
                    value={prompt}
                    onChange={handlePromptChange}
                    placeholder="e.g., A neon hologram of a cat driving at top speed."
                    className="w-full h-24 p-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500"
                    disabled={isLoading || !apiKeySelected}
                />
                <button
                    onClick={handleGenerate}
                    disabled={isLoading || !apiKeySelected || !prompt.trim()}
                    className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                    {isLoading && <Spinner size="sm" />}
                    <span className={isLoading ? 'ml-2' : ''}>Generate Video</span>
                </button>
            </div>
            
            {(isLoading || error || videoUrl) && (
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                    <h2 className="text-xl font-semibold mb-4">Result</h2>
                    {isLoading && (
                        <div className="flex flex-col justify-center items-center h-64 bg-gray-100 dark:bg-gray-700 rounded-lg">
                            <Spinner />
                            <p className="mt-4 text-gray-600 dark:text-gray-300">{loadingMessage}</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">(Video generation can take several minutes)</p>
                        </div>
                    )}
                    {error && <div className="p-4 bg-red-100 dark:bg-red-900/50 border border-red-400 text-red-700 dark:text-red-300 rounded-lg"><p className="font-bold">Error</p><p>{error}</p></div>}
                    {videoUrl && (
                        <div className="flex flex-col items-center gap-4">
                            <video src={videoUrl} controls autoPlay loop className="rounded-lg shadow-md mx-auto max-w-full h-auto bg-black" />
                            <div className="flex flex-wrap justify-center items-center gap-4 mt-4">
                                <a href={videoUrl} download={`quickai-video-${Date.now()}.mp4`} className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-2 border border-transparent text-base font-medium rounded-md text-gray-700 bg-gray-100 hover:bg-gray-200 dark:text-gray-200 dark:bg-gray-600 dark:hover:bg-gray-500">Download</a>
                                <button onClick={handleSaveToProject} className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-2 border border-transparent text-base font-medium rounded-md text-white bg-green-600 hover:bg-green-700">Save to Project</button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {videoAssets.length > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                    <h2 className="text-xl font-semibold mb-4">Saved Video Assets</h2>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                        {videoAssets.map(asset => (
                            <div key={asset.id} className="relative group aspect-video">
                                <video src={asset.content} loop className="w-full h-full object-cover rounded-lg shadow-md bg-black" onMouseOver={e => e.currentTarget.play()} onMouseOut={e => { e.currentTarget.pause(); e.currentTarget.currentTime = 0; }} />
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default VideoGeneration;
