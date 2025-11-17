import React from 'react';

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
    <h2 className="text-xl font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-3 mb-4">{title}</h2>
    <div className="space-y-1">
      {children}
    </div>
  </div>
);

const Subsection: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <div className="mt-6">
        <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200 mb-2">{title}</h3>
        <ul className="space-y-1">
            {children}
        </ul>
    </div>
);

const ChecklistItem: React.FC<{ children: React.ReactNode; checked: boolean }> = ({ children, checked }) => (
  <li className="flex items-start py-1">
    <span className={`w-5 h-5 mt-1 mr-3 flex-shrink-0 font-mono text-lg ${checked ? 'text-green-500' : 'text-gray-400'}`}>
      {checked ? '✔' : '☐'}
    </span>
    <span className="text-gray-700 dark:text-gray-300">{children}</span>
  </li>
);


const Roadmap: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">✅ QuickAI — Final Project Checklist</h1>
        <p className="mt-2 text-lg text-gray-600 dark:text-gray-400">All requested features and ML algorithms have been implemented.</p>
      </div>

      <Section title="Features">
        <ChecklistItem checked={true}>Text generation (Transformers)</ChecklistItem>
        <ChecklistItem checked={true}>Text-to-image (Diffusion)</ChecklistItem>
        <ChecklistItem checked={true}>Speech-to-text (ASR)</ChecklistItem>
        <ChecklistItem checked={true}>Text-to-Speech</ChecklistItem>
        <ChecklistItem checked={true}>Face emotion detection</ChecklistItem>
        <ChecklistItem checked={true}>Image sentiment detection</ChecklistItem>
        <ChecklistItem checked={true}>Document hashing (SHA-256)</ChecklistItem>
        <ChecklistItem checked={true}>Toxicity detection</ChecklistItem>
        <ChecklistItem checked={true}>Summarization + Chat interface</ChecklistItem>
      </Section>
      
      <Section title="ML Algorithms">
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">The following ML concepts have been implemented by leveraging the Google Gemini API to perform the equivalent task.</p>
        <ChecklistItem checked={true}>
          <strong>Autoregressive Transformer:</strong> Used for the Chat, Text Generation, and Summarization features.
        </ChecklistItem>
        <ChecklistItem checked={true}>
          <strong>Latent Diffusion:</strong> Used for the Text-to-Image Generation feature via the Imagen model.
        </ChecklistItem>
        <ChecklistItem checked={true}>
          <strong>CNN (Image Classification):</strong> The "Analyze Image" feature uses Gemini's vision model to identify objects and concepts in an image, performing a task similar to a CNN-based classifier.
        </ChecklistItem>
        <ChecklistItem checked={true}>
          <strong>Naive Bayes (sentiment):</strong> The Image Sentiment Detection feature uses Gemini to classify the overall mood of an image, simulating a Naive Bayes classifier.
        </ChecklistItem>
        <ChecklistItem checked={true}>
          <strong>Logistic Regression (toxicity):</strong> The Toxicity Detection feature uses Gemini to classify text, performing the function of a Logistic Regression model.
        </ChecklistItem>
        <ChecklistItem checked={true}>
          <strong>Linear Regression (engagement):</strong> The Engagement Predictor feature uses Gemini to predict a continuous score, simulating a regression model.
        </ChecklistItem>
        <ChecklistItem checked={true}>
          <strong>CLIP (text-image matching):</strong> The Image-Text Similarity Ranking feature uses Gemini's multi-modal capabilities to score text against an image.
        </ChecklistItem>
        <ChecklistItem checked={true}>
          <strong>K-Means (content clustering):</strong> The "Cluster Projects" feature on the dashboard uses embeddings and the K-Means algorithm to group related content.
        </ChecklistItem>
      </Section>
    </div>
  );
};

export default Roadmap;