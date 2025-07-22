
import { useCallback } from 'react';
import useLocalStorage from './useLocalStorage';
import { v4 as uuidv4 } from 'uuid';

const initialColumns = {
  'todo': {
    id: 'todo',
    title: 'To Do',
    tasks: [],
  },
  'inprogress': {
    id: 'inprogress',
    title: 'In Progress',
    tasks: [],
  },
  'done': {
    id: 'done',
    title: 'Done',
    tasks: [],
  },
};

const useKanban = () => {
  const [columns, setColumns] = useLocalStorage('kanban-data', initialColumns);

  const addTask = useCallback((columnId, taskContent) => {
    const newTask = { id: uuidv4(), content: taskContent };
    setColumns(prev => ({
      ...prev,
      [columnId]: {
        ...prev[columnId],
        tasks: [...prev[columnId].tasks, newTask]
      }
    }));
  }, [setColumns]);

  const editTask = useCallback((columnId, taskId, newContent) => {
    setColumns(prev => ({
      ...prev,
      [columnId]: {
        ...prev[columnId],
        tasks: prev[columnId].tasks.map(task =>
          task.id === taskId ? { ...task, content: newContent } : task
        )
      }
    }));
  }, [setColumns]);

  const deleteTask = useCallback((columnId, taskId) => {
    setColumns(prev => ({
        ...prev,
        [columnId]: {
            ...prev[columnId],
            tasks: prev[columnId].tasks.filter(task => task.id !== taskId)
        }
    }));
  }, [setColumns]);

  const moveTask = useCallback((draggedTask, sourceColumnId, destColumnId, destIndex) => {
      setColumns(prev => {
          const sourceTasks = [...prev[sourceColumnId].tasks];
          const taskIndex = sourceTasks.findIndex(t => t.id === draggedTask.id);
          sourceTasks.splice(taskIndex, 1);

          const destTasks = sourceColumnId === destColumnId ? sourceTasks : [...prev[destColumnId].tasks];
          destTasks.splice(destIndex, 0, draggedTask);

          return {
              ...prev,
              [sourceColumnId]: { ...prev[sourceColumnId], tasks: sourceTasks },
              [destColumnId]: { ...prev[destColumnId], tasks: destTasks },
          };
      });
  }, [setColumns]);

  return { columns, addTask, editTask, deleteTask, moveTask };
};

export default useKanban;
