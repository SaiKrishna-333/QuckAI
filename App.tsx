
import React, { useState, useEffect } from 'react';
import { Page, Project } from './types';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import TextGeneration from './pages/TextGeneration';
import ImageGeneration from './pages/ImageGeneration';
import AudioTools from './pages/AudioTools';
import VideoGeneration from './pages/VideoGeneration';
import Roadmap from './pages/Roadmap';
import SentimentAnalysis from './pages/SentimentAnalysis';
import AnalysisTools from './pages/AnalysisTools';
import HashingTool from './pages/HashingTool';
import { DashboardIcon } from './components/icons/DashboardIcon';
import { TextIcon } from './components/icons/TextIcon';
import { ImageIcon } from './components/icons/ImageIcon';
import { AudioIcon } from './components/icons/AudioIcon';
import { VideoIcon } from './components/icons/VideoIcon';
import { RoadmapIcon } from './components/icons/RoadmapIcon';
import { SentimentIcon } from './components/icons/SentimentIcon';
import { AnalysisIcon } from './components/icons/AnalysisIcon';
import { HashingIcon } from './components/icons/HashingIcon';

// Mock Data for initial state, used if localStorage is empty
const initialProjects: Project[] = [
  {
    id: 'proj-1',
    title: 'Wizard Cat Blog Post',
    prompts: {
      text: 'Write a short, engaging blog post about a cat who is secretly a wizard.',
      image: 'A photorealistic image of a cat wearing a tiny wizard hat, sitting in a library.',
      tts: 'In a world of magic and mystery, one feline holds the key.',
      video: 'A cinematic shot of a cat wearing a tiny wizard hat, with glowing paws.',
    },
    assets: [
      { id: 'asset-1', type: 'image', content: 'https://placekitten.com/512/512', prompt: 'A photorealistic image of a cat wearing a tiny wizard hat.' },
      { id: 'asset-2', type: 'text', content: 'Barnaby the cat wasn\'t like other kittens. While his siblings chased yarn, Barnaby was busy studying ancient spells...', prompt: 'Write a blog post about a wizard cat.' },
    ],
    lastModified: new Date(Date.now() - 86400000), // 1 day ago
    lastActivePage: 'image',
  },
    {
    id: 'proj-2',
    title: 'Remote Work Campaign',
    prompts: {
      text: 'Create three social media captions about the benefits of remote work.',
      image: 'A minimalist graphic showing a person working comfortably from a home office.',
      tts: 'Discover a new way to work.',
      video: 'A time-lapse of a person working from home, showing a healthy work-life balance.',
    },
    assets: [],
    lastModified: new Date(Date.now() - 2 * 86400000), // 2 days ago
    lastActivePage: 'text',
  }
];


const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');
  const [projects, setProjects] = useState<Project[]>(() => {
    try {
      const saved = window.localStorage.getItem('quickai-projects');
      if (saved) {
        const parsedProjects = JSON.parse(saved) as any[];
        // Revive date objects from string representation
        return parsedProjects.map(p => ({ ...p, lastModified: new Date(p.lastModified) }));
      }
    } catch (error) {
      console.error("Failed to load projects from localStorage", error);
    }
    return initialProjects;
  });
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  // FIX: Corrected the malformed try-catch block inside useEffect. This was causing a major syntax error that broke variable scoping for the rest of the component, leading to multiple "Cannot find name" errors.
  useEffect(() => {
    try {
      window.localStorage.setItem('quickai-projects', JSON.stringify(projects));
    } catch (error) {
      console.error("Failed to save projects to localStorage", error);
    }
  }, [projects]);

  const selectedProject = selectedProjectId ? projects.find(p => p.id === selectedProjectId) : undefined;
  
  const handleUpdateProject = (updatedProject: Project) => {
    setProjects(prevProjects => 
      prevProjects.map(p => p.id === updatedProject.id ? { ...updatedProject, lastModified: new Date() } : p)
    );
  };
  
  const handleSetCurrentPage = (page: Page) => {
    if (selectedProjectId && !['dashboard', 'roadmap', 'analysis', 'sentiment', 'hashing'].includes(page)) {
        const projectToUpdate = projects.find(p => p.id === selectedProjectId);
        if (projectToUpdate && projectToUpdate.lastActivePage !== page) {
            handleUpdateProject({ ...projectToUpdate, lastActivePage: page });
        }
    }
    setCurrentPage(page);
  };

  const handleCreateProject = () => {
    const newProject: Project = {
      id: `proj-${Date.now()}`,
      title: 'Untitled Project',
      prompts: { text: '', image: '', tts: '', video: '' },
      assets: [],
      lastModified: new Date(),
      lastActivePage: 'text',
    };
    setProjects(prev => [newProject, ...prev]);
    setSelectedProjectId(newProject.id);
    setCurrentPage('text');
  };

  const handleSelectProject = (projectId: string) => {
    const project = projects.find(p => p.id === projectId);
    if (project) {
        setSelectedProjectId(projectId);
        const targetPage = project.lastActivePage && !['dashboard', 'roadmap', 'analysis', 'sentiment', 'hashing'].includes(project.lastActivePage) 
            ? project.lastActivePage 
            : 'text';
        setCurrentPage(targetPage);
    }
  };
  
  const backToDashboard = () => {
    setSelectedProjectId(null);
    setCurrentPage('dashboard');
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard projects={projects} onCreateProject={handleCreateProject} onSelectProject={handleSelectProject} onUpdateProject={handleUpdateProject} />;
      case 'text':
        return <TextGeneration project={selectedProject} onUpdateProject={handleUpdateProject} />;
      case 'image':
        return <ImageGeneration project={selectedProject} onUpdateProject={handleUpdateProject} />;
      case 'audio':
        return <AudioTools project={selectedProject} onUpdateProject={handleUpdateProject} />;
      case 'video':
        return <VideoGeneration project={selectedProject} onUpdateProject={handleUpdateProject} />;
      case 'sentiment':
        return <SentimentAnalysis />;
      case 'analysis':
        return <AnalysisTools />;
      case 'hashing':
        return <HashingTool />;
      case 'roadmap':
        return <Roadmap />;
      default:
        return <Dashboard projects={projects} onCreateProject={handleCreateProject} onSelectProject={handleSelectProject} onUpdateProject={handleUpdateProject} />;
    }
  };

  const MobileNav: React.FC<{ currentPage: Page, setCurrentPage: (page: Page) => void }> = ({ currentPage, setCurrentPage }) => {
    const navItems = [
        { id: 'dashboard', icon: <DashboardIcon />, label: 'Dashboard' },
        { id: 'text', icon: <TextIcon />, label: 'Text' },
        { id: 'image', icon: <ImageIcon />, label: 'Image' },
        { id: 'audio', icon: <AudioIcon />, label: 'Audio' },
        { id: 'video', icon: <VideoIcon />, label: 'Video' },
        { id: 'sentiment', icon: <SentimentIcon />, label: 'Emotion' },
        { id: 'analysis', icon: <AnalysisIcon />, label: 'Analysis' },
        { id: 'hashing', icon: <HashingIcon />, label: 'Hashing' },
    ] as const;

    return (
        <div className="fixed bottom-0 left-0 z-50 w-full h-16 bg-white border-t border-gray-200 dark:bg-gray-800 dark:border-gray-600 md:hidden">
            <div className="grid h-full max-w-lg grid-cols-8 mx-auto font-medium">
                {navItems.map(item => (
                    <button
                        key={item.id}
                        type="button"
                        onClick={() => setCurrentPage(item.id)}
                        className={`inline-flex flex-col items-center justify-center px-2 hover:bg-gray-50 dark:hover:bg-gray-700 group ${currentPage === item.id ? 'text-blue-600 dark:text-blue-500' : 'text-gray-500 dark:text-gray-400'}`}
                    >
                        {React.cloneElement(item.icon, { className: 'w-6 h-6 mb-1' })}
                        <span className="text-xs">{item.label}</span>
                    </button>
                ))}
            </div>
        </div>
    );
};

  const showProjectHeader = selectedProject && !['dashboard', 'roadmap', 'sentiment', 'analysis', 'hashing'].includes(currentPage);

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <Sidebar currentPage={currentPage} setCurrentPage={handleSetCurrentPage} />
      <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 mb-16 md:mb-0">
        {showProjectHeader && (
          <div className="mb-6 pb-4 border-b border-gray-200 dark:border-gray-700">
            <button
              onClick={backToDashboard}
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline mb-2"
            >
              &larr; Back to Projects
            </button>
            <h2 className="text-xl font-semibold truncate" title={selectedProject.title}>
              Editing: {selectedProject.title}
            </h2>
          </div>
        )}
        {renderPage()}
      </main>
      <MobileNav currentPage={currentPage} setCurrentPage={handleSetCurrentPage} />
    </div>
  );
};

export default App;