import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { 
  DndContext, 
  DragEndEvent, 
  DragOverlay, 
  DragStartEvent,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { 
  Plus, 
  User, 
  Calendar, 
  Clock, 
  AlertCircle,
  CheckCircle2,
  PlayCircle,
  Bug,
  Edit2,
  Trash2,
  X,
  Save,
  Search,
  Filter,
  FolderOpen,
  BarChart3,
  Settings,
  MessageCircle,
  Send,
  Minimize2,
  Maximize2,
  Bot,
  ChevronDown
} from 'lucide-react';
import './App.css';

// Types
interface Task {
  id: string;
  title: string;
  description?: string;
  status: 'todo' | 'inprogress' | 'testing' | 'completed';
  priority: 'P1' | 'P2' | 'P3' | 'P4';
  tags: string[];
  dueStatus: 'today' | 'overdue' | 'upcoming';
  assignee?: string;
  assigned_to?: string;
  project?: string;
  project_color?: string;
  category?: string;
  deadline?: Date;
  created_at: Date;
  created_by: string;
  user_id: string;
}

interface Column {
  id: string;
  title: string;
  icon: React.ReactNode;
  color: string;
  tasks: Task[];
}

interface User {
  id: string;
  username: string;
  email: string;
  full_name: string;
  role: string;
  avatar: string;
  status?: 'online' | 'offline' | 'away';
  color?: string;
}

interface ChatMessage {
  id: string;
  user_id: string;
  username: string;
  message: string;
  timestamp: string;
  avatar: string;
}

interface TeamMember {
  id: string;
  name: string;
  avatar: string;
  role: string;
  status: 'online' | 'offline' | 'away';
  color: string;
}

interface Project {
  id: string;
  name: string;
  description: string;
  color: string;
  status: 'active' | 'completed' | 'paused';
  created_by: string;
  user_id: string;
  created_at: string;
  updated_at: string;
}

// API Configuration
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3001';
const API = `${BACKEND_URL}/api`;

// Set up axios defaults
axios.defaults.headers.common['Content-Type'] = 'application/json';

const setAuthToken = (token: string | null) => {
  if (token) {
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete axios.defaults.headers.common['Authorization'];
  }
};

// Team Members Data - Will be populated from API
const DEFAULT_TEAM_MEMBERS: TeamMember[] = [
  {
    id: '1',
    name: 'Benedikt Thomas',
    avatar: '👨‍💻',
    role: 'Project Lead',
    status: 'online',
    color: 'bg-blue-500'
  },
  {
    id: '2', 
    name: 'Moritz Lange',
    avatar: '👨‍💼',
    role: 'Team Lead',
    status: 'online',
    color: 'bg-green-500'
  },
  {
    id: '3',
    name: 'Simon Lange', 
    avatar: '👨‍🎨',
    role: 'Project Admin',
    status: 'away',
    color: 'bg-purple-500'
  }
];

// Task Create Modal Component
const TaskCreateModal: React.FC<{ 
  isOpen: boolean; 
  onClose: () => void; 
  onSave: (newTask: Partial<Task>) => void;
  defaultStatus: string;
  projects: Project[];
  teamMembers: TeamMember[];
}> = ({ isOpen, onClose, onSave, defaultStatus, projects, teamMembers }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'P2' as Task['priority'],
    tags: '',
    dueStatus: 'upcoming' as Task['dueStatus'],
    assignee: '',
    project_id: projects.length > 0 ? projects[0].id : '',
    deadline: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) return;
    
    onSave({
      ...formData,
      status: defaultStatus as Task['status'],
      tags: formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0),
      deadline: formData.deadline ? new Date(formData.deadline) : undefined
    });
    
    // Reset form
    setFormData({
      title: '',
      description: '',
      priority: 'P2',
      tags: '',
      dueStatus: 'upcoming',
      assignee: '',
      project_id: projects.length > 0 ? projects[0].id : '',
      deadline: ''
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white/20 backdrop-blur-xl border border-white/30 rounded-2xl p-6 w-full max-w-lg shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[#f3f4f6] text-lg font-semibold">Create New Task</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[#f3f4f6] text-sm font-medium mb-2">
              Title *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({...formData, title: e.target.value})}
              className="w-full px-3 py-2 bg-white/20 backdrop-blur-md border border-white/30 rounded-lg text-white focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-400/50"
              required
              placeholder="Enter task title"
            />
          </div>
          
          <div>
            <label className="block text-[#f3f4f6] text-sm font-medium mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              className="w-full px-3 py-2 bg-white/20 backdrop-blur-md border border-white/30 rounded-lg text-white focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-400/50"
              rows={3}
              placeholder="Describe the task..."
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[#f3f4f6] text-sm font-medium mb-2">
                Priority
              </label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({...formData, priority: e.target.value as Task['priority']})}
                className="w-full px-3 py-2 bg-white/20 backdrop-blur-md border border-white/30 rounded-lg text-white focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-400/50"
              >
                <option value="P1">P1 - Critical</option>
                <option value="P2">P2 - High</option>
                <option value="P3">P3 - Medium</option>
                <option value="P4">P4 - Low</option>
              </select>
            </div>
            
            <div>
              <label className="block text-[#f3f4f6] text-sm font-medium mb-2">
                Due Status
              </label>
              <select
                value={formData.dueStatus}
                onChange={(e) => setFormData({...formData, dueStatus: e.target.value as Task['dueStatus']})}
                className="w-full px-3 py-2 bg-white/20 backdrop-blur-md border border-white/30 rounded-lg text-white focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-400/50"
              >
                <option value="upcoming">Upcoming</option>
                <option value="today">Today</option>
                <option value="overdue">Overdue</option>
              </select>
            </div>
          </div>
          
          {projects.length > 0 && (
            <div>
              <label className="block text-[#f3f4f6] text-sm font-medium mb-2">
                Project
              </label>
              <select
                value={formData.project_id}
                onChange={(e) => setFormData({...formData, project_id: e.target.value})}
                className="w-full px-3 py-2 bg-white/20 backdrop-blur-md border border-white/30 rounded-lg text-white focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-400/50"
              >
                {projects.map(project => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          
          <div>
            <label className="block text-[#f3f4f6] text-sm font-medium mb-2">
              Tags (comma-separated)
            </label>
            <input
              type="text"
              value={formData.tags}
              onChange={(e) => setFormData({...formData, tags: e.target.value})}
              className="w-full px-3 py-2 bg-white/20 backdrop-blur-md border border-white/30 rounded-lg text-white focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-400/50"
              placeholder="frontend, backend, urgent"
            />
          </div>
          
          <div>
            <label className="block text-[#f3f4f6] text-sm font-medium mb-2">
              Assignee
            </label>
            <div className="relative">
              <select
                value={formData.assignee}
                onChange={(e) => setFormData({...formData, assignee: e.target.value})}
                className="w-full px-3 py-2 bg-[#2a2a2a] border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500 appearance-none"
              >
                <option value="">Select team member</option>
                {teamMembers.map(member => (
                  <option key={member.id} value={member.name}>
                    {member.avatar} {member.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </div>
          
          <div>
            <label className="block text-[#f3f4f6] text-sm font-medium mb-2">
              Deadline
            </label>
            <input
              type="datetime-local"
              value={formData.deadline}
              onChange={(e) => setFormData({...formData, deadline: e.target.value})}
              className="w-full px-3 py-2 bg-white/20 backdrop-blur-md border border-white/30 rounded-lg text-white focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-400/50"
            />
          </div>
          
          <div className="flex items-center justify-end gap-2 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Create Task
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Project Modal Component
const ProjectModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSave: (projectData: Partial<Project>) => void;
  projects: Project[];
  editProject?: Project | null;
  onEditProject?: (project: Project) => void;
  onDeleteProject?: (projectId: string) => void;
}> = ({ isOpen, onClose, onSave, projects, editProject, onEditProject, onDeleteProject }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: 'blue',
    status: 'active' as Project['status']
  });

  useEffect(() => {
    if (editProject) {
      setFormData({
        name: editProject.name,
        description: editProject.description,
        color: editProject.color,
        status: editProject.status
      });
    } else {
      setFormData({
        name: '',
        description: '',
        color: 'blue',
        status: 'active'
      });
    }
  }, [editProject]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;
    
    onSave(formData);
    onClose();
  };

  const projectColors = [
    { value: 'blue', label: 'Blue', class: 'bg-blue-500' },
    { value: 'green', label: 'Green', class: 'bg-green-500' },
    { value: 'purple', label: 'Purple', class: 'bg-purple-500' },
    { value: 'orange', label: 'Orange', class: 'bg-orange-500' },
    { value: 'red', label: 'Red', class: 'bg-red-500' },
    { value: 'pink', label: 'Pink', class: 'bg-pink-500' },
    { value: 'indigo', label: 'Indigo', class: 'bg-indigo-500' },
    { value: 'teal', label: 'Teal', class: 'bg-teal-500' }
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white/20 backdrop-blur-xl border border-white/30 rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[#f3f4f6] text-lg font-semibold">
            {editProject ? 'Edit Project' : 'Manage Projects'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Project Form */}
        <form onSubmit={handleSubmit} className="space-y-4 mb-6">
          <div>
            <label className="block text-[#f3f4f6] text-sm font-medium mb-2">
              Project Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              className="w-full px-3 py-2 bg-white/20 backdrop-blur-md border border-white/30 rounded-lg text-white focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-400/50"
              required
              placeholder="Enter project name"
            />
          </div>
          
          <div>
            <label className="block text-[#f3f4f6] text-sm font-medium mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              className="w-full px-3 py-2 bg-white/20 backdrop-blur-md border border-white/30 rounded-lg text-white focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-400/50"
              rows={3}
              placeholder="Describe the project..."
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[#f3f4f6] text-sm font-medium mb-2">
                Color
              </label>
              <div className="grid grid-cols-4 gap-2">
                {projectColors.map(color => (
                  <button
                    key={color.value}
                    type="button"
                    onClick={() => setFormData({...formData, color: color.value})}
                    className={`w-8 h-8 rounded-full ${color.class} ${
                      formData.color === color.value ? 'ring-2 ring-white' : ''
                    }`}
                  />
                ))}
              </div>
            </div>
            
            <div>
              <label className="block text-[#f3f4f6] text-sm font-medium mb-2">
                Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({...formData, status: e.target.value as Project['status']})}
                className="w-full px-3 py-2 bg-white/20 backdrop-blur-md border border-white/30 rounded-lg text-white focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-400/50"
              >
                <option value="active">Active</option>
                <option value="completed">Completed</option>
                <option value="paused">Paused</option>
              </select>
            </div>
          </div>
          
          <div className="flex items-center justify-end gap-2 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
            >
              <Save className="w-4 h-4" />
              {editProject ? 'Update' : 'Create'} Project
            </button>
          </div>
        </form>
        
        {/* Projects List */}
        <div className="border-t border-gray-700 pt-4">
          <h3 className="text-[#f3f4f6] text-md font-medium mb-4">Existing Projects</h3>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {projects.map(project => {
              const colorClass = projectColors.find(c => c.value === project.color)?.class || 'bg-gray-500';
              return (
                <div key={project.id} className="flex items-center justify-between p-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-lg hover:bg-white/15 transition-all duration-300">
                  <div className="flex items-center gap-3">
                    <div className={`w-4 h-4 rounded-full ${colorClass}`} />
                    <div>
                      <div className="text-white font-medium">{project.name}</div>
                      <div className="text-gray-400 text-sm">{project.description}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      project.status === 'active' ? 'bg-green-600 text-white' :
                      project.status === 'completed' ? 'bg-blue-600 text-white' :
                      'bg-yellow-600 text-white'
                    }`}>
                      {project.status}
                    </span>
                    <div className="flex gap-1">
                      <button
                        onClick={() => onEditProject?.(project)}
                        className="text-gray-400 hover:text-white p-1"
                        title="Edit project"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          if (window.confirm('Are you sure you want to delete this project?')) {
                            onDeleteProject?.(project.id);
                          }
                        }}
                        className="text-gray-400 hover:text-red-400 p-1"
                        title="Delete project"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

// Analytics Dashboard Component
const AnalyticsDashboard: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  tasks: Task[];
  projects: Project[];
}> = ({ isOpen, onClose, tasks, projects }) => {
  if (!isOpen) return null;
  
  // Calculate analytics
  const taskStats = {
    total: tasks.length,
    todo: tasks.filter(t => t.status === 'todo').length,
    inprogress: tasks.filter(t => t.status === 'inprogress').length,
    testing: tasks.filter(t => t.status === 'testing').length,
    completed: tasks.filter(t => t.status === 'completed').length,
    overdue: tasks.filter(t => t.dueStatus === 'overdue').length
  };
  
  const priorityStats = {
    P1: tasks.filter(t => t.priority === 'P1').length,
    P2: tasks.filter(t => t.priority === 'P2').length,
    P3: tasks.filter(t => t.priority === 'P3').length,
    P4: tasks.filter(t => t.priority === 'P4').length
  };
  
  const projectStats = {
    total: projects.length,
    active: projects.filter(p => p.status === 'active').length,
    completed: projects.filter(p => p.status === 'completed').length,
    paused: projects.filter(p => p.status === 'paused').length
  };
  
  const completionRate = taskStats.total > 0 ? Math.round((taskStats.completed / taskStats.total) * 100) : 0;
  
  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6 w-full max-w-6xl max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-[#f3f4f6] text-2xl font-semibold">Analytics Dashboard</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Task Statistics */}
          <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-300">
            <h3 className="text-[#f3f4f6] text-lg font-medium mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Task Statistics
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Total Tasks</span>
                <span className="text-white font-medium">{taskStats.total}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">To Do</span>
                <span className="text-gray-300 font-medium">{taskStats.todo}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">In Progress</span>
                <span className="text-orange-400 font-medium">{taskStats.inprogress}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Testing</span>
                <span className="text-yellow-400 font-medium">{taskStats.testing}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Completed</span>
                <span className="text-green-400 font-medium">{taskStats.completed}</span>
              </div>
              <div className="flex justify-between items-center border-t border-gray-600 pt-3">
                <span className="text-gray-400">Overdue</span>
                <span className="text-red-400 font-medium">{taskStats.overdue}</span>
              </div>
            </div>
          </div>
          
          {/* Priority Distribution */}
          <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-300">
            <h3 className="text-[#f3f4f6] text-lg font-medium mb-4">Priority Distribution</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-red-400 flex items-center gap-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  P1 (High)
                </span>
                <span className="text-white font-medium">{priorityStats.P1}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-red-300 flex items-center gap-2">
                  <div className="w-3 h-3 bg-red-400 rounded-full"></div>
                  P1 (High)
                </span>
                <span className="text-white font-medium">{priorityStats.P1}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-yellow-400 flex items-center gap-2">
                  <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                  P2 (Medium)
                </span>
                <span className="text-white font-medium">{priorityStats.P2}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-green-400 flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  P3 (Low)
                </span>
                <span className="text-white font-medium">{priorityStats.P3}</span>
              </div>
            </div>
          </div>
          
          {/* Project Statistics */}
          <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-300">
            <h3 className="text-[#f3f4f6] text-lg font-medium mb-4 flex items-center gap-2">
              <FolderOpen className="w-5 h-5" />
              Project Statistics
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Total Projects</span>
                <span className="text-white font-medium">{projectStats.total}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-green-400">Active</span>
                <span className="text-white font-medium">{projectStats.active}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-blue-400">Completed</span>
                <span className="text-white font-medium">{projectStats.completed}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-yellow-400">Paused</span>
                <span className="text-white font-medium">{projectStats.paused}</span>
              </div>
            </div>
          </div>
          
          {/* Completion Rate */}
          <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-300">
            <h3 className="text-[#f3f4f6] text-lg font-medium mb-4">Completion Rate</h3>
            <div className="flex items-center justify-center">
              <div className="relative w-32 h-32">
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-3xl font-bold text-white">{completionRate}%</span>
                </div>
                <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r="45"
                    fill="none"
                    stroke="#374151"
                    strokeWidth="8"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="45"
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="8"
                    strokeDasharray={`${completionRate * 2.83} 283`}
                    strokeLinecap="round"
                  />
                </svg>
              </div>
            </div>
            <p className="text-gray-400 text-center mt-4">
              {taskStats.completed} of {taskStats.total} tasks completed
            </p>
          </div>
          
          {/* Recent Activity */}
          <div className="bg-[#2a2a2a] rounded-lg p-6 md:col-span-2">
            <h3 className="text-[#f3f4f6] text-lg font-medium mb-4">Task Status Overview</h3>
            <div className="grid grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-400 mb-1">{taskStats.todo}</div>
                <div className="text-sm text-gray-500">To Do</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-400 mb-1">{taskStats.inprogress}</div>
                <div className="text-sm text-gray-500">In Progress</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-400 mb-1">{taskStats.testing}</div>
                <div className="text-sm text-gray-500">Testing</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-400 mb-1">{taskStats.completed}</div>
                <div className="text-sm text-gray-500">Completed</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Task Edit Modal Component
const TaskEditModal: React.FC<{ 
  task: Task; 
  isOpen: boolean; 
  onClose: () => void; 
  onSave: (updatedTask: Partial<Task>) => void; 
  onDelete: (taskId: string) => void; 
  teamMembers: TeamMember[];
}> = ({ task, isOpen, onClose, onSave, onDelete, teamMembers }) => {
  const [formData, setFormData] = useState({
    title: task.title,
    description: task.description || '',
    priority: task.priority,
    tags: task.tags.join(', '),
    dueStatus: task.dueStatus,
    assignee: task.assignee || ''
  });

  // Update form data when task changes
  useEffect(() => {
    setFormData({
      title: task.title,
      description: task.description || '',
      priority: task.priority,
      tags: task.tags.join(', '),
      dueStatus: task.dueStatus,
      assignee: task.assignee || ''
    });
  }, [task]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...formData,
      tags: formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0)
    });
    onClose();
  };

  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this task?')) {
      onDelete(task.id);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6 w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[#f3f4f6] text-lg font-semibold">Edit Task</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[#f3f4f6] text-sm font-medium mb-2">
              Title
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({...formData, title: e.target.value})}
              className="w-full px-3 py-2 bg-white/20 backdrop-blur-md border border-white/30 rounded-lg text-white focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-400/50"
              required
            />
          </div>
          
          <div>
            <label className="block text-[#f3f4f6] text-sm font-medium mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              className="w-full px-3 py-2 bg-white/20 backdrop-blur-md border border-white/30 rounded-lg text-white focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-400/50"
              rows={3}
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[#f3f4f6] text-sm font-medium mb-2">
                Priority
              </label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({...formData, priority: e.target.value as Task['priority']})}
                className="w-full px-3 py-2 bg-white/20 backdrop-blur-md border border-white/30 rounded-lg text-white focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-400/50"
              >
                <option value="P1">P1 - Critical</option>
                <option value="P2">P2 - High</option>
                <option value="P3">P3 - Medium</option>
                <option value="P4">P4 - Low</option>
              </select>
            </div>
            
            <div>
              <label className="block text-[#f3f4f6] text-sm font-medium mb-2">
                Due Status
              </label>
              <select
                value={formData.dueStatus}
                onChange={(e) => setFormData({...formData, dueStatus: e.target.value as Task['dueStatus']})}
                className="w-full px-3 py-2 bg-white/20 backdrop-blur-md border border-white/30 rounded-lg text-white focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-400/50"
              >
                <option value="upcoming">Upcoming</option>
                <option value="today">Today</option>
                <option value="overdue">Overdue</option>
              </select>
            </div>
          </div>
          
          <div>
            <label className="block text-[#f3f4f6] text-sm font-medium mb-2">
              Tags (comma-separated)
            </label>
            <input
              type="text"
              value={formData.tags}
              onChange={(e) => setFormData({...formData, tags: e.target.value})}
              className="w-full px-3 py-2 bg-white/20 backdrop-blur-md border border-white/30 rounded-lg text-white focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-400/50"
              placeholder="frontend, backend, urgent"
            />
          </div>
          
          <div>
            <label className="block text-[#f3f4f6] text-sm font-medium mb-2">
              Assignee
            </label>
            <div className="relative">
              <select
                value={formData.assignee}
                onChange={(e) => setFormData({...formData, assignee: e.target.value})}
                className="w-full px-3 py-2 bg-[#2a2a2a] border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500 appearance-none"
              >
                <option value="">Select team member</option>
                {teamMembers.map(member => (
                  <option key={member.id} value={member.name}>
                    {member.avatar} {member.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </div>
          
          <div className="flex items-center justify-between pt-4">
            <button
              type="button"
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </button>
            
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
              >
                <Save className="w-4 h-4" />
                Save
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

// Task Card Component
const TaskCard: React.FC<{ task: Task; isDragging?: boolean; onEdit: (task: Task) => void; teamMembers: TeamMember[] }> = ({ task, isDragging, onEdit, teamMembers }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'P1': return 'bg-red-500';
      case 'P1': return 'bg-red-400';
      case 'P2': return 'bg-yellow-500';
      case 'P3': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getDueStatusColor = (status: string) => {
    switch (status) {
      case 'today': return 'text-orange-400';
      case 'overdue': return 'text-red-400';
      case 'upcoming': return 'text-gray-400';
      default: return 'text-gray-400';
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`
        bg-white/20 backdrop-blur-lg rounded-xl p-5 mb-4 cursor-grab active:cursor-grabbing
        hover:bg-white/25 transition-all duration-300 transform-gpu
        border border-white/20 hover:border-white/30 shadow-lg hover:shadow-xl
        hover:scale-105 hover:-translate-y-1
        ${isDragging ? 'opacity-50' : ''}
      `}
    >
      <div className="flex items-start justify-between mb-3">
        <h3 className="text-white text-base font-semibold leading-6 flex-1">
          {task.title}
        </h3>
        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getPriorityColor(task.priority)} text-white ml-2 shadow-sm`}>
          {task.priority}
        </span>
      </div>
      
      {task.description && (
        <p className="text-gray-300 text-sm mb-4 line-clamp-2 leading-relaxed">
          {task.description}
        </p>
      )}
      
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {task.tags.map((tag, index) => (
            <span
              key={index}
              className="px-3 py-1 bg-gradient-to-r from-blue-500 to-blue-600 text-white text-xs rounded-full shadow-sm"
            >
              {tag}
            </span>
          ))}
        </div>
        
        <div className="flex items-center gap-2">
          <span className={`text-xs ${getDueStatusColor(task.dueStatus)}`}>
            {task.dueStatus}
          </span>
          <Clock className="w-3 h-3 text-gray-500" />
          
          {/* Assignee Avatar */}
          {task.assignee && (
            <div className="relative">
              {(() => {
                const assignedMember = teamMembers.find(m => m.name === task.assignee);
                return assignedMember ? (
                  <div className={`w-6 h-6 ${assignedMember.color} rounded-full flex items-center justify-center text-xs`} title={assignedMember.name}>
                    {assignedMember.avatar}
                  </div>
                ) : (
                  <div className="w-6 h-6 bg-gray-500 rounded-full flex items-center justify-center text-xs" title={task.assignee}>
                    👤
                  </div>
                );
              })()}
            </div>
          )}
          
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit(task);
            }}
            className="text-gray-300 hover:text-white transition-all duration-300 p-2 rounded-lg hover:bg-white/10 hover:scale-110"
          >
            <Edit2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

// Column Component
const KanbanColumn: React.FC<{ 
  column: Column; 
  onAddTask: (columnId: string) => void;
  onEditTask: (task: Task) => void;
  teamMembers: TeamMember[];
}> = ({ 
  column, 
  onAddTask,
  onEditTask,
  teamMembers
}) => {
  const { isOver, setNodeRef } = useDroppable({
    id: column.id,
  });

  const style = {
    backgroundColor: isOver ? 'rgba(255, 255, 255, 0.15)' : undefined,
  };

  return (
    <div 
      ref={setNodeRef}
      style={style}
      className="bg-white/15 backdrop-blur-xl rounded-2xl p-6 min-h-[600px] flex flex-col border border-white/25 shadow-2xl hover:shadow-3xl transition-all duration-500"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`p-3 rounded-xl ${column.color} shadow-lg`}>
            {column.icon}
          </div>
          <h2 className="text-white font-semibold text-lg">{column.title}</h2>
          <span className="bg-white/30 backdrop-blur-sm text-white px-3 py-1 rounded-full text-sm font-medium">
            {column.tasks.length}
          </span>
        </div>
      </div>
      
      <div className="flex-1">
        <SortableContext items={column.tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
          {column.tasks.map((task) => (
            <TaskCard key={task.id} task={task} onEdit={onEditTask} teamMembers={teamMembers} />
          ))}
        </SortableContext>
        {column.tasks.length === 0 && (
          <div className="text-center py-8 text-gray-400">
            <div className="text-sm">No tasks yet</div>
          </div>
        )}
      </div>
      
      <button
        onClick={() => onAddTask(column.id)}
        className="mt-6 w-full p-4 border-2 border-dashed border-white/30 rounded-xl 
                   hover:border-white/50 hover:bg-white/20 transition-all duration-300
                   flex items-center justify-center gap-2 text-gray-300 hover:text-white hover:scale-105 hover:shadow-lg"
      >
        <Plus className="w-4 h-4" />
        Add Task
      </button>
    </div>
  );
};

// Floating Chat Bot Component
const FloatingChatBot: React.FC<{
  user: User;
  messages: ChatMessage[];
  onSendMessage: (message: string) => void;
}> = ({ user, messages, onSendMessage }) => {
  const [newMessage, setNewMessage] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (newMessage.trim()) {
      onSendMessage(newMessage.trim());
      setNewMessage('');
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Chat Window */}
      {isOpen && (
        <div className="mb-4 w-80 h-96 bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-5 fade-in duration-300">
          {/* Chat Header */}
          <div className="p-4 border-b border-white/10 flex items-center justify-between bg-gradient-to-r from-blue-500/20 to-purple-600/20">
            <div className="flex items-center gap-2">
              <Bot className="w-5 h-5 text-blue-400" />
              <h3 className="text-white font-medium">AI Assistant</h3>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 p-4 space-y-3 overflow-y-auto h-64">
            {messages.length === 0 ? (
              <div className="text-center text-gray-400 py-8">
                <Bot className="w-12 h-12 mx-auto mb-3 text-blue-400" />
                <p className="text-sm">Hello! I'm your AI assistant.</p>
                <p className="text-xs mt-1">Ask me anything about your tasks and projects!</p>
              </div>
            ) : (
              messages.map((msg) => (
                <div key={msg.id} className={`flex items-start gap-2 ${msg.user_id === 'ai_assistant' ? 'flex-row-reverse' : ''}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${
                    msg.user_id === 'ai_assistant' 
                      ? 'bg-gradient-to-r from-blue-500 to-purple-600' 
                      : 'bg-gradient-to-r from-green-500 to-blue-500'
                  }`}>
                    {msg.avatar}
                  </div>
                  <div className={`flex-1 ${msg.user_id === 'ai_assistant' ? 'text-right' : ''}`}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-white text-sm font-medium">{msg.username}</span>
                      <span className="text-gray-400 text-xs">
                        {new Date(msg.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <div className={`inline-block px-3 py-2 rounded-lg text-sm ${
                      msg.user_id === 'ai_assistant'
                        ? 'bg-blue-500/20 text-blue-100 border border-blue-500/30'
                        : 'bg-white/10 text-gray-300 border border-white/20'
                    }`}>
                      {msg.message}
                    </div>
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Message Input */}
          <div className="p-4 border-t border-white/10">
            <form onSubmit={handleSendMessage} className="flex gap-2">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Ask me anything..."
                className="flex-1 px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-400/50 text-sm"
              />
              <button
                type="submit"
                className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white px-3 py-2 rounded-lg transition-all duration-300 hover:shadow-lg"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Floating Chat Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-14 h-14 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 rounded-full shadow-2xl flex items-center justify-center transition-all duration-300 hover:scale-110 hover:shadow-3xl"
      >
        {isOpen ? (
          <X className="w-6 h-6 text-white" />
        ) : (
          <Bot className="w-6 h-6 text-white" />
        )}
      </button>
    </div>
  );
};

// Sidebar Component
const Sidebar: React.FC<{
  user: User;
  teamMembers: TeamMember[];
}> = ({ user, teamMembers }) => {
  return (
    <div className="w-64 bg-gradient-to-b from-gray-900/60 to-gray-800/60 backdrop-blur-xl h-screen p-6 flex flex-col border-r border-white/20">
      {/* User Profile */}
      <div className="mb-6">
        <div className="flex items-center gap-3 p-4 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl hover:bg-white/15 transition-all duration-300">
          <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-lg">
            {user.avatar}
          </div>
          <div>
            <h3 className="text-white font-medium">{user.full_name}</h3>
            <p className="text-gray-400 text-sm">{user.role}</p>
          </div>
        </div>
      </div>

      {/* Team Members */}
      <div className="flex-1">
        <h4 className="text-white font-medium mb-3 flex items-center gap-2">
          <User className="w-4 h-4" />
          Team Members
        </h4>
        <div className="space-y-2">
          {teamMembers.map((member) => (
            <div key={member.id} className="flex items-center gap-3 p-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-lg hover:bg-white/15 transition-all duration-300">
              <div className="relative">
                <div className={`w-8 h-8 ${member.color} rounded-full flex items-center justify-center text-sm`}>
                  {member.avatar}
                </div>
                <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-gray-800 ${
                  member.status === 'online' ? 'bg-green-500' :
                  member.status === 'away' ? 'bg-yellow-500' : 'bg-gray-500'
                }`} />
              </div>
              <div className="flex-1">
                <div className="text-white text-sm font-medium">{member.name}</div>
                <div className="text-gray-400 text-xs">{member.role}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* AI Assistant Info */}
      <div className="mt-6 p-4 bg-gradient-to-r from-blue-500/20 to-purple-600/20 border border-blue-500/30 rounded-xl">
        <div className="flex items-center gap-2 mb-2">
          <Bot className="w-5 h-5 text-blue-400" />
          <h4 className="text-white font-medium">AI Assistant</h4>
        </div>
        <p className="text-gray-300 text-sm">
          Click the floating bot button to chat with your AI assistant!
        </p>
      </div>
    </div>
  );
};

// Search and Filter Component
const SearchAndFilter: React.FC<{
  searchTerm: string;
  onSearchChange: (value: string) => void;
  priorityFilter: string;
  onPriorityChange: (value: string) => void;
  statusFilter: string;
  onStatusChange: (value: string) => void;
}> = ({ searchTerm, onSearchChange, priorityFilter, onPriorityChange, statusFilter, onStatusChange }) => {
  return (
    <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 mb-6 border border-white/20 shadow-2xl hover:shadow-3xl transition-all duration-500">
      <div className="flex flex-col lg:flex-row gap-4 items-center">
        {/* Search Bar */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search tasks..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-white/10 backdrop-blur-lg border border-white/20 rounded-xl text-white placeholder-gray-300 focus:outline-none focus:border-blue-400 focus:bg-white/15 focus:ring-2 focus:ring-blue-400/50 transition-all duration-300"
          />
        </div>
        
        {/* Priority Filter */}
        <div className="flex items-center gap-2">
          <Filter className="text-gray-400 w-4 h-4" />
          <select
            value={priorityFilter}
            onChange={(e) => onPriorityChange(e.target.value)}
            className="px-4 py-3 bg-white/10 backdrop-blur-lg border border-white/20 rounded-xl text-white focus:outline-none focus:border-blue-400 focus:bg-white/15 focus:ring-2 focus:ring-blue-400/50 transition-all duration-300"
          >
            <option value="all">All Priorities</option>
            <option value="P1">P1 - High</option>
            <option value="P2">P2 - Medium</option>
            <option value="P3">P3 - Low</option>
          </select>
        </div>
        
        {/* Status Filter */}
        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => onStatusChange(e.target.value)}
            className="px-4 py-3 bg-white/10 backdrop-blur-lg border border-white/20 rounded-xl text-white focus:outline-none focus:border-blue-400 focus:bg-white/15 focus:ring-2 focus:ring-blue-400/50 transition-all duration-300"
          >
            <option value="all">All Statuses</option>
            <option value="todo">To Do</option>
            <option value="inprogress">In Progress</option>
            <option value="testing">Testing</option>
            <option value="completed">Completed</option>
          </select>
        </div>
      </div>
    </div>
  );
};

// Header Component
const Header: React.FC<{ 
  user: User | null; 
  onLogout: () => void;
  onOpenProjects: () => void;
  onOpenAnalytics: () => void;
}> = ({ user, onLogout, onOpenProjects, onOpenAnalytics }) => {
  return (
    <div className="bg-white/10 backdrop-blur-xl border-b border-white/20 p-4 shadow-lg">
      <div className="flex items-center justify-between">
        <div className="logo-card flex items-center gap-3 bg-white/20 backdrop-blur-xl rounded-2xl px-6 py-3 shadow-2xl border border-white/30" style={{
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(255, 255, 255, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
        }}>
          <img 
            src="/logo-core.png" 
            alt="SMB‑AI‑Solution Logo" 
            className="w-8 h-8 rounded-lg shadow-lg"
            style={{
              filter: 'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.3))'
            }}
          />
          <h1 className="text-white font-bold text-xl tracking-wide" style={{
            textShadow: '2px 2px 4px rgba(0, 0, 0, 0.5), 0 0 10px rgba(255, 255, 255, 0.1)'
          }}>
            SMB‑AI‑Solution
          </h1>
        </div>
        
        {user && (
          <div className="flex items-center gap-4">
            <button
              onClick={onOpenProjects}
              className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white px-4 py-2 rounded-xl flex items-center gap-2 transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105"
            >
              <FolderOpen className="w-4 h-4" />
              Projects
            </button>
            <button
              onClick={onOpenAnalytics}
              className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white px-4 py-2 rounded-xl flex items-center gap-2 transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105"
            >
              <BarChart3 className="w-4 h-4" />
              Analytics
            </button>
            <span className="text-[#f3f4f6] text-sm">
              {user.full_name}
            </span>
            <button
              onClick={onLogout}
              className="text-gray-400 hover:text-white transition-colors"
            >
              Logout
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// Login Component
const LoginForm: React.FC<{ onLogin: (user: User) => void }> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await axios.post(`${API}/auth/login`, {
        username,
        password,
      });

      const { access_token, user } = response.data;
      localStorage.setItem('token', access_token);
      localStorage.setItem('user', JSON.stringify(user));
      setAuthToken(access_token);
      onLogin(user);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
      <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-8 w-full max-w-md shadow-2xl">
        <div className="text-center mb-8">
          <div className="bg-white rounded-full px-4 py-2 inline-block mb-4">
            <span className="text-black font-bold text-lg">SMB</span>
          </div>
          <h1 className="text-[#f3f4f6] text-xl font-bold">Sign In</h1>
          <p className="text-gray-400 text-sm mt-2">Access your Kanban board</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[#f3f4f6] text-sm font-medium mb-2">
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full p-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-lg 
                         text-[#f3f4f6] focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-400/50"
              placeholder="Enter your username"
              required
            />
          </div>

          <div>
            <label className="block text-[#f3f4f6] text-sm font-medium mb-2">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-lg 
                         text-[#f3f4f6] focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-400/50"
              placeholder="Enter your password"
              required
            />
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500 rounded-lg p-3">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#3b82f6] hover:bg-[#2563eb] text-white py-3 px-4 rounded-lg 
                       font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
};

// Main App Component
const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>(DEFAULT_TEAM_MEMBERS);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createModalStatus, setCreateModalStatus] = useState<string>('todo');
  const [searchTerm, setSearchTerm] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Check for existing authentication and load tasks
  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');

    if (token && userData) {
      try {
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
        setAuthToken(token);
        fetchTasks();
        fetchProjects();
        fetchTeamMembers();
      } catch (error) {
        console.error('Error parsing user data:', error);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
    setLoading(false);
  }, []);

  // Fetch tasks from backend
  const fetchTasks = async () => {
    setTasksLoading(true);
    try {
      const response = await axios.get(`${API}/tasks`);
      setTasks(response.data);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        handleLogout();
      }
    } finally {
      setTasksLoading(false);
    }
  };

  // Fetch projects from backend
  const fetchProjects = async () => {
    setProjectsLoading(true);
    try {
      const response = await axios.get(`${API}/projects`);
      setProjects(response.data);
    } catch (error) {
      console.error('Error fetching projects:', error);
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        handleLogout();
      }
    } finally {
      setProjectsLoading(false);
    }
  };

  // Fetch team members from backend
  const fetchTeamMembers = async () => {
    try {
      const response = await axios.get(`${API}/auth/users`);
      const users: User[] = response.data;
      const members: TeamMember[] = users.map((user, index) => ({
        id: user.id,
        name: user.full_name,
        avatar: user.avatar,
        role: user.role,
        status: 'online' as const,
        color: ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500', 'bg-red-500'][index % 5]
      }));
      setTeamMembers(members);
    } catch (error) {
      console.error('Error fetching team members:', error);
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        handleLogout();
      }
    }
  };

  const handleLogin = async (userData: User) => {
    setUser(userData);
    const token = localStorage.getItem('token');
    if (token) {
      setAuthToken(token);
      await fetchTasks();
      await fetchProjects();
      await fetchTeamMembers();
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setAuthToken(null);
    setUser(null);
    setTasks([]);
    setProjects([]);
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over) return;
    
    const activeTask = tasks.find(t => t.id === active.id);
    if (!activeTask) return;

    // Handle column changes
    if (over.id === 'todo' || over.id === 'inprogress' || over.id === 'testing' || over.id === 'completed') {
      const newStatus = over.id as 'todo' | 'inprogress' | 'testing' | 'completed';
      updateTaskStatus(active.id as string, newStatus);
    }
    
    setActiveId(null);
  };

  // Update task status
  const updateTaskStatus = async (taskId: string, newStatus: 'todo' | 'inprogress' | 'testing' | 'completed') => {
    try {
      await axios.put(`${API}/tasks/${taskId}`, { status: newStatus });
      setTasks(prev => prev.map(task => 
        task.id === taskId 
          ? { ...task, status: newStatus }
          : task
      ));
    } catch (error) {
      console.error('Error updating task status:', error);
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        handleLogout();
      }
    }
  };

  const handleAddTask = (columnId: string) => {
    setCreateModalStatus(columnId);
    setShowCreateModal(true);
  };

  const handleCreateTask = async (newTaskData: Partial<Task>) => {
    try {
      const response = await axios.post(`${API}/tasks`, {
        title: newTaskData.title,
        description: newTaskData.description || '',
        priority: newTaskData.priority || 'P2',
        tags: newTaskData.tags || [],
        dueStatus: newTaskData.dueStatus || 'upcoming',
        project: newTaskData.project || 'General',
        project_color: newTaskData.project_color || 'blue',
        category: newTaskData.category || 'Development',
        assigned_to: newTaskData.assignee || user?.full_name || 'Unassigned',
        deadline: newTaskData.deadline || null,
      });
      setTasks(prev => [...prev, response.data]);
    } catch (error) {
      console.error('Error creating task:', error);
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        handleLogout();
      }
    }
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
  };

  const handleSaveTask = async (taskId: string, updatedTask: Partial<Task>) => {
    try {
      await axios.put(`${API}/tasks/${taskId}`, updatedTask);
      setTasks(prev => prev.map(task => 
        task.id === taskId 
          ? { ...task, ...updatedTask }
          : task
      ));
      setEditingTask(null); // Close the modal after successful save
    } catch (error) {
      console.error('Error updating task:', error);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      await axios.delete(`${API}/tasks/${taskId}`);
      setTasks(prev => prev.filter(task => task.id !== taskId));
      setEditingTask(null); // Close the modal after successful delete
    } catch (error) {
      console.error('Error deleting task:', error);
    }
  };

  const handleEditProject = (project: Project) => {
    setEditingProject(project);
    setShowProjectModal(true);
  };

  const handleSaveProject = async (projectId: string, updatedProject: Partial<Project>) => {
    try {
      await axios.put(`${API}/projects/${projectId}`, updatedProject);
      setProjects(prev => prev.map(project => 
        project.id === projectId 
          ? { ...project, ...updatedProject }
          : project
      ));
      setEditingProject(null);
      setShowProjectModal(false); // Close the modal after successful save
    } catch (error) {
      console.error('Error updating project:', error);
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    try {
      await axios.delete(`${API}/projects/${projectId}`);
      setProjects(prev => prev.filter(project => project.id !== projectId));
      setEditingProject(null);
      setShowProjectModal(false); // Close the modal after successful delete
    } catch (error) {
      console.error('Error deleting project:', error);
    }
  };

  const handleSendMessage = async (message: string) => {
    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      user_id: user?.id || '',
      username: user?.full_name || 'Anonymous',
      message: message,
      timestamp: new Date().toISOString(),
      avatar: user?.avatar || '👤'
    };
    
    setChatMessages(prev => [...prev, newMessage]);
    
    // TODO: Send to backend when chat API is available
    // try {
    //   await axios.post(`${API}/chat/messages`, { message });
    // } catch (error) {
    //   console.error('Error sending message:', error);
    // }
  };

  const handleCreateProject = async (projectData: Partial<Project>) => {
    try {
      const response = await axios.post(`${API}/projects`, projectData);
      setProjects(prev => [...prev, response.data]);
    } catch (error) {
      console.error('Error creating project:', error);
    }
  };

  const handleUpdateProject = async (projectId: string, projectData: Partial<Project>) => {
    try {
      await axios.put(`${API}/projects/${projectId}`, projectData);
      setProjects(prev => prev.map(project => 
        project.id === projectId 
          ? { ...project, ...projectData }
          : project
      ));
    } catch (error) {
      console.error('Error updating project:', error);
    }
  };

  // Filter tasks based on search and filter criteria
  const filteredTasks = tasks.filter(task => {
    const matchesSearch = task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         task.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         task.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesPriority = priorityFilter === 'all' || task.priority === priorityFilter;
    const matchesStatus = statusFilter === 'all' || task.status === statusFilter;
    
    return matchesSearch && matchesPriority && matchesStatus;
  });

  const columns: Column[] = [
    {
      id: 'todo',
      title: 'To Do',
      icon: <AlertCircle className="w-5 h-5 text-slate-400" />,
      color: 'bg-gradient-to-br from-slate-600 to-slate-700',
      tasks: filteredTasks.filter(task => task.status === 'todo'),
    },
    {
      id: 'inprogress',
      title: 'In Progress',
      icon: <PlayCircle className="w-5 h-5 text-orange-400" />,
      color: 'bg-gradient-to-br from-orange-600 to-orange-700',
      tasks: filteredTasks.filter(task => task.status === 'inprogress'),
    },
    {
      id: 'testing',
      title: 'Testing',
      icon: <Bug className="w-5 h-5 text-yellow-400" />,
      color: 'bg-gradient-to-br from-yellow-600 to-yellow-700',
      tasks: filteredTasks.filter(task => task.status === 'testing'),
    },
    {
      id: 'completed',
      title: 'Completed',
      icon: <CheckCircle2 className="w-5 h-5 text-green-400" />,
      color: 'bg-gradient-to-br from-green-600 to-green-700',
      tasks: filteredTasks.filter(task => task.status === 'completed'),
    },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-8 shadow-2xl">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <div className="text-white text-lg">Loading Kanban Board...</div>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginForm onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex">
      <Sidebar user={user} teamMembers={teamMembers} />
      
      <div className="flex-1 flex flex-col">
        <Header 
          user={user} 
          onLogout={handleLogout}
          onOpenProjects={() => setShowProjectModal(true)}
          onOpenAnalytics={() => setShowAnalytics(true)}
        />
        
        <main className="flex-1 p-6 bg-gradient-to-br from-gray-900/30 to-gray-800/30 backdrop-blur-sm">
          <SearchAndFilter
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            priorityFilter={priorityFilter}
            onPriorityChange={setPriorityFilter}
            statusFilter={statusFilter}
            onStatusChange={setStatusFilter}
          />
          
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {columns.map((column) => (
                <KanbanColumn
                  key={column.id}
                  column={column}
                  onAddTask={handleAddTask}
                  onEditTask={handleEditTask}
                  teamMembers={teamMembers}
                />
              ))}
            </div>
            
            <DragOverlay>
              {activeId ? (
                <TaskCard 
                  task={tasks.find(t => t.id === activeId)!} 
                  isDragging 
                  onEdit={handleEditTask}
                  teamMembers={teamMembers}
                />
              ) : null}
            </DragOverlay>
          </DndContext>
          
          {editingTask && (
            <TaskEditModal
              task={editingTask}
              isOpen={!!editingTask}
              onClose={() => setEditingTask(null)}
              onSave={(updatedTask) => handleSaveTask(editingTask.id, updatedTask)}
              onDelete={handleDeleteTask}
              teamMembers={teamMembers}
            />
          )}
          
          <TaskCreateModal
            isOpen={showCreateModal}
            onClose={() => setShowCreateModal(false)}
            onSave={handleCreateTask}
            defaultStatus={createModalStatus}
            projects={projects}
            teamMembers={teamMembers}
          />
          
          <ProjectModal
            isOpen={showProjectModal}
            onClose={() => {
              setShowProjectModal(false);
              setEditingProject(null);
            }}
            onSave={editingProject ? 
              (projectData) => handleSaveProject(editingProject.id, projectData) : 
              handleCreateProject
            }
            projects={projects}
            editProject={editingProject}
            onEditProject={handleEditProject}
            onDeleteProject={handleDeleteProject}
          />
          
          <AnalyticsDashboard
            isOpen={showAnalytics}
            onClose={() => setShowAnalytics(false)}
            tasks={tasks}
            projects={projects}
          />
        </main>
      </div>
      
      {/* Floating Chat Bot */}
      <FloatingChatBot 
        user={user} 
        messages={chatMessages} 
        onSendMessage={handleSendMessage} 
      />
    </div>
  );
};

export default App;