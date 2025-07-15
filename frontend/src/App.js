import React, { useState, useEffect, useRef } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import {
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { 
  Plus, Calendar, User, LogOut, FolderOpen, BarChart3, Settings, X, Edit2,
  MessageCircle, Send, Minimize2, Maximize2, Bot, Trash2
} from "lucide-react";
import axios from "axios";
import "./App.css";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const priorityColors = {
  P1: "bg-red-500",
  P2: "bg-orange-500", 
  P3: "bg-yellow-500",
  P4: "bg-green-500"
};

const projectColors = {
  blue: "bg-blue-500",
  green: "bg-green-500",
  purple: "bg-purple-500",
  orange: "bg-orange-500",
  red: "bg-red-500",
  pink: "bg-pink-500",
  indigo: "bg-indigo-500",
  teal: "bg-teal-500"
};

const columns = [
  { id: "todo", title: "To Do", icon: "📋" },
  { id: "inprogress", title: "In Progress", icon: "🔄" },
  { id: "testing", title: "Testing", icon: "🧪" },
  { id: "completed", title: "Completed", icon: "✅" }
];

// Set up axios defaults
axios.defaults.headers.common['Content-Type'] = 'application/json';

const setAuthToken = (token) => {
  if (token) {
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete axios.defaults.headers.common['Authorization'];
  }
};

const LoginForm = ({ onLogin }) => {
  const [credentials, setCredentials] = useState({ username: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await axios.post(`${API}/auth/login`, credentials);
      const { access_token, user } = response.data;
      
      localStorage.setItem('token', access_token);
      localStorage.setItem('user', JSON.stringify(user));
      setAuthToken(access_token);
      
      onLogin(user);
    } catch (error) {
      setError(error.response?.data?.detail || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-lg shadow-xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">SMB Startup</h1>
          <p className="text-gray-400">Kanban Board & AI Assistant</p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-gray-300 text-sm font-medium mb-2">
              Username
            </label>
            <input
              type="text"
              value={credentials.username}
              onChange={(e) => setCredentials({...credentials, username: e.target.value})}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500"
              placeholder="Enter your username"
              required
            />
          </div>
          
          <div>
            <label className="block text-gray-300 text-sm font-medium mb-2">
              Password
            </label>
            <input
              type="password"
              value={credentials.password}
              onChange={(e) => setCredentials({...credentials, password: e.target.value})}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500"
              placeholder="Enter your password"
              required
            />
          </div>
          
          {error && (
            <div className="bg-red-500 bg-opacity-20 border border-red-500 text-red-400 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}
          
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors disabled:opacity-50"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>
        
        <div className="mt-8 pt-6 border-t border-gray-700">
          <div className="text-gray-400 text-sm">
            <p className="mb-2">Demo Accounts:</p>
            <div className="space-y-1">
              <p>👨‍💼 Admin: admin / admin123</p>
              <p>👨‍💻 Developer: developer / dev123</p>
              <p>👩‍🎨 Designer: designer / design123</p>
              <p>👩‍💼 Manager: manager / manager123</p>
              <p>👨‍💰 Sales: sales / sales123</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const ChatBot = ({ user }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState([]);
  const [currentMessage, setCurrentMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) {
      fetchMessages();
    }
  }, [isOpen]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchMessages = async () => {
    try {
      const response = await axios.get(`${API}/chat/messages`);
      setMessages(response.data);
    } catch (error) {
      console.error("Error fetching messages:", error);
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!currentMessage.trim() || loading) return;

    const userMessage = {
      id: Date.now().toString(),
      message: currentMessage,
      user_id: user.id,
      user_name: user.full_name,
      user_avatar: user.avatar,
      timestamp: new Date().toISOString(),
      is_ai: false
    };

    setMessages(prev => [...prev, userMessage]);
    setCurrentMessage("");
    setLoading(true);

    try {
      const response = await axios.post(`${API}/chat/messages`, {
        message: currentMessage
      });

      // Fetch updated messages to get AI response
      await fetchMessages();
    } catch (error) {
      console.error("Error sending message:", error);
      // Add error message
      const errorMessage = {
        id: Date.now().toString(),
        message: "Sorry, I'm having trouble connecting right now. Please try again.",
        user_id: "ai_assistant",
        user_name: "AI Assistant",
        user_avatar: "🤖",
        timestamp: new Date().toISOString(),
        is_ai: true
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const clearChat = async () => {
    try {
      await axios.delete(`${API}/chat/messages`);
      setMessages([]);
    } catch (error) {
      console.error("Error clearing chat:", error);
    }
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  if (!isOpen) {
    return (
      <div className="fixed bottom-6 right-6 chat-button" style={{ zIndex: 10001 }}>
        <button
          onClick={() => setIsOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-full shadow-lg transition-all duration-200 transform hover:scale-105"
          style={{ zIndex: 10001, position: 'relative' }}
        >
          <MessageCircle className="w-6 h-6" />
        </button>
      </div>
    );
  }

  if (isMinimized) {
    return (
      <div className="fixed bottom-6 right-6 chat-window" style={{ zIndex: 10002 }}>
        <div className="bg-gray-800 rounded-lg border border-gray-700 shadow-xl">
          <div className="flex items-center justify-between p-3 border-b border-gray-700">
            <div className="flex items-center space-x-2">
              <Bot className="w-4 h-4 text-blue-400" />
              <span className="text-white text-sm font-medium">AI Assistant</span>
            </div>
            <div className="flex items-center space-x-1">
              <button
                onClick={() => setIsMinimized(false)}
                className="text-gray-400 hover:text-white p-1"
                style={{ zIndex: 10003 }}
              >
                <Maximize2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-white p-1"
                style={{ zIndex: 10003 }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 chat-window" style={{ zIndex: 10002 }}>
      <div className="bg-gray-800 rounded-lg border border-gray-700 shadow-xl w-96 h-[500px] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <div className="flex items-center space-x-2">
            <Bot className="w-5 h-5 text-blue-400" />
            <span className="text-white font-medium">AI Assistant</span>
            <span className="text-xs text-gray-400">Connected to N8N</span>
          </div>
          <div className="flex items-center space-x-1">
            <button
              onClick={clearChat}
              className="text-gray-400 hover:text-white p-1"
              title="Clear chat"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setIsMinimized(true)}
              className="text-gray-400 hover:text-white p-1"
            >
              <Minimize2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setIsOpen(false)}
              className="text-gray-400 hover:text-white p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="text-center text-gray-400 mt-8">
              <Bot className="w-12 h-12 mx-auto mb-4 text-gray-500" />
              <p className="text-lg mb-2">What can I help you with?</p>
              <p className="text-sm">Ask me about tasks, projects, or anything else!</p>
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.is_ai ? 'justify-start' : 'justify-end'}`}
              >
                <div
                  className={`max-w-xs px-4 py-2 rounded-lg ${
                    message.is_ai
                      ? 'bg-gray-700 text-white'
                      : 'bg-blue-600 text-white'
                  }`}
                >
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="text-xs">{message.user_avatar}</span>
                    <span className="text-xs font-medium">{message.user_name}</span>
                    <span className="text-xs text-gray-400">
                      {formatTime(message.timestamp)}
                    </span>
                  </div>
                  <p className="text-sm">{message.message}</p>
                </div>
              </div>
            ))
          )}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-gray-700 text-white max-w-xs px-4 py-2 rounded-lg">
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span className="text-sm">AI is thinking...</span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t border-gray-700">
          <form onSubmit={sendMessage} className="flex space-x-2">
            <input
              type="text"
              value={currentMessage}
              onChange={(e) => setCurrentMessage(e.target.value)}
              placeholder="Type your message..."
              className="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !currentMessage.trim()}
              className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

const ProjectModal = ({ isOpen, onClose, onSubmit, projects, editProject }) => {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    color: "blue",
    status: "active"
  });

  useEffect(() => {
    if (editProject) {
      setFormData(editProject);
    } else {
      setFormData({
        name: "",
        description: "",
        color: "blue",
        status: "active"
      });
    }
  }, [editProject]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return;
    onSubmit(formData);
    setFormData({ name: "", description: "", color: "blue", status: "active" });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 modal-overlay project-modal" style={{ zIndex: 10004 }}>
      <div className="bg-gray-800 rounded-lg p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-white text-lg font-semibold">
            {editProject ? "Edit Project" : "Manage Projects"}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-300 text-sm mb-1">Project Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                placeholder="Enter project name"
                required
              />
            </div>
            
            <div>
              <label className="block text-gray-300 text-sm mb-1">Color</label>
              <select
                value={formData.color}
                onChange={(e) => setFormData({...formData, color: e.target.value})}
                className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500"
              >
                <option value="blue">Blue</option>
                <option value="green">Green</option>
                <option value="purple">Purple</option>
                <option value="orange">Orange</option>
                <option value="red">Red</option>
                <option value="pink">Pink</option>
                <option value="indigo">Indigo</option>
                <option value="teal">Teal</option>
              </select>
            </div>
          </div>
          
          <div>
            <label className="block text-gray-300 text-sm mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500"
              placeholder="Enter project description"
              rows="2"
            />
          </div>
          
          <div>
            <label className="block text-gray-300 text-sm mb-1">Status</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({...formData, status: e.target.value})}
              className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500"
            >
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="paused">Paused</option>
            </select>
          </div>
          
          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 transition-colors"
          >
            {editProject ? "Update Project" : "Create Project"}
          </button>
        </form>
        
        <div className="border-t border-gray-700 pt-4">
          <h3 className="text-white font-medium mb-3">Existing Projects</h3>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {projects.map((project) => (
              <div
                key={project.id}
                className="flex items-center justify-between bg-gray-700 p-3 rounded"
              >
                <div className="flex items-center space-x-3">
                  <div className={`w-3 h-3 rounded-full ${projectColors[project.color]}`}></div>
                  <div>
                    <p className="text-white font-medium">{project.name}</p>
                    <p className="text-gray-400 text-sm">{project.description}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`px-2 py-1 rounded text-xs ${
                    project.status === 'active' ? 'bg-green-600' : 
                    project.status === 'completed' ? 'bg-blue-600' : 'bg-yellow-600'
                  } text-white`}>
                    {project.status}
                  </span>
                  <button
                    onClick={() => onSubmit(project, true)}
                    className="text-blue-400 hover:text-blue-300"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const AnalyticsModal = ({ isOpen, onClose, analytics }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-800 rounded-lg p-6 w-full max-w-4xl max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-white text-xl font-semibold">Analytics Dashboard</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Task Statistics */}
          <div className="bg-gray-700 rounded-lg p-4">
            <h3 className="text-white font-medium mb-3">Task Statistics</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-300">Total Tasks:</span>
                <span className="text-white font-medium">{analytics.task_stats?.total_tasks || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">To Do:</span>
                <span className="text-blue-400 font-medium">{analytics.task_stats?.todo || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">In Progress:</span>
                <span className="text-yellow-400 font-medium">{analytics.task_stats?.inprogress || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">Testing:</span>
                <span className="text-purple-400 font-medium">{analytics.task_stats?.testing || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">Completed:</span>
                <span className="text-green-400 font-medium">{analytics.task_stats?.completed || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">Overdue:</span>
                <span className="text-red-400 font-medium">{analytics.task_stats?.overdue || 0}</span>
              </div>
            </div>
          </div>
          
          {/* Priority Distribution */}
          <div className="bg-gray-700 rounded-lg p-4">
            <h3 className="text-white font-medium mb-3">Priority Distribution</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-300">P1 (Critical):</span>
                <span className="text-red-400 font-medium">{analytics.priority_stats?.P1 || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">P2 (High):</span>
                <span className="text-orange-400 font-medium">{analytics.priority_stats?.P2 || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">P3 (Medium):</span>
                <span className="text-yellow-400 font-medium">{analytics.priority_stats?.P3 || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">P4 (Low):</span>
                <span className="text-green-400 font-medium">{analytics.priority_stats?.P4 || 0}</span>
              </div>
            </div>
          </div>
          
          {/* Project Statistics */}
          <div className="bg-gray-700 rounded-lg p-4">
            <h3 className="text-white font-medium mb-3">Project Statistics</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-300">Total Projects:</span>
                <span className="text-white font-medium">{analytics.project_stats?.total_projects || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">Active:</span>
                <span className="text-green-400 font-medium">{analytics.project_stats?.active_projects || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">Completed:</span>
                <span className="text-blue-400 font-medium">{analytics.project_stats?.completed_projects || 0}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const SortableTask = ({ task, users, projects }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const formatDeadline = (deadline) => {
    if (!deadline) return null;
    const date = new Date(deadline);
    const today = new Date();
    const isToday = date.toDateString() === today.toDateString();
    const isPast = date < today;
    
    if (isToday) return "today";
    if (isPast) return "overdue";
    return date.toLocaleDateString();
  };

  const assignedUser = users.find(u => u.id === task.assigned_to);
  const taskProject = projects.find(p => p.name === task.project);

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`bg-gray-800 rounded-lg p-4 mb-3 border border-gray-700 cursor-pointer transition-all duration-200 hover:shadow-lg ${
        isDragging ? "shadow-xl" : ""
      }`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className={`${taskProject ? projectColors[taskProject.color] : projectColors[task.project_color]} text-white px-2 py-1 rounded text-xs font-medium`}>
          {task.project}
        </div>
        <div className={`${priorityColors[task.priority]} text-white px-2 py-1 rounded text-xs font-medium`}>
          {task.priority}
        </div>
      </div>
      
      <h3 className="text-white font-medium text-sm mb-2">{task.title}</h3>
      
      {task.description && (
        <p className="text-gray-400 text-xs mb-3 line-clamp-2">{task.description}</p>
      )}
      
      <div className="flex items-center justify-between">
        <div className="flex items-center text-gray-400 text-xs">
          <span className="mr-1">{assignedUser?.avatar || "👤"}</span>
          <span>{assignedUser?.username || task.assigned_to}</span>
        </div>
        
        {task.deadline && (
          <div className={`flex items-center text-xs ${
            formatDeadline(task.deadline) === "overdue" ? "text-red-400" : 
            formatDeadline(task.deadline) === "today" ? "text-yellow-400" : "text-gray-400"
          }`}>
            <Calendar className="w-3 h-3 mr-1" />
            <span>{formatDeadline(task.deadline)}</span>
          </div>
        )}
      </div>
    </div>
  );
};

const TaskForm = ({ onSubmit, onCancel, users, projects }) => {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    priority: "P2",
    project: projects.length > 0 ? projects[0].name : "General",
    project_color: projects.length > 0 ? projects[0].color : "blue",
    category: "Development",
    assigned_to: users[0]?.id || "admin",
    deadline: ""
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.title.trim()) return;
    
    const selectedProject = projects.find(p => p.name === formData.project);
    const taskData = {
      ...formData,
      project_color: selectedProject ? selectedProject.color : formData.project_color,
      deadline: formData.deadline ? new Date(formData.deadline).toISOString() : null
    };
    
    onSubmit(taskData);
    setFormData({
      title: "",
      description: "",
      priority: "P2",
      project: projects.length > 0 ? projects[0].name : "General",
      project_color: projects.length > 0 ? projects[0].color : "blue",
      category: "Development",
      assigned_to: users[0]?.id || "admin",
      deadline: ""
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <h2 className="text-white text-lg font-semibold mb-4">Add New Task</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-gray-300 text-sm mb-1">Title *</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({...formData, title: e.target.value})}
              className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500"
              placeholder="Enter task title"
              required
            />
          </div>
          
          <div>
            <label className="block text-gray-300 text-sm mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500"
              placeholder="Enter task description"
              rows="3"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-300 text-sm mb-1">Priority</label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({...formData, priority: e.target.value})}
                className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500"
              >
                <option value="P1">P1 - Critical</option>
                <option value="P2">P2 - High</option>
                <option value="P3">P3 - Medium</option>
                <option value="P4">P4 - Low</option>
              </select>
            </div>
            
            <div>
              <label className="block text-gray-300 text-sm mb-1">Project</label>
              <select
                value={formData.project}
                onChange={(e) => {
                  const selectedProject = projects.find(p => p.name === e.target.value);
                  setFormData({
                    ...formData, 
                    project: e.target.value,
                    project_color: selectedProject ? selectedProject.color : "blue"
                  });
                }}
                className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500"
              >
                {projects.map(project => (
                  <option key={project.id} value={project.name}>{project.name}</option>
                ))}
                <option value="General">General</option>
              </select>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-300 text-sm mb-1">Category</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({...formData, category: e.target.value})}
                className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500"
              >
                <option value="Development">Development</option>
                <option value="Design">Design</option>
                <option value="Marketing">Marketing</option>
                <option value="Business">Business</option>
                <option value="Testing">Testing</option>
                <option value="Sales">Sales</option>
              </select>
            </div>
            
            <div>
              <label className="block text-gray-300 text-sm mb-1">Assigned To</label>
              <select
                value={formData.assigned_to}
                onChange={(e) => setFormData({...formData, assigned_to: e.target.value})}
                className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500"
              >
                {users.map(user => (
                  <option key={user.id} value={user.id}>
                    {user.avatar} {user.full_name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          
          <div>
            <label className="block text-gray-300 text-sm mb-1">Deadline</label>
            <input
              type="datetime-local"
              value={formData.deadline}
              onChange={(e) => setFormData({...formData, deadline: e.target.value})}
              className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500"
            />
          </div>
          
          <div className="flex space-x-3 pt-4">
            <button
              type="submit"
              className="flex-1 bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 transition-colors"
            >
              Create Task
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 bg-gray-600 text-white py-2 px-4 rounded hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const DroppableColumn = ({ column, tasks, onAddTask, children, users, projects }) => {
  const [showForm, setShowForm] = useState(false);
  
  const handleAddTask = async (taskData) => {
    try {
      await onAddTask({ ...taskData, status: column.id });
      setShowForm(false);
    } catch (error) {
      console.error("Error creating task:", error);
    }
  };

  return (
    <div className="bg-gray-800 rounded-lg p-4 min-h-[600px] flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <span className="text-lg">{column.icon}</span>
          <h2 className="text-white font-semibold text-sm">{column.title}</h2>
          <span className="bg-gray-700 text-gray-300 px-2 py-1 rounded text-xs">
            {tasks.length}
          </span>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white p-1.5 rounded transition-colors"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
      
      <div className="flex-1">
        <SortableContext items={tasks.map(task => task.id)} strategy={verticalListSortingStrategy}>
          {tasks.length === 0 ? (
            <div className="border-2 border-dashed border-gray-600 rounded-lg p-8 text-center">
              <p className="text-gray-500 text-sm">Drop tasks here</p>
            </div>
          ) : (
            children
          )}
        </SortableContext>
      </div>
      
      {showForm && (
        <TaskForm
          onSubmit={handleAddTask}
          onCancel={() => setShowForm(false)}
          users={users}
          projects={projects}
        />
      )}
    </div>
  );
};

const Header = ({ user, onLogout, onOpenProjects, onOpenAnalytics }) => {
  return (
    <header className="bg-gray-800 border-b border-gray-700 p-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="text-2xl font-bold text-white">SMB Startup</div>
          <div className="text-gray-400">|</div>
          <div className="text-gray-300">Kanban Board & AI Assistant</div>
        </div>
        
        <div className="flex items-center space-x-4">
          <button
            onClick={onOpenProjects}
            className="bg-purple-600 hover:bg-purple-700 text-white p-2 rounded transition-colors"
            title="Manage Projects"
          >
            <FolderOpen className="w-4 h-4" />
          </button>
          <button
            onClick={onOpenAnalytics}
            className="bg-green-600 hover:bg-green-700 text-white p-2 rounded transition-colors"
            title="Analytics"
          >
            <BarChart3 className="w-4 h-4" />
          </button>
          <div className="flex items-center space-x-2">
            <span className="text-lg">{user.avatar}</span>
            <span className="text-white text-sm">{user.full_name}</span>
            <span className="text-gray-400 text-xs">({user.role})</span>
          </div>
          <button
            onClick={onLogout}
            className="bg-red-600 hover:bg-red-700 text-white p-2 rounded transition-colors"
            title="Logout"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};

function App() {
  const [user, setUser] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [analytics, setAnalytics] = useState({});
  const [loading, setLoading] = useState(true);
  const [showProjects, setShowProjects] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [editProject, setEditProject] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    
    if (token && savedUser) {
      setAuthToken(token);
      setUser(JSON.parse(savedUser));
    } else {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) {
      fetchTasks();
      fetchUsers();
      fetchProjects();
      fetchAnalytics();
    }
  }, [user]);

  const fetchTasks = async () => {
    try {
      const response = await axios.get(`${API}/tasks`);
      setTasks(response.data);
    } catch (error) {
      console.error("Error fetching tasks:", error);
      if (error.response?.status === 401) {
        handleLogout();
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await axios.get(`${API}/auth/users`);
      setUsers(response.data);
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  };

  const fetchProjects = async () => {
    try {
      const response = await axios.get(`${API}/projects`);
      setProjects(response.data);
    } catch (error) {
      console.error("Error fetching projects:", error);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const response = await axios.get(`${API}/analytics/dashboard`);
      setAnalytics(response.data);
    } catch (error) {
      console.error("Error fetching analytics:", error);
    }
  };

  const handleLogin = (userData) => {
    setUser(userData);
    setLoading(false);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setAuthToken(null);
    setUser(null);
    setTasks([]);
    setUsers([]);
    setProjects([]);
    setAnalytics({});
  };

  const handleAddTask = async (taskData) => {
    try {
      const response = await axios.post(`${API}/tasks`, taskData);
      setTasks([...tasks, response.data]);
      fetchAnalytics(); // Refresh analytics
    } catch (error) {
      console.error("Error creating task:", error);
    }
  };

  const handleProjectSubmit = async (projectData, isEdit = false) => {
    try {
      if (isEdit) {
        await axios.put(`${API}/projects/${projectData.id}`, projectData);
        setEditProject(null);
      } else {
        await axios.post(`${API}/projects`, projectData);
      }
      fetchProjects();
      fetchAnalytics(); // Refresh analytics
    } catch (error) {
      console.error("Error managing project:", error);
    }
  };

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    
    if (!over) return;
    
    const activeTask = tasks.find(task => task.id === active.id);
    const overColumnId = over.id;
    
    // Check if we're dropping on a column or another task
    const targetColumn = columns.find(col => col.id === overColumnId) ? 
      overColumnId : 
      tasks.find(task => task.id === overColumnId)?.status;
    
    if (!activeTask || !targetColumn || activeTask.status === targetColumn) {
      return;
    }

    // Update task status
    const updatedTask = { ...activeTask, status: targetColumn };
    
    try {
      await axios.put(`${API}/tasks/${activeTask.id}`, { status: targetColumn });
      setTasks(tasks.map(task => 
        task.id === activeTask.id ? updatedTask : task
      ));
      fetchAnalytics(); // Refresh analytics
    } catch (error) {
      console.error("Error updating task:", error);
    }
  };

  const getTasksByStatus = (status) => {
    return tasks.filter(task => task.status === status);
  };

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <LoginForm onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <Header 
        user={user} 
        onLogout={handleLogout} 
        onOpenProjects={() => setShowProjects(true)}
        onOpenAnalytics={() => setShowAnalytics(true)}
      />
      
      <div className="max-w-7xl mx-auto p-6">
        <DndContext 
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {columns.map(column => {
              const columnTasks = getTasksByStatus(column.id);
              return (
                <DroppableColumn
                  key={column.id}
                  column={column}
                  tasks={columnTasks}
                  onAddTask={handleAddTask}
                  users={users}
                  projects={projects}
                >
                  {columnTasks.map(task => (
                    <SortableTask key={task.id} task={task} users={users} projects={projects} />
                  ))}
                </DroppableColumn>
              );
            })}
          </div>
        </DndContext>
      </div>
      
      {/* Modals */}
      <ProjectModal
        isOpen={showProjects}
        onClose={() => {
          setShowProjects(false);
          setEditProject(null);
        }}
        onSubmit={handleProjectSubmit}
        projects={projects}
        editProject={editProject}
      />
      
      <AnalyticsModal
        isOpen={showAnalytics}
        onClose={() => setShowAnalytics(false)}
        analytics={analytics}
      />
      
      {/* AI Chatbot */}
      <ChatBot user={user} />
    </div>
  );
}

export default App;