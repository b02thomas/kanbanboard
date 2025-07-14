import React, { useState, useEffect } from "react";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";
import { Plus, Calendar, User, AlertCircle, CheckCircle, Clock, TestTube } from "lucide-react";
import axios from "axios";
import "./App.css";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const priorityColors = {
  low: "bg-blue-500",
  medium: "bg-yellow-500", 
  high: "bg-orange-500",
  asap: "bg-red-500",
  emergency: "bg-red-700"
};

const priorityLabels = {
  low: "Low",
  medium: "Medium",
  high: "High", 
  asap: "ASAP",
  emergency: "Emergency"
};

const columns = [
  { id: "todo", title: "To Do", icon: "📋" },
  { id: "inprogress", title: "In Progress", icon: "🔄" },
  { id: "testing", title: "Testing", icon: "🧪" },
  { id: "completed", title: "Completed", icon: "✅" }
];

const TaskCard = ({ task, index }) => {
  const formatDeadline = (deadline) => {
    if (!deadline) return null;
    return new Date(deadline).toLocaleDateString();
  };

  return (
    <Draggable draggableId={task.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={`bg-gray-800 rounded-lg p-4 mb-3 border border-gray-700 cursor-pointer transition-all duration-200 ${
            snapshot.isDragging ? "shadow-lg transform rotate-2" : "hover:shadow-md"
          }`}
        >
          <div className="flex items-start justify-between mb-2">
            <h3 className="text-white font-medium text-sm flex-1">{task.title}</h3>
            <div className={`w-3 h-3 rounded-full ml-2 ${priorityColors[task.priority]}`}></div>
          </div>
          
          {task.description && (
            <p className="text-gray-400 text-xs mb-2 line-clamp-2">{task.description}</p>
          )}
          
          <div className="flex items-center justify-between text-xs text-gray-500">
            <div className="flex items-center space-x-2">
              <span className="bg-blue-600 text-white px-2 py-1 rounded text-xs">
                {task.project}
              </span>
              <span className="text-gray-400">{task.category}</span>
            </div>
            
            {task.deadline && (
              <div className="flex items-center text-gray-400">
                <Calendar className="w-3 h-3 mr-1" />
                <span>{formatDeadline(task.deadline)}</span>
              </div>
            )}
          </div>
          
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center text-gray-400">
              <User className="w-3 h-3 mr-1" />
              <span className="text-xs">{task.assigned_to}</span>
            </div>
            <span className={`px-2 py-1 rounded text-xs ${priorityColors[task.priority]} text-white`}>
              {priorityLabels[task.priority]}
            </span>
          </div>
        </div>
      )}
    </Draggable>
  );
};

const TaskForm = ({ onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    priority: "medium",
    project: "General",
    category: "Development",
    assigned_to: "user1",
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
      priority: "medium",
      project: "General",
      category: "Development",
      assigned_to: "user1",
      deadline: ""
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
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
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="asap">ASAP</option>
                <option value="emergency">Emergency</option>
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
              <label className="block text-gray-300 text-sm mb-1">Category</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({...formData, category: e.target.value})}
                className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500"
              >
                <option value="Development">Development</option>
                <option value="Marketing">Marketing</option>
                <option value="Business Administration">Business Administration</option>
                <option value="Frontend">Frontend</option>
                <option value="Backend">Backend</option>
                <option value="Agents">Agents</option>
              </select>
            </div>
            
            <div>
              <label className="block text-gray-300 text-sm mb-1">Assigned To</label>
              <select
                value={formData.assigned_to}
                onChange={(e) => setFormData({...formData, assigned_to: e.target.value})}
                className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500"
              >
                <option value="user1">User 1</option>
                <option value="user2">User 2</option>
                <option value="user3">User 3</option>
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

const Column = ({ column, tasks, onAddTask }) => {
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
    <div className="bg-gray-900 rounded-lg p-4 min-h-[600px] flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <span className="text-2xl">{column.icon}</span>
          <h2 className="text-white font-semibold">{column.title}</h2>
          <span className="bg-gray-700 text-gray-300 px-2 py-1 rounded-full text-sm">
            {tasks.length}
          </span>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-full transition-colors"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
      
      <Droppable droppableId={column.id} isDropDisabled={false}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`flex-1 transition-colors ${
              snapshot.isDraggingOver ? "bg-gray-800" : ""
            }`}
          >
            {tasks.map((task, index) => (
              <TaskCard key={task.id} task={task} index={index} />
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
      
      {showForm && (
        <TaskForm
          onSubmit={handleAddTask}
          onCancel={() => setShowForm(false)}
        />
      )}
    </div>
  );
};

function App() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      const response = await axios.get(`${API}/tasks`);
      setTasks(response.data);
    } catch (error) {
      console.error("Error fetching tasks:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddTask = async (taskData) => {
    try {
      const response = await axios.post(`${API}/tasks`, taskData);
      setTasks([...tasks, response.data]);
    } catch (error) {
      console.error("Error creating task:", error);
    }
  };

  const handleDragEnd = async (result) => {
    const { destination, source, draggableId } = result;
    
    if (!destination) return;
    
    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    const newTasks = Array.from(tasks);
    const task = newTasks.find(t => t.id === draggableId);
    
    if (task) {
      const updatedTask = { ...task, status: destination.droppableId };
      
      try {
        await axios.put(`${API}/tasks/${draggableId}`, { status: destination.droppableId });
        setTasks(newTasks.map(t => t.id === draggableId ? updatedTask : t));
      } catch (error) {
        console.error("Error updating task:", error);
      }
    }
  };

  const getTasksByStatus = (status) => {
    return tasks.filter(task => task.status === status);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 p-4">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8">
          <h1 className="text-white text-3xl font-bold text-center">Kanban Board</h1>
          <p className="text-gray-400 text-center mt-2">Manage your team's tasks efficiently</p>
        </header>
        
        <DragDropContext onDragEnd={handleDragEnd} isCombineEnabled={false}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {columns.map(column => (
              <Column
                key={column.id}
                column={column}
                tasks={getTasksByStatus(column.id)}
                onAddTask={handleAddTask}
              />
            ))}
          </div>
        </DragDropContext>
      </div>
    </div>
  );
}

export default App;