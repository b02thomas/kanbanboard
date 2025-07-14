import React, { useState, useEffect } from "react";
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
import { Plus, Calendar, User, LogOut, Shield, Settings } from "lucide-react";
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
  pink: "bg-pink-500"
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
          <h1 className="text-3xl font-bold text-white mb-2">Viva Startup</h1>
          <p className="text-gray-400">Kanban Board System</p>
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
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const SortableTask = ({ task, users }) => {
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
    return isToday ? "today" : date.toLocaleDateString();
  };

  const assignedUser = users.find(u => u.id === task.assigned_to);

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
        <div className={`${projectColors[task.project_color]} text-white px-2 py-1 rounded text-xs font-medium`}>
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
          <div className="flex items-center text-gray-400 text-xs">
            <Calendar className="w-3 h-3 mr-1" />
            <span>{formatDeadline(task.deadline)}</span>
          </div>
        )}
      </div>
    </div>
  );
};

const TaskForm = ({ onSubmit, onCancel, users }) => {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    priority: "P2",
    project: "General",
    project_color: "blue",
    category: "Development",
    assigned_to: users[0]?.id || "admin",
    deadline: ""
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.title.trim()) return;
    
    const taskData = {
      ...formData,
      deadline: formData.deadline ? new Date(formData.deadline).toISOString() : null
    };
    
    onSubmit(taskData);
    setFormData({
      title: "",
      description: "",
      priority: "P2",
      project: "General",
      project_color: "blue",
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
              <input
                type="text"
                value={formData.project}
                onChange={(e) => setFormData({...formData, project: e.target.value})}
                className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                placeholder="Project name"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-300 text-sm mb-1">Project Color</label>
              <select
                value={formData.project_color}
                onChange={(e) => setFormData({...formData, project_color: e.target.value})}
                className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500"
              >
                <option value="blue">Blue</option>
                <option value="green">Green</option>
                <option value="purple">Purple</option>
                <option value="orange">Orange</option>
                <option value="red">Red</option>
                <option value="pink">Pink</option>
              </select>
            </div>
            
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
              </select>
            </div>
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

const DroppableColumn = ({ column, tasks, onAddTask, children, users }) => {
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
        />
      )}
    </div>
  );
};

const Header = ({ user, onLogout }) => {
  return (
    <header className="bg-gray-800 border-b border-gray-700 p-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="text-2xl font-bold text-white">Viva</div>
          <div className="text-gray-400">|</div>
          <div className="text-gray-300">Kanban Board</div>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <span className="text-lg">{user.avatar}</span>
            <span className="text-white text-sm">{user.full_name}</span>
            <span className="text-gray-400 text-xs">({user.role})</span>
          </div>
          <button
            onClick={onLogout}
            className="bg-red-600 hover:bg-red-700 text-white p-2 rounded transition-colors"
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
  const [loading, setLoading] = useState(true);

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
  };

  const handleAddTask = async (taskData) => {
    try {
      const response = await axios.post(`${API}/tasks`, taskData);
      setTasks([...tasks, response.data]);
    } catch (error) {
      console.error("Error creating task:", error);
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
      <Header user={user} onLogout={handleLogout} />
      
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
                >
                  {columnTasks.map(task => (
                    <SortableTask key={task.id} task={task} users={users} />
                  ))}
                </DroppableColumn>
              );
            })}
          </div>
        </DndContext>
      </div>
    </div>
  );
}

export default App;