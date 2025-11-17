
import React, { useState, useRef, useEffect } from 'react';
import { Project } from '../types';
import { embedContentBatch, generateClusterName } from '../services/geminiService';
import { kmeans } from '../utils/kmeans';
import Spinner from '../components/Spinner';
import { ExportIcon } from '../components/icons/ExportIcon';
import JSZip from 'jszip';
import saveAs from 'file-saver';

interface DashboardProps {
  projects: Project[];
  onCreateProject: () => void;
  onSelectProject: (projectId: string) => void;
  onUpdateProject: (project: Project) => void;
}

interface ProjectCardProps {
  project: Project;
  onSelect: () => void;
  onUpdate: (project: Project) => void;
}

interface Cluster {
  name: string;
  projectIds: string[];
}

const ProjectCard: React.FC<ProjectCardProps> = ({ project, onSelect, onUpdate }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(project.title);
  const [isExporting, setIsExporting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isEditing]);

  const handleSave = () => {
    if (title.trim() && title.trim() !== project.title) {
      onUpdate({ ...project, title: title.trim() });
    } else {
      setTitle(project.title);
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      setTitle(project.title);
      setIsEditing(false);
    }
  };

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
  };
  
  const handleExport = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExporting(true);
    
    const zip = new JSZip();

    // Add prompts to a text file
    const promptsContent = `Project: ${project.title}\n\n--- PROMPTS ---\n\n[Text Prompt]:\n${project.prompts.text}\n\n[Image Prompt]:\n${project.prompts.image}\n\n[TTS Prompt]:\n${project.prompts.tts}\n\n[Video Prompt]:\n${project.prompts.video}`;
    zip.file("prompts.txt", promptsContent);
    
    const assetsFolder = zip.folder("assets");
    if (assetsFolder) {
        for (const [index, asset] of project.assets.entries()) {
            const fileExtension = asset.type === 'text' ? 'txt' :
                                  asset.type === 'image' ? 'png' :
                                  asset.type === 'audio' ? 'mp3' : 
                                  asset.type === 'video' ? 'mp4' : 'bin';
            const fileName = `${asset.type}_${index + 1}.${fileExtension}`;
            
            if (asset.type === 'text') {
                assetsFolder.file(fileName, asset.content);
            } else {
                // Handle data URLs for image, audio, video
                try {
                    const response = await fetch(asset.content);
                    const blob = await response.blob();
                    assetsFolder.file(fileName, blob);
                } catch (error) {
                    console.error(`Failed to fetch and add asset ${asset.id} to zip`, error);
                    // Add a file indicating the failure
                    assetsFolder.file(`${fileName}.error.txt`, `Failed to download asset from source.\nID: ${asset.id}`);
                }
            }
        }
    }

    try {
        const content = await zip.generateAsync({ type: "blob" });
        const safeTitle = project.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        saveAs(content, `QuickAI_Project_${safeTitle}.zip`);
    } catch (error) {
        console.error("Failed to generate zip file", error);
        alert("An error occurred while creating the export file.");
    }

    setIsExporting(false);
  };

  return (
    <div
      onClick={isEditing ? undefined : onSelect}
      className={`bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 text-left w-full h-full flex flex-col hover:ring-2 hover:ring-blue-500 transition-all duration-200 ${!isEditing && 'cursor-pointer'}`}
    >
      <div className="flex-grow">
        <div className="flex justify-between items-start gap-2">
            {isEditing ? (
              <input
                ref={inputRef}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={handleSave}
                onKeyDown={handleKeyDown}
                onClick={(e) => e.stopPropagation()}
                className="text-lg font-semibold bg-gray-100 dark:bg-gray-700 p-1 -m-1 rounded w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                aria-label="Edit project title"
              />
            ) : (
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 break-words flex-grow" title={project.title}>
                {project.title}
              </h3>
            )}
             <div className="flex-shrink-0 flex items-center gap-1">
                <button
                  onClick={handleEditClick}
                  aria-label={`Edit title for ${project.title}`}
                  className="p-1 text-gray-400 hover:text-blue-500 rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-blue-500"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L15.232 5.232z"></path></svg>
                </button>
                 <button
                  onClick={handleExport}
                  disabled={isExporting}
                  aria-label={`Export ${project.title}`}
                  title="Export Project"
                  className="p-1 text-gray-400 hover:text-green-500 rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-green-500 disabled:opacity-50"
                >
                  {isExporting ? <Spinner size="sm" /> : <ExportIcon />}
                </button>
            </div>
          </div>
      </div>
      <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
        {project.assets.length} asset{project.assets.length !== 1 && 's'}
      </p>
      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
        Last modified: {project.lastModified.toLocaleDateString()}
      </p>
    </div>
  );
};


const Dashboard: React.FC<DashboardProps> = ({ projects, onCreateProject, onSelectProject, onUpdateProject }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [clusters, setClusters] = useState<Cluster[] | null>(null);
  const [isClustering, setIsClustering] = useState(false);
  const [clusteringError, setClusteringError] = useState<string | null>(null);

  const sortedProjects = [...projects].sort((a, b) => b.lastModified.getTime() - a.lastModified.getTime());

  const filteredProjects = sortedProjects.filter(project =>
    project.title.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  const handleClusterProjects = async () => {
    if (projects.length < 2) {
        setClusteringError("You need at least two projects to create clusters.");
        return;
    }
    setIsClustering(true);
    setClusteringError(null);
    setClusters(null);

    try {
        const projectsWithPrompts = projects.filter(p => p.prompts.text || p.prompts.image || p.prompts.tts);
        const promptsToEmbed = projectsWithPrompts.map(p => ({
            id: p.id,
            text: `${p.title}. ${p.prompts.text} ${p.prompts.image} ${p.prompts.tts}`.trim(),
        }));
        
        const embeddings = await embedContentBatch(promptsToEmbed.map(p => p.text));
        
        const data = promptsToEmbed.map((p, i) => ({ id: p.id, embedding: embeddings[i] }));

        const numClusters = Math.min(projectsWithPrompts.length, 3); // Create up to 3 clusters
        const kmeansResult = kmeans(data.map(d => d.embedding), numClusters);
        
        const newClusters: Cluster[] = [];
        for (let i = 0; i < numClusters; i++) {
            const projectIndices = kmeansResult.assignments
                .map((assignment, index) => (assignment === i ? index : -1))
                .filter(index => index !== -1);
            
            if (projectIndices.length > 0) {
                const projectIdsInCluster = projectIndices.map(index => data[index].id);
                const projectPromptsForNaming = projectIdsInCluster.map(id => {
                    const proj = projects.find(p => p.id === id);
                    return `${proj?.title}. ${proj?.prompts.text}`.trim();
                });
                
                const clusterName = await generateClusterName(projectPromptsForNaming);

                newClusters.push({ name: clusterName, projectIds: projectIdsInCluster });
            }
        }
        setClusters(newClusters);
    } catch (err) {
        setClusteringError(err instanceof Error ? err.message : 'An unknown clustering error occurred.');
    } finally {
        setIsClustering(false);
    }
  };

  const renderProjectList = (projectList: Project[]) => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {projectList.map(project => (
        <ProjectCard 
          key={project.id} 
          project={project} 
          onSelect={() => onSelectProject(project.id)}
          onUpdate={onUpdateProject}
        />
      ))}
    </div>
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Your Projects</h1>
        <p className="mt-2 text-lg text-gray-600 dark:text-gray-400">Create a new project or continue working on an existing one.</p>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <button
          onClick={onCreateProject}
          className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <svg className="-ml-1 mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
          </svg>
          Start a New Project
        </button>
        {projects.length > 0 && (
          <div className="relative sm:max-w-xs w-full">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                </svg>
            </div>
            <input
                type="text"
                placeholder="Search projects..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md leading-5 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                aria-label="Search projects"
            />
          </div>
        )}
      </div>

       <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex-1">
            <h2 className="text-xl font-semibold">Recent Projects</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">Sorted by last modified date.</p>
          </div>
          {projects.length > 1 && (
              <button
                onClick={handleClusterProjects}
                disabled={isClustering}
                className="w-full sm:w-auto inline-flex items-center justify-center px-5 py-2 border border-transparent text-sm font-medium rounded-md text-purple-700 bg-purple-100 hover:bg-purple-200 dark:bg-purple-900/50 dark:text-purple-300 dark:hover:bg-purple-900 disabled:opacity-50"
              >
                  {isClustering ? <Spinner size="sm" /> : null}
                  <span className={isClustering ? 'ml-2' : ''}>{clusters ? 'Reset View' : 'Cluster Projects (K-Means)'}</span>
              </button>
          )}
      </div>

       {isClustering && <div className="flex justify-center p-8"><Spinner /></div>}
        {clusteringError && <div className="p-4 bg-red-100 dark:bg-red-900/50 border border-red-400 text-red-700 dark:text-red-300 rounded-lg"><p>{clusteringError}</p></div>}
        
      <div>
        {projects.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl shadow-lg">
            <p className="text-gray-500 dark:text-gray-400">You haven't created any projects yet.</p>
          </div>
        ) : clusters ? (
            <div className="space-y-8">
                {clusters.map((cluster, index) => {
                    const projectsInCluster = cluster.projectIds.map(id => projects.find(p => p.id === id)).filter(Boolean) as Project[];
                    return (
                        <div key={index}>
                            <h3 className="text-lg font-semibold mb-3 text-purple-800 dark:text-purple-300">{cluster.name}</h3>
                            {renderProjectList(projectsInCluster)}
                        </div>
                    );
                })}
            </div>
        ) : filteredProjects.length > 0 ? (
          renderProjectList(filteredProjects)
        ) : (
          <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl shadow-lg">
            <p className="text-gray-500 dark:text-gray-400">No projects found matching your search.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;