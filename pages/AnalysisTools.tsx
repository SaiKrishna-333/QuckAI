import React, { useState } from 'react';
import { generateSha256Hash } from '../utils/cryptoUtils';
import { detectToxicity, predictEngagementScore } from '../services/geminiService';
import Spinner from '../components/Spinner';

const DocumentHasher: React.FC = () => {
    const [text, setText] = useState('');
    const [hash, setHash] = useState('');

    const handleGenerateHash = async () => {
        if (!text) {
            setHash('');
            return;
        }
        const generatedHash = await generateSha256Hash(text);
        setHash(generatedHash);
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(hash);
        alert('Hash copied to clipboard!');
    };

    return (
        <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200">Document Hashing (SHA-256)</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">Generate a secure SHA-256 hash for any text content. This is useful for verifying data integrity.</p>
            <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Paste your text content here..."
                className="w-full h-32 p-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
            <button onClick={handleGenerateHash} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Generate SHA-256 Hash</button>
            {hash && (
                <div className="p-4 bg-gray-100 dark:bg-gray-900 rounded-lg space-y-2">
                    <p className="font-semibold text-sm">Generated Hash:</p>
                    <div className="flex items-center gap-4">
                        <code className="flex-1 p-2 bg-gray-200 dark:bg-gray-700 rounded break-all text-sm">{hash}</code>
                        <button onClick={handleCopy} className="px-3 py-1 bg-gray-300 dark:bg-gray-600 rounded-md text-sm hover:bg-gray-400">Copy</button>
                    </div>
                </div>
            )}
        </div>
    );
};

const ToxicityDetector: React.FC = () => {
    const [text, setText] = useState('');
    const [result, setResult] = useState<{ isToxic: boolean; score: number } | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    const handleDetect = async () => {
        if (!text.trim()) return;
        setIsLoading(true);
        setError(null);
        setResult(null);
        try {
            const detectionResult = await detectToxicity(text);
            setResult(detectionResult);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred.');
        } finally {
            setIsLoading(false);
        }
    };
    
    return (
        <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200">Toxicity Detection (Logistic Regression)</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">Analyze text for toxicity, such as hate speech, insults, and threats. This simulates a toxicity classification model.</p>
            <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Enter text to analyze for toxicity..."
                className="w-full h-32 p-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500"
                disabled={isLoading}
            />
            <button onClick={handleDetect} disabled={isLoading || !text.trim()} className="px-6 py-2 bg-blue-600 text-white rounded-lg disabled:bg-blue-300">
                {isLoading ? <Spinner size="sm" /> : "Detect Toxicity"}
            </button>
             {error && <div className="p-4 bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 rounded-lg">{error}</div>}
            {result && (
                <div className={`p-4 rounded-lg ${result.isToxic ? 'bg-red-100 dark:bg-red-900/50' : 'bg-green-100 dark:bg-green-900/50'}`}>
                    <p className={`font-bold text-lg ${result.isToxic ? 'text-red-800 dark:text-red-200' : 'text-green-800 dark:text-green-200'}`}>
                        {result.isToxic ? 'Toxic Content Detected' : 'Content Appears Non-Toxic'}
                    </p>
                    <p className="text-sm">Confidence Score: {(result.score * 100).toFixed(1)}%</p>
                </div>
            )}
        </div>
    );
};

const EngagementPredictor: React.FC = () => {
    const [text, setText] = useState('');
    const [result, setResult] = useState<{ score: number; explanation: string } | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handlePredict = async () => {
        if (!text.trim()) return;
        setIsLoading(true);
        setError(null);
        setResult(null);
        try {
            const predictionResult = await predictEngagementScore(text);
            setResult(predictionResult);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200">Engagement Predictor (Linear Regression)</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">Predict a continuous engagement score for a social media post. This simulates a regression model to predict a value between 0.0 and 1.0.</p>
            <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Enter social media post text..."
                className="w-full h-32 p-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500"
                disabled={isLoading}
            />
            <button onClick={handlePredict} disabled={isLoading || !text.trim()} className="px-6 py-2 bg-blue-600 text-white rounded-lg disabled:bg-blue-300">
                {isLoading ? <Spinner size="sm" /> : "Predict Engagement Score"}
            </button>
            {error && <div className="p-4 bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 rounded-lg">{error}</div>}
            {result && (
                <div className="p-4 rounded-lg bg-gray-100 dark:bg-gray-900 space-y-3">
                    <p className="font-bold text-lg text-gray-800 dark:text-gray-200">
                        Predicted Engagement Score
                    </p>
                    <div className="flex items-center gap-4">
                         <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4">
                            <div
                                className="bg-gradient-to-r from-purple-400 to-blue-500 h-4 rounded-full"
                                style={{ width: `${result.score * 100}%` }}
                                role="progressbar"
                                aria-valuenow={result.score * 100}
                                aria-valuemin={0}
                                aria-valuemax={100}
                            ></div>
                        </div>
                        <span className="font-mono text-xl font-semibold text-blue-600 dark:text-blue-400">
                            {result.score.toFixed(2)}
                        </span>
                    </div>
                    <div>
                        <p className="font-semibold text-sm">Explanation:</p>
                        <p className="text-gray-600 dark:text-gray-400">{result.explanation}</p>
                    </div>
                </div>
            )}
        </div>
    );
};


const AnalysisTools: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'hashing' | 'toxicity' | 'engagement'>('hashing');

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Analysis Tools</h1>
                <p className="mt-2 text-lg text-gray-600 dark:text-gray-400">Advanced tools for content analysis and verification.</p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg">
                <div className="border-b border-gray-200 dark:border-gray-700">
                    <nav className="-mb-px flex space-x-8 px-6" aria-label="Tabs">
                        <button onClick={() => setActiveTab('hashing')} className={`${activeTab === 'hashing' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}>Document Hashing</button>
                        <button onClick={() => setActiveTab('toxicity')} className={`${activeTab === 'toxicity' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}>Toxicity Detection</button>
                        <button onClick={() => setActiveTab('engagement')} className={`${activeTab === 'engagement' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}>Engagement Predictor</button>
                    </nav>
                </div>
                <div className="p-6">
                    {activeTab === 'hashing' && <DocumentHasher />}
                    {activeTab === 'toxicity' && <ToxicityDetector />}
                    {activeTab === 'engagement' && <EngagementPredictor />}
                </div>
            </div>
        </div>
    );
};

export default AnalysisTools;