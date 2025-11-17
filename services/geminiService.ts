
import { GoogleGenAI, Modality, Type, Content } from "@google/genai";
import { fileToBase64 } from "../utils/fileUtils";

if (!process.env.API_KEY) {
  console.warn("API_KEY environment variable not set. API calls will fail.");
}


/**
 * Continues a conversation using a chat history.
 * @param history The chat history.
 * @returns The model's next response as a string.
 */
export const continueChat = async (history: Content[]): Promise<string> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
    const chat = ai.chats.create({ model: 'gemini-2.5-flash', history });
    const response = await chat.sendMessage({ message: history[history.length - 1].parts[0].text! });
    return response.text;
  } catch (error) {
    console.error("Error continuing chat:", error);
    throw new Error("Failed to get chat response. Please check your API key.");
  }
};


/**
 * Summarizes a long piece of text.
 * @param text The text to summarize.
 * @returns A concise summary of the text.
 */
export const summarizeText = async (text: string): Promise<string> => {
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Please summarize the following text:\n\n${text}`,
        });
        return response.text;
    } catch (error) {
        console.error("Error summarizing text:", error);
        throw new Error("Failed to summarize text.");
    }
};

/**
 * Generates an image using the Imagen model.
 * @param prompt The text prompt describing the image to generate.
 * @returns A base64-encoded data URL of the generated image.
 */
export const generateImage = async (prompt: string): Promise<string> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
    const response = await ai.models.generateImages({
      model: 'imagen-4.0-generate-001',
      prompt: prompt,
      config: {
        numberOfImages: 1,
        outputMimeType: 'image/png',
        aspectRatio: '1:1',
      },
    });

    if (response.generatedImages && response.generatedImages.length > 0) {
      const base64ImageBytes = response.generatedImages[0].image.imageBytes;
      return `data:image/png;base64,${base64ImageBytes}`;
    }
    throw new Error("No image was generated.");

  } catch (error) {
    console.error("Error generating image:", error);
    throw new Error("Failed to generate image. This model may not be available in your region.");
  }
};

/**
 * Generates speech from text using the Gemini TTS model.
 * Supports both single and multi-speaker modes.
 * @param text The text to convert to speech.
 * @param mode The speaker mode ('single' or 'multi').
 * @returns A base64-encoded data URL of the generated audio.
 */
export const generateSpeech = async (text: string, mode: 'single' | 'multi'): Promise<string> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
    let speechConfig: any;

    if (mode === 'multi') {
      // Find unique speaker names from lines formatted as "Speaker: text"
      const speakerNames = [
        ...new Set(
          text
            .split('\n')
            .map(line => line.match(/^([^:]+):/)) // Match lines starting with "Speaker:"
            .filter(Boolean) // Filter out lines that don't match
            .map(match => match![1].trim()) // Extract the speaker name
        ),
      ];
      
      if (speakerNames.length !== 2) {
        throw new Error(
          "Multi-speaker generation requires exactly two speakers to be defined. Please format your text with two distinct names, e.g., 'Joe: ...' and 'Jane: ...'"
        );
      }

      const availableVoices = ['Kore', 'Puck'];
      const speakerVoiceConfigs = speakerNames.map((speaker, index) => ({
        speaker: speaker,
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: availableVoices[index] },
        },
      }));
      
      speechConfig = { multiSpeakerVoiceConfig: { speakerVoiceConfigs } };
    } else {
      speechConfig = {
        voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
      };
    }

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: speechConfig,
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (base64Audio) {
      const mimeType = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.mimeType || 'audio/mpeg';
      return `data:${mimeType};base64,${base64Audio}`;
    }
    throw new Error("No audio data was generated.");
  } catch (error) {
    console.error("Error generating speech:", error);
    if (error instanceof Error && error.message.includes("Multi-speaker generation requires")) {
        throw error; // Re-throw our custom validation error
    }
    throw new Error("Failed to generate speech. This model may not be available in your region.");
  }
};

/**
 * Transcribes speech from an audio file using a multimodal Gemini model.
 * @param audioFile The audio file to transcribe.
 * @returns The transcribed text.
 */
export const transcribeSpeech = async (audioFile: File): Promise<string> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
    const base64Audio = await fileToBase64(audioFile);
    const mimeType = audioFile.type;

    const audioPart = {
      inlineData: {
        mimeType,
        data: base64Audio,
      },
    };

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-pro', 
      contents: [{
        parts: [
          audioPart,
          { text: 'Please transcribe this audio.' },
        ],
      }],
    });

    return response.text;
  } catch (error) {
    console.error("Error transcribing speech:", error);
    throw new Error("Failed to transcribe audio. The file format may not be supported or the file is too large.");
  }
};

/**
 * Generates a video using the Veo model.
 * @param prompt The text prompt describing the video.
 * @param onProgress Callback to update the UI with loading messages.
 * @returns A promise that resolves to the downloadable video URI.
 */
export const generateVideo = async (prompt: string, onProgress: (message: string) => void): Promise<string> => {
  // Create a new instance right before the call to use the latest key
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

  try {
    onProgress("Starting video generation...");
    let operation = await ai.models.generateVideos({
      model: 'veo-3.1-fast-generate-preview',
      prompt: prompt,
      config: {
        numberOfVideos: 1,
        resolution: '720p',
        aspectRatio: '16:9'
      }
    });

    onProgress("Processing frames (this may take a few minutes)...");
    while (!operation.done) {
      await new Promise(resolve => setTimeout(resolve, 5000)); // Poll every 5 seconds
      operation = await ai.operations.getVideosOperation({ operation: operation });
    }

    onProgress("Finalizing video...");
    const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (downloadLink) {
      // Append the API key for fetching
      return `${downloadLink}&key=${process.env.API_KEY}`;
    } else {
      throw new Error("Video generation finished, but no download link was provided.");
    }
  } catch (error) {
    console.error("Error generating video:", error);
    // Rethrow to be caught by the component
    throw error;
  }
};


/**
 * Analyzes an image and returns descriptive tags.
 * Simulates the functionality of a CNN-based image tagger using Gemini's VLM capabilities.
 * @param base64Image The base64-encoded image string (without data URL prefix).
 * @param mimeType The MIME type of the image.
 * @returns A promise that resolves to an array of string tags.
 */
export const analyzeImage = async (
  base64Image: string,
  mimeType: string,
): Promise<string[]> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
    const imagePart = {
      inlineData: {
        mimeType,
        data: base64Image,
      },
    };

    const prompt = `Analyze the following image and act as an expert image analysis engine. Your task is to identify key objects, scenes, and concepts within the image. Return a JSON array of descriptive string tags. For example: ["cat", "wizard hat", "library", "books", "fantasy"]. Provide only the JSON array in your response.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-pro',
      contents: [{ parts: [imagePart, { text: prompt }] }],
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.STRING,
          },
        },
      },
    });

    const jsonResponse = JSON.parse(response.text);
    return jsonResponse as string[];
  } catch (error) {
    console.error("Error analyzing image:", error);
    throw new Error("Failed to analyze image. The model may have returned an unexpected format.");
  }
};


