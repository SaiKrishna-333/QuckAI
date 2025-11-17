
import React, { useState, useRef, useEffect } from 'react';
import Spinner from '../components/Spinner';
import { generateSpeech, transcribeSpeech } from '../services/geminiService';
import { Project, Asset } from '../types';

interface AudioToolProps {
    project: Project | undefined;
    onUpdateProject: (updatedProject: Project) => void;
}


const TextToSpeech: React.FC<AudioToolProps> = ({ project, onUpdateProject }) => {
    const [text, setText] = useState('');
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [speakerMode, setSpeakerMode] = useState<'single' | 'multi'>('single');
    const [loadingMessage, setLoadingMessage] = useState('');
    
    useEffect(() => {
        if (project) {
            setText(project.prompts.tts);
            setAudioUrl(null);
        }
    }, [project]);

    const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newText = e.target.value;
        setText(newText);
        if (project) {
            onUpdateProject({
                ...project,
                prompts: { ...project.prompts, tts: newText },
            });
        }
    };

    const handleGenerate = async () => {
        if (!text.trim()) {
            setError('Text cannot be empty.');
            return;
        }
        if (!process.env.API_KEY) {
            setError('API key is not set. Please set the API_KEY environment variable.');
            return;
        }

        setIsLoading(true);
        setError(null);
        setAudioUrl(null);
        setLoadingMessage(
            speakerMode === 'multi'
                ? 'Generating multi-speaker audio scene...'
                : 'Generating speech...'
        );

        try {
            const audioData = await generateSpeech(text, speakerMode);
            setAudioUrl(audioData);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unknown error occurred.');
        } finally {
            setIsLoading(false);
            setLoadingMessage('');
        }
    };

    const handleSaveToProject = () => {
        if (project && audioUrl) {
          const newAsset: Asset = {
            id: `asset-${Date.now()}`,
            type: 'audio',
            content: audioUrl,
            prompt: text,
          };
          onUpdateProject({
            ...project,
            assets: [...project.assets, newAsset],
          });
          setAudioUrl(null);
        }
    };
    
    const getPlaceholderText = () => {
        if (speakerMode === 'single') {
            return "e.g., Hello, welcome to QuickAI. How can I help you today?";
        }
        return "Format with speaker names, e.g.:\nJoe: How's it going today Jane?\nJane: Not too bad, how about you?";
    }

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <label htmlFor="tts-text" className="block text-lg font-medium text-gray-800 dark:text-gray-200">
                    Text to Synthesize
                </label>
                 <div className="flex items-center rounded-lg p-1 bg-gray-100 dark:bg-gray-900">
                    <button onClick={() => setSpeakerMode('single')} className={`px-3 py-1 text-sm font-medium rounded-md ${speakerMode === 'single' ? 'bg-white dark:bg-gray-700 shadow' : ''}`}>Single Speaker</button>
                    <button onClick={() => setSpeakerMode('multi')} className={`px-3 py-1 text-sm font-medium rounded-md ${speakerMode === 'multi' ? 'bg-white dark:bg-gray-700 shadow' : ''}`}>Multi-Speaker</button>
                </div>
            </div>
            <textarea
                id="tts-text"
                value={text}
                onChange={handleTextChange}
                placeholder={getPlaceholderText()}
                className="w-full h-32 p-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                disabled={isLoading}
            />
            <button
                onClick={handleGenerate}
                disabled={isLoading}
                className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-300 disabled:cursor-not-allowed"
            >
                {isLoading && <Spinner size="sm" />}
                <span className={isLoading ? 'ml-2' : ''}>Generate Speech</span>
            </button>

            {isLoading && (
              <div className="flex flex-col items-center justify-center p-4">
                <Spinner />
                <p className="mt-2 text-gray-600 dark:text-gray-300">{loadingMessage}</p>
              </div>
            )}
            {error && <div className="p-4 bg-red-100 dark:bg-red-900/50 border border-red-400 text-red-700 dark:text-red-300 rounded-lg"><p>{error}</p></div>}
            {audioUrl && !isLoading && (
                <div className="space-y-4">
                    <h3 className="text-lg font-medium mb-2">Generated Audio</h3>
                    <audio controls src={audioUrl} className="w-full"></audio>
                    <div className="flex flex-wrap items-center gap-4">
                        <button onClick={handleSaveToProject} className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-2 border border-transparent text-base font-medium rounded-md text-white bg-green-600 hover:bg-green-700">
                            Save to Project
                        </button>
                        <a 
                          href={audioUrl} 
                          download={`quickai_speech_${text.substring(0, 20).replace(/\s+/g, '_') || Date.now()}.mp3`}
                          className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-2 border border-transparent text-base font-medium rounded-md text-gray-700 bg-gray-100 hover:bg-gray-200 dark:text-gray-200 dark:bg-gray-600 dark:hover:bg-gray-500"
                        >
                          Download Audio
                        </a>
                    </div>
                </div>
            )}
        </div>
    );
};

const SpeechToText: React.FC<AudioToolProps> = ({ project, onUpdateProject }) => {
    const [file, setFile] = useState<File | null>(null);
    const [transcript, setTranscript] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isRecording, setIsRecording] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const streamRef = useRef<MediaStream | null>(null);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files && event.target.files[0]) {
            setFile(event.target.files[0]);
            setTranscript('');
            setError(null);
        }
    };

    const handleToggleRecording = async () => {
        if (isRecording) {
            mediaRecorderRef.current?.stop();
        } else {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                streamRef.current = stream;
                const recorder = new MediaRecorder(stream);
                mediaRecorderRef.current = recorder;
                const audioChunks: Blob[] = [];

                recorder.ondataavailable = (event) => {
                    audioChunks.push(event.data);
                };

                recorder.onstop = () => {
                    const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
                    const audioFile = new File([audioBlob], `recording-${Date.now()}.webm`, { type: 'audio/webm' });
                    setFile(audioFile);
                    streamRef.current?.getTracks().forEach(track => track.stop());
                    setIsRecording(false);
                };

                recorder.start();
                setIsRecording(true);
                setFile(null);
                if(fileInputRef.current) fileInputRef.current.value = "";
                setError(null);
                setTranscript('');
            } catch (err) {
                console.error("Error accessing microphone:", err);
                setError("Could not access microphone. Please grant permission and try again.");
            }
        }
    };

    const handleTranscribe = async () => {
        if (!file) {
            setError('Please select or record an audio file.');
            return;
        }
        if (!process.env.API_KEY) {
            setError('API key is not set. Please set the API_KEY environment variable.');
            return;
        }

        setIsLoading(true);
        setError(null);
        setTranscript('');

        try {
            const result = await transcribeSpeech(file);
            setTranscript(result);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unknown error occurred.');
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleSaveToProject = () => {
        if (project && transcript) {
            const newAsset: Asset = {
                id: `asset-${Date.now()}`,
                type: 'text',
                content: transcript,
                prompt: `Transcription of ${file?.name || 'audio file'}`,
            };
            onUpdateProject({
                ...project,
                assets: [...project.assets, newAsset],
            });
            setTranscript('');
            setFile(null);
            if(fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    return (
        <div className="space-y-4">
            <label className="block text-lg font-medium text-gray-800 dark:text-gray-200">
                Transcribe Audio
            </label>
            <div className="flex flex-wrap items-center gap-4">
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="audio/*"
                    className="hidden"
                    id="audio-file-input"
                />
                <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isRecording}
                    className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    Choose File
                </button>
                <button
                    onClick={handleToggleRecording}
                    className={`px-4 py-2 rounded-md text-white font-medium transition-colors ${
                        isRecording 
                        ? 'bg-red-600 hover:bg-red-700' 
                        : 'bg-blue-600 hover:bg-blue-700'
                    }`}
                >
                    {isRecording ? 'Stop Recording' : 'Record Audio'}
                </button>
                {file && <span className="text-gray-600 dark:text-gray-400">{file.name}</span>}
            </div>
            <button
                onClick={handleTranscribe}
                disabled={isLoading || !file}
                className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-300 disabled:cursor-not-allowed"
            >
                {isLoading && <Spinner size="sm" />}
                <span className={isLoading ? 'ml-2' : ''}>Transcribe</span>
            </button>

             {isLoading && <div className="flex justify-center p-4"><Spinner /></div>}
            {error && <div className="p-4 bg-red-100 dark:bg-red-900/50 border border-red-400 text-red-700 dark:text-red-300 rounded-lg"><p>{error}</p></div>}
            {transcript && (
                <div className="space-y-4">
                     <h3 className="text-lg font-medium mb-2">Transcript</h3>
                    <textarea
                        readOnly
                        value={transcript}
                        className="w-full h-40 p-3 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg"
                    />
                    <button onClick={handleSaveToProject} className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-2 border border-transparent text-base font-medium rounded-md text-white bg-green-600 hover:bg-green-700">
                        Save to Project
                    </button>
                </div>
            )}
        </div>
    );
};


const AudioTools: React.FC<AudioToolProps> = ({ project, onUpdateProject }) => {
    const [activeTab, setActiveTab] = useState<'tts' | 'stt'>('tts');
    
    if (!project) {
        return (
            <div className="text-center p-8 bg-white dark:bg-gray-800 rounded-xl shadow-lg">
                <h2 className="text-xl font-semibold">No Project Selected</h2>
                <p className="mt-2 text-gray-600 dark:text-gray-400">Please go to the dashboard to create or select a project.</p>
            </div>
        );
    }

    const handleDeleteAsset = (assetId: string) => {
        if (project) {
            if (window.confirm('Are you sure you want to delete this asset?')) {
                const updatedAssets = project.assets.filter(a => a.id !== assetId);
                onUpdateProject({ ...project, assets: updatedAssets });
            }
        }
    };

    const audioAssets = project.assets.filter(asset => asset.type === 'audio');
    const textAssetsFromAudio = project.assets.filter(asset => asset.type === 'text' && asset.prompt?.startsWith('Transcription of'));

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Audio Tools</h1>
                <p className="mt-2 text-lg text-gray-600 dark:text-gray-400">Synthesize speech from text or transcribe audio files.</p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
                    <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                        <button
                            onClick={() => setActiveTab('tts')}
                            className={`${activeTab === 'tts' ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:border-gray-500'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                        >
                            Text-to-Speech
                        </button>
                        <button
                            onClick={() => setActiveTab('stt')}
                            className={`${activeTab === 'stt' ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:border-gray-500'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                        >
                            Speech-to-Text
                        </button>
                    </nav>
                </div>

                <div>
                    {activeTab === 'tts' && <TextToSpeech project={project} onUpdateProject={onUpdateProject} />}
                    {activeTab === 'stt' && <SpeechToText project={project} onUpdateProject={onUpdateProject} />}
                </div>
            </div>

            {(audioAssets.length > 0 || textAssetsFromAudio.length > 0) && (
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                    <h2 className="text-xl font-semibold mb-4">Saved Audio & Transcription Assets</h2>
                    <div className="space-y-4">
                        {audioAssets.map(asset => (
                            <div key={asset.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg group">
                                <div className="flex-1 overflow-hidden">
                                     <audio controls src={asset.content} className="w-full"></audio>
                                     {asset.prompt && <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 italic truncate">Prompt: "{asset.prompt}"</p>}
                                </div>
                                <button 
                                    onClick={() => handleDeleteAsset(asset.id)}
                                    className="p-2 ml-4 flex-shrink-0 bg-red-100 dark:bg-red-900/50 text-red-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100"
                                    aria-label="Delete asset"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                                </button>
                            </div>
                        ))}
                         {textAssetsFromAudio.map(asset => (
                            <div key={asset.id} className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg relative group">
                                <p className="text-sm font-semibold text-gray-600 dark:text-gray-300">Transcription:</p>
                                <p className="whitespace-pre-wrap text-gray-800 dark:text-gray-200">{asset.content}</p>
                                {asset.prompt && <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 italic">Source: "{asset.prompt.replace('Transcription of ', '')}"</p>}
                                <button 
                                    onClick={() => handleDeleteAsset(asset.id)}
                                    className="absolute top-2 right-2 p-1.5 bg-red-100 dark:bg-red-900/50 text-red-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100"
                                    aria-label="Delete asset"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default AudioTools;
