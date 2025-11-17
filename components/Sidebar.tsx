import React from 'react';
import { Page } from '../types';
import { DashboardIcon } from './icons/DashboardIcon';
import { TextIcon } from './icons/TextIcon';
import { ImageIcon } from './icons/ImageIcon';
import { AudioIcon } from './icons/AudioIcon';
import { VideoIcon } from './icons/VideoIcon';
import { RoadmapIcon } from './icons/RoadmapIcon';
import { SentimentIcon } from './icons/SentimentIcon';
import { AnalysisIcon } from './icons/AnalysisIcon';
import { HashingIcon } from './icons/HashingIcon';

interface SidebarProps {
  currentPage: Page;
  setCurrentPage: (page: Page) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentPage, setCurrentPage }) => {
  const navItems = [
    { id: 'dashboard', icon: <DashboardIcon />, label: 'Dashboard' },
    { id: 'text', icon: <TextIcon />, label: 'Text & Chat' },
    { id: 'image', icon: <ImageIcon />, label: 'Image Gen & Analysis' },
    { id: 'audio', icon: <AudioIcon />, label: 'Audio Tools' },
    { id: 'video', icon: <VideoIcon />, label: 'Video Generation' },
    { id: 'sentiment', icon: <SentimentIcon />, label: 'Emotion Detection' },
    { id: 'analysis', icon: <AnalysisIcon />, label: 'Content Analysis' },
    { id: 'hashing', icon: <HashingIcon />, label: 'Document Hashing' },
    { id: 'roadmap', icon: <RoadmapIcon />, label: 'Roadmap' },
  ] as const;

  return (
    <aside className="hidden md:flex flex-col w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-center h-16 border-b border-gray-200 dark:border-gray-700">
        <h1 className="text-2xl font-bold text-blue-600 dark:text-blue-500">QuickAI</h1>
      </div>
      <nav className="flex-1 px-4 py-6 space-y-2">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setCurrentPage(item.id)}
            className={`flex items-center w-full px-4 py-2 text-sm font-medium rounded-lg transition-colors duration-150 ${
              currentPage === item.id
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300'
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200'
            }`}
          >
            {React.cloneElement(item.icon, { className: "w-5 h-5 mr-3" })}
            <span>{item.label}</span>
          </button>
        ))}
      </nav>
    </aside>
  );
};

export default Sidebar;