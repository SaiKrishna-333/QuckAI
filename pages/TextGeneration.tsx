
import React, { useState, useEffect, useRef } from 'react';
import { continueChat, summarizeText } from '../services/geminiService';
import Spinner from '../components/Spinner';
import { Project, Asset } from '../types';
import { Content } from '@google/genai';

interface TextGenerationProps {
    project: Project | undefined;
    onUpdateProject: (updatedProject: Project) => void;
}

interface ChatProps extends TextGenerationProps {}

interface SummarizerProps extends TextGenerationProps {}

const Chat: React.FC<ChatProps> = ({ project, onUpdateProject }) => {
    const [prompt, setPrompt] = useState('');
    const [chatHistory, setChatHistory] = useState<Content[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const chatEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setChatHistory([]);
        setPrompt('');
    }, [project]);
    
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [chatHistory]);

    const handleSend = async () => {
        const trimmedPrompt = prompt.trim();
        if (!trimmedPrompt || isLoading) return;
        
        if (!process.env.API_KEY) {
            setError('API key is not set. Please set the API_KEY environment variable.');
            return;
        }

        setIsLoading(true);
        setError(null);

        const userMessage: Content = { role: 'user', parts: [{ text: trimmedPrompt }] };
        const newHistory = [...chatHistory, userMessage];
        setChatHistory(newHistory);
        setPrompt('');

        try {
            const responseText = await continueChat(newHistory);
            const modelMessage: Content = { role: 'model', parts: [{ text: responseText }] };
            setChatHistory(prev => [...prev, modelMessage]);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
            setError(errorMessage);
            setChatHistory(prev => prev.slice(0, -1)); 
        } finally {
            setIsLoading(false);
        }
    };

    const getFormattedChatContent = () => {
        return chatHistory.map(c => `**${c.role === 'user' ? 'You' : 'AI'}:**\n${c.parts[0].text}`).join('\n\n---\n\n');
    }

    const handleSaveToProject = () => {
        if (project && chatHistory.length > 0) {
            const chatContent = getFormattedChatContent();
            const newAsset: Asset = {
                id: `asset-${Date.now()}`,
                type: 'text',
                content: chatContent,
                prompt: `Chat session from ${new Date().toLocaleDateString()}`,
            };
            onUpdateProject({
                ...project,
                assets: [...project.assets, newAsset],
            });
            alert('Chat session saved to project!');
        }
    };
    
    return (
        <div className="flex flex-col h-full">
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-gray-900 rounded-t-lg">
                {chatHistory.map((item, index) => (
                    <div key={index} className={`flex ${item.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-xl p-3 rounded-lg ${item.role === 'user' ? 'bg-blue-500 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200'}`}>
                            <p className="whitespace-pre-wrap">{item.parts[0].text}</p>
                        </div>
                    </div>
                ))}
                 {isLoading && !error && (
                    <div className="flex justify-start">
                        <div className="max-w-xl p-3 rounded-lg bg-gray-200 dark:bg-gray-700">
                           <Spinner size="sm" />
                        </div>
                    </div>
                )}
                <div ref={chatEndRef} />
            </div>
            {error && <div className="p-4 bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 rounded-b-lg m-4">{error}</div>}
            <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex items-center gap-2 flex-wrap">
                <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                    placeholder="Type your message..."
                    className="flex-1 p-2 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 min-w-[200px]"
                    rows={1}
                    disabled={isLoading}
                />
                <button onClick={handleSend} disabled={isLoading || !prompt.trim()} className="px-5 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50">Send</button>
                <button onClick={handleSaveToProject} disabled={chatHistory.length === 0} className="px-5 py-2 bg-green-600 text-white rounded-lg disabled:opacity-50">Save</button>
            </div>
        </div>
    );
};

const Summarizer: React.FC<SummarizerProps> = ({ project, onUpdateProject }) => {
    const [textToSummarize, setTextToSummarize] = useState('');
    const [summary, setSummary] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSummarize = async () => {
        if (!textToSummarize.trim()) return;
        setIsLoading(true);
        setError(null);
        setSummary('');
        try {
            const result = await summarizeText(textToSummarize);
            setSummary(result);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSaveToProject = () => {
        if (project && summary) {
            const newAsset: Asset = {
                id: `asset-${Date.now()}`,
                type: 'text',
                content: summary,
                prompt: `Summary of: "${textToSummarize.substring(0, 50)}..."`,
            };
            onUpdateProject({ ...project, assets: [...project.assets, newAsset] });
            alert('Summary saved to project!');
        }
    };

    return (
        <div className="space-y-4">
            <textarea
                value={textToSummarize}
                onChange={(e) => setTextToSummarize(e.target.value)}
                placeholder="Paste the text you want to summarize here..."
                className="w-full h-48 p-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500"
                disabled={isLoading}
            />
            <button onClick={handleSummarize} disabled={isLoading || !textToSummarize.trim()} className="px-6 py-2 bg-blue-600 text-white rounded-lg disabled:bg-blue-300">
                {isLoading ? <Spinner size="sm" /> : "Summarize"}
            </button>
            {error && <div className="p-4 bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 rounded-lg">{error}</div>}
            {summary && (
                <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg space-y-3">
                    <h3 className="font-semibold">Summary:</h3>
                    <p className="whitespace-pre-wrap">{summary}</p>
                    <div className="flex flex-wrap gap-2">
                      <button onClick={handleSaveToProject} className="px-6 py-2 bg-green-600 text-white rounded-lg">Save to Project</button>
                    </div>
                </div>
            )}
        </div>
    );
};

const TextGeneration: React.FC<TextGenerationProps> = ({ project, onUpdateProject }) => {
    const [activeTab, setActiveTab] = useState<'chat' | 'summarize'>('chat');

    if (!project) {
        return (
            <div className="text-center p-8 bg-white dark:bg-gray-800 rounded-xl shadow-lg">
                <h2 className="text-xl font-semibold">No Project Selected</h2>
                <p className="mt-2 text-gray-600 dark:text-gray-400">Please go to the dashboard to create or select a project.</p>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Chat & Summarize</h1>
                <p className="mt-2 text-lg text-gray-600 dark:text-gray-400">Engage in a conversation or summarize long documents.</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg">
                <div className="border-b border-gray-200 dark:border-gray-700">
                    <nav className="-mb-px flex space-x-8 px-6" aria-label="Tabs">
                        <button onClick={() => setActiveTab('chat')} className={`${activeTab === 'chat' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}>Chat</button>
                        <button onClick={() => setActiveTab('summarize')} className={`${activeTab === 'summarize' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}>Summarization</button>
                    </nav>
                </div>
                <div className="p-6">
                    {activeTab === 'chat' && <Chat project={project} onUpdateProject={onUpdateProject} />}
                    {activeTab === 'summarize' && <Summarizer project={project} onUpdateProject={onUpdateProject} />}
                </div>
            </div>
        </div>
    );
};

export default TextGeneration;