/**
 * Ranks text descriptions based on their similarity to a given image.
 * Simulates the functionality of a CLIP model using Gemini's multimodal capabilities.
 * @param base64Image The base64-encoded image string (without data URL prefix).
 * @param mimeType The MIME type of the image.
 * @param texts An array of text descriptions to rank.
 * @returns A promise that resolves to an array of objects, each containing a text and its relevance score.
 */
export const rankTextsForImage = async (
  base64Image: string,
  mimeType: string,
  texts: string[]
): Promise<{ text: string; score: number }[]> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
    const imagePart = {
      inlineData: {
        mimeType,
        data: base64Image,
      },
    };

    const prompt = `Given the following image and a list of text descriptions, please evaluate the relevance of each description to the image. Provide the response as a JSON array of objects, where each object has a "text" and a "score" key. The "text" key should be the original description, and the "score" key should be a relevance score from 0.0 to 1.0, where 1.0 is most relevant.

Texts to evaluate:
- ${texts.join('\n- ')}`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-pro',
      contents: [{ parts: [imagePart, { text: prompt }] }],
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              text: { type: Type.STRING },
              score: { type: Type.NUMBER },
            },
            required: ['text', 'score'],
          },
        },
      },
    });

    const jsonResponse = JSON.parse(response.text);
    return jsonResponse as { text: string; score: number }[];
  } catch (error) {
    console.error("Error ranking texts for image:", error);
    throw new Error("Failed to rank descriptions. The model may have returned an unexpected format.");
  }
};

/**
 * Detects the primary emotion from an image of a face.
 * @param base64Image The base64-encoded image string (without data URL prefix).
 * @param mimeType The MIME type of the image.
 * @returns A promise that resolves to the detected emotion as a string.
 */
