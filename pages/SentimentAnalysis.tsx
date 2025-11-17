import React, { useState, useRef, useEffect, useCallback } from 'react';
import { detectEmotionFromImage } from '../services/geminiService';
import Spinner from '../components/Spinner';

const EmotionToEmoji: { [key: string]: string } = {
  Happy: '😄',
  Sad: '😢',
  Angry: '😠',
  Surprised: '😮',
  Neutral: '😐',
  Fearful: '😨',
  Disgusted: '🤢',
  'No Face Detected': '🤷',
};

const SentimentAnalysis: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [result, setResult] = useState<{ image: string, emotion: string } | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const startCamera = useCallback(async () => {
    // Clear previous stream first
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
    setError(null);
    setResult(null);
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
      if (err instanceof DOMException && err.name === "NotAllowedError") {
        setError("Camera permission was denied. Please allow camera access in your browser settings to use this feature.");
      } else {
        setError("Could not access the camera. Please ensure it is not in use by another application.");
      }
    }
  }, [stream]);

  useEffect(() => {
    // This effect should only run once to initialize the camera.
    let mediaStream: MediaStream;
    const initializeCamera = async () => {
        try {
            mediaStream = await navigator.mediaDevices.getUserMedia({ video: true });
            setStream(mediaStream);
            if (videoRef.current) {
                videoRef.current.srcObject = mediaStream;
            }
        } catch (err) {
            console.error("Error accessing camera:", err);
            if (err instanceof DOMException && err.name === "NotAllowedError") {
                setError("Camera permission was denied. Please allow camera access in your browser settings to use this feature.");
            } else {
                setError("Could not access the camera. Please ensure it is not in use by another application.");
            }
        }
    };
    
    initializeCamera();

    return () => {
      // This cleanup function will be called when the component unmounts.
      if (mediaStream) {
        mediaStream.getTracks().forEach(track => track.stop());
      }
    };
  }, []); // Empty dependency array ensures this runs only once on mount.

  const handleDetectEmotion = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    if (!process.env.API_KEY) {
      setError('API key is not set. Please set the API_KEY environment variable.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setResult(null);

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext('2d');
    context?.drawImage(video, 0, 0, canvas.width, canvas.height);

    const dataUrl = canvas.toDataURL('image/jpeg');
    const [header, base64Data] = dataUrl.split(',');
    const mimeTypeMatch = header.match(/:(.*?);/);
    if (!base64Data || !mimeTypeMatch) {
      setError('Failed to capture image from video.');
      setIsLoading(false);
      return;
    }
    const mimeType = mimeTypeMatch[1];
    
    try {
      const emotion = await detectEmotionFromImage(base64Data, mimeType);
      setResult({ image: dataUrl, emotion });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Live Emotion Detector</h1>
        <p className="mt-2 text-lg text-gray-600 dark:text-gray-400">Analyze facial expressions in real-time using your camera.</p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 space-y-4">
        <div className="relative aspect-video bg-gray-900 rounded-lg overflow-hidden flex items-center justify-center">
          <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
          {!stream && !error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
                <Spinner />
                <p className="mt-2">Starting camera...</p>
            </div>
          )}
        </div>
        
        {error && !stream && (
            <div className="p-4 bg-yellow-100 dark:bg-yellow-900/50 border border-yellow-400 text-yellow-800 dark:text-yellow-300 rounded-lg">
              <p className="font-bold">Camera Error</p>
              <p>{error}</p>
              <button onClick={startCamera} className="mt-2 px-3 py-1 bg-yellow-200 dark:bg-yellow-700 rounded-md text-sm font-medium">Retry</button>
            </div>
        )}
        
        <button
          onClick={handleDetectEmotion}
          disabled={isLoading || !stream}
          className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-300 disabled:cursor-not-allowed"
        >
          {isLoading && <Spinner size="sm" />}
          <span className={isLoading ? 'ml-2' : ''}>Detect Emotion</span>
        </button>
      </div>

      {(isLoading || error || result) && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Analysis Result</h2>
          {isLoading && (
            <div className="flex justify-center items-center h-40">
              <Spinner />
            </div>
          )}
          {error && (
            <div className="p-4 bg-red-100 dark:bg-red-900/50 border border-red-400 text-red-700 dark:text-red-300 rounded-lg">
              <p className="font-bold">Error</p>
              <p>{error}</p>
            </div>
          )}
          {result && (
            <div className="flex flex-col sm:flex-row items-center gap-6">
                <img src={result.image} alt="Captured frame for emotion detection" className="rounded-lg shadow-md w-full sm:w-64 h-auto" />
                <div className="text-center sm:text-left">
                    <p className="text-lg text-gray-600 dark:text-gray-400">Detected Emotion:</p>
                    <p className="text-4xl font-bold text-gray-900 dark:text-white flex items-center justify-center sm:justify-start gap-4">
                        <span>{result.emotion}</span>
                        <span className="text-5xl">{EmotionToEmoji[result.emotion] || '🧠'}</span>
                    </p>
                </div>
            </div>
          )}
        </div>
      )}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};

export default SentimentAnalysis;