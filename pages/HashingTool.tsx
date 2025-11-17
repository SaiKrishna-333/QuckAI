
import React, { useState, useRef } from 'react';
import { generateSha256Hash } from '../utils/cryptoUtils';
import Spinner from '../components/Spinner';

const TextHasher: React.FC = () => {
    const [text, setText] = useState('');
    const [hash, setHash] = useState('');
    const [isCopied, setIsCopied] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const handleGenerateHash = async () => {
        if (!text) {
            setHash('');
            return;
        }
        setIsLoading(true);
        const generatedHash = await generateSha256Hash(text);
        setHash(generatedHash);
        setIsCopied(false);
        setIsLoading(false);
    };

    const handleCopy = () => {
        if (hash) {
            navigator.clipboard.writeText(hash);
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 2000); // Reset after 2 seconds
        }
    };

    return (
        <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200">Hash from Text</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">Generate a SHA-256 hash from any text content.</p>
            <textarea
                id="hashing-text-area"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Paste your text content here..."
                className="w-full h-48 p-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500"
                disabled={isLoading}
            />
            <button onClick={handleGenerateHash} disabled={isLoading || !text.trim()} className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-2 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50">
                {isLoading ? <Spinner size="sm" /> : "Generate Hash"}
            </button>
            {hash && (
                <div className="p-4 bg-gray-100 dark:bg-gray-900 rounded-lg space-y-2">
                    <p className="font-semibold text-sm">Generated Hash:</p>
                    <div className="flex items-center gap-4">
                        <code className="flex-1 p-2 bg-gray-200 dark:bg-gray-700 rounded break-all text-sm">{hash}</code>
                        <button onClick={handleCopy} className="px-3 py-1 bg-gray-300 dark:bg-gray-600 rounded-md text-sm hover:bg-gray-400 w-20">
                            {isCopied ? 'Copied!' : 'Copy'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};


const FileHasher: React.FC = () => {
    const [file, setFile] = useState<File | null>(null);
    const [hash, setHash] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isCopied, setIsCopied] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files && event.target.files[0]) {
            setFile(event.target.files[0]);
            setHash('');
            setError(null);
        }
    };

    const handleGenerateHash = () => {
        if (!file) {
            setError('Please select a file.');
            return;
        }
        setIsLoading(true);
        setError(null);
        setHash('');

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                if (e.target?.result instanceof ArrayBuffer) {
                    const generatedHash = await generateSha256Hash(e.target.result);
                    setHash(generatedHash);
                    setIsCopied(false);
                } else {
                    throw new Error("Failed to read file as ArrayBuffer.");
                }
            } catch (err) {
                 setError(err instanceof Error ? err.message : 'An unknown error occurred during hashing.');
            } finally {
                setIsLoading(false);
            }
        };
        reader.onerror = () => {
            setError("Error reading file.");
            setIsLoading(false);
        };
        reader.readAsArrayBuffer(file);
    };

    const handleCopy = () => {
        if (hash) {
            navigator.clipboard.writeText(hash);
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 2000);
        }
    };

    return (
         <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200">Hash from File</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">Generate a SHA-256 hash from a document or any other file.</p>
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
                id="hashing-file-input"
            />
            <div className="flex flex-wrap items-center gap-4">
                <button
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-500"
                >
                    Choose File
                </button>
                {file && <span className="text-gray-600 dark:text-gray-400">{file.name}</span>}
            </div>
             <button onClick={handleGenerateHash} disabled={isLoading || !file} className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-2 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50">
                {isLoading ? <Spinner size="sm" /> : "Generate Hash"}
            </button>
            {error && <div className="p-4 bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 rounded-lg">{error}</div>}
            {hash && (
                <div className="p-4 bg-gray-100 dark:bg-gray-900 rounded-lg space-y-2">
                    <p className="font-semibold text-sm">Generated Hash:</p>
                    <div className="flex items-center gap-4">
                        <code className="flex-1 p-2 bg-gray-200 dark:bg-gray-700 rounded break-all text-sm">{hash}</code>
                        <button onClick={handleCopy} className="px-3 py-1 bg-gray-300 dark:bg-gray-600 rounded-md text-sm hover:bg-gray-400 w-20">
                            {isCopied ? 'Copied!' : 'Copy'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

const HashingTool: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'text' | 'file'>('text');

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Document Hashing (SHA-256)</h1>
                <p className="mt-2 text-lg text-gray-600 dark:text-gray-400">Generate a secure SHA-256 hash from text or a file to verify data integrity.</p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg">
                 <div className="border-b border-gray-200 dark:border-gray-700">
                    <nav className="-mb-px flex space-x-8 px-6" aria-label="Tabs">
                        <button onClick={() => setActiveTab('text')} className={`${activeTab === 'text' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}>Hash Text</button>
                        <button onClick={() => setActiveTab('file')} className={`${activeTab === 'file' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}>Hash File</button>
                    </nav>
                </div>
                <div className="p-6">
                    {activeTab === 'text' && <TextHasher />}
                    {activeTab === 'file' && <FileHasher />}
                </div>
            </div>
        </div>
    );
};

export default HashingTool;