export const detectEmotionFromImage = async (
  base64Image: string,
  mimeType: string,
): Promise<string> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
    const imagePart = {
      inlineData: {
        mimeType,
        data: base64Image,
      },
    };

    const prompt = `Analyze the facial expression in this image and identify the primary emotion. Respond with a single word only from this list: Happy, Sad, Angry, Surprised, Neutral, Fearful, Disgusted. If no clear face is detected, respond with 'No Face Detected'.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [{ parts: [imagePart, { text: prompt }] }],
    });

    return response.text.trim();
  } catch (error) {
    console.error("Error detecting emotion:", error);
    throw new Error("Failed to detect emotion. The model may have returned an unexpected format.");
  }
};

/**
 * Detects the overall sentiment of an image.
 * Simulates a Naive Bayes classifier for visual sentiment.
 * @param base64Image Base64 image data.
 * @param mimeType The image MIME type.
 * @returns The detected sentiment as a string ('Positive', 'Negative', 'Neutral').
 */
export const detectImageSentiment = async (base64Image: string, mimeType: string): Promise<string> => {
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
        const imagePart = { inlineData: { mimeType, data: base64Image } };
        const prompt = "Analyze the overall sentiment of this image. Consider the colors, objects, setting, and any depicted actions or expressions. Respond with only a single word: Positive, Negative, or Neutral.";
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [{ parts: [imagePart, { text: prompt }] }],
        });
        return response.text.trim();
    } catch (error) {
        console.error("Error detecting image sentiment:", error);
        throw new Error("Failed to detect image sentiment.");
    }
};

/**
 * Detects if a piece of text is toxic.
 * Simulates a Logistic Regression classifier for toxicity.
 * @param text The text to analyze.
 * @returns An object with a boolean `isToxic` and a `score`.
 */
export const detectToxicity = async (text: string): Promise<{ isToxic: boolean; score: number; }> => {
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
        const prompt = `Analyze the following text for toxicity. Toxicity includes hate speech, insults, threats, and sexually explicit language. Respond with a JSON object containing two keys: "isToxic" (a boolean) and "score" (a number from 0.0 to 1.0 representing the confidence of the toxicity assessment). Text to analyze: "${text}"`;
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        isToxic: { type: Type.BOOLEAN },
                        score: { type: Type.NUMBER },
                    },
                    required: ['isToxic', 'score'],
                },
            },
        });
        return JSON.parse(response.text);
    } catch (error) {
        console.error("Error detecting toxicity:", error);
        throw new Error("Failed to analyze text for toxicity.");
    }
};

/**
 * Predicts an engagement score for a piece of text.
 * Simulates a Linear Regression model for predicting a continuous value.
 * @param text The text to analyze.
 * @returns An object with a `score` (0-1) and an `explanation`.
 */
export const predictEngagementScore = async (text: string): Promise<{ score: number; explanation: string; }> => {
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
        const prompt = `Act as a social media expert. Analyze the following text and predict its potential engagement score on a scale from 0.0 to 1.0, where 0.0 is no engagement and 1.0 is viral. This simulates a regression model for predicting a continuous value. Provide a brief explanation for your score. Respond with a JSON object containing two keys: "score" (a number between 0.0 and 1.0) and "explanation" (a short string). Text to analyze: "${text}"`;
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        score: { type: Type.NUMBER },
                        explanation: { type: Type.STRING },
                    },
                    required: ['score', 'explanation'],
                },
            },
        });
        const result = JSON.parse(response.text);
        // Clamp score between 0 and 1
        result.score = Math.max(0, Math.min(1, result.score));
        return result;
    } catch (error) {
        console.error("Error predicting engagement score:", error);
        throw new Error("Failed to predict engagement score.");
    }
};

/**
 * Generates embeddings for a batch of texts.
 * @param texts An array of strings to embed.
 * @returns A promise that resolves to an array of embeddings (number arrays).
 */
export const embedContentBatch = async (texts: string[]): Promise<number[][]> => {
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
        
        // Per official SDK documentation, getGenerativeModel is the correct way
        // to interact with specific models, including embedding models.
        const model = ai.getGenerativeModel({ model: "text-embedding-004" });

        // Format the texts into the required request structure.
        const requests = texts.map(text => ({ content: text }));

        const result = await model.batchEmbedContents({ requests });

        return result.embeddings.map(e => e.values);
    } catch (error) {
        console.error("Error generating batch embeddings:", error);
        throw new Error("Failed to generate embeddings.");
    }
};

/**
 * Generates a descriptive name for a cluster of projects.
 * @param projectPrompts An array of prompts from the projects in the cluster.
 * @returns A short, descriptive name for the cluster.
 */
export const generateClusterName = async (projectPrompts: string[]): Promise<string> => {
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
        const prompt = `I have a cluster of project descriptions. Based on these descriptions, please generate a short, descriptive, and catchy title for the cluster (3-5 words max). Here are the project descriptions:\n\n- ${projectPrompts.slice(0, 5).join('\n- ')}\n\nRespond with only the title.`;
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });
        return response.text.trim().replace(/"/g, ''); // Clean up quotes
    } catch (error) {
        console.error("Error generating cluster name:", error);
        throw new Error("Failed to generate a name for the cluster.");
    }
};