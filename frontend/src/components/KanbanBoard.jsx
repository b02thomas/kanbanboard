
import React, { useState, useCallback, useMemo, useRef } from 'react';
import useKanban from '../hooks/useKanban';
import Column from './Column';

const KanbanBoard = () => {
  const { columns, moveTask } = useKanban();
  const [draggedTask, setDraggedTask] = useState(null);
  const [sourceColumnId, setSourceColumnId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeColumn, setActiveColumn] = useState(null);
  
  const draggedItem = useRef(null)

  const handleDragStart = useCallback((e, task, columnId) => {
    setDraggedTask(task);
    setSourceColumnId(columnId);
    draggedItem.current = e.currentTarget;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', task.id);
    e.currentTarget.classList.add('dragging');
  }, []);

  const handleTouchStart = useCallback((e, task, columnId) => {
      setDraggedTask(task);
      setSourceColumnId(columnId);
      draggedItem.current = e.currentTarget;
      e.currentTarget.classList.add('dragging');
  }, [])

  const handleDragEnd = useCallback(() => {
      draggedItem.current.classList.remove('dragging')
      draggedItem.current = null
      setDraggedTask(null);
      setSourceColumnId(null);
      setActiveColumn(null);
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (draggedTask && sourceColumnId && activeColumn) {
        moveTask(draggedTask, sourceColumnId, activeColumn, 0); // Simplified
    }
    if (draggedItem.current) {
        draggedItem.current.classList.remove('dragging');
        draggedItem.current = null;
    }
    setDraggedTask(null);
    setSourceColumnId(null);
    setActiveColumn(null);
}, [draggedTask, sourceColumnId, activeColumn, moveTask]);


  const handleDragOver = useCallback((e, columnId) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setActiveColumn(columnId)
  }, []);

  const handleTouchMove = useCallback((e) => {
      const touch = e.touches[0];
      const element = document.elementFromPoint(touch.clientX, touch.clientY);
      const columnElement = element ? element.closest('.column') : null;
      if (columnElement) {
          setActiveColumn(columnElement.dataset.id)
      }
  }, [])

  const handleDrop = useCallback((e, destColumnId) => {
    e.preventDefault();
    if (draggedTask) {
      const destElement = e.target.closest('.task-card');
      let destIndex = 0;
      if(destElement) {
          const rect = destElement.getBoundingClientRect();
          const isAfter = e.clientY > rect.top + rect.height / 2;
          const columnTasks = columns[destColumnId].tasks;
          const droppedOnTaskIndex = columnTasks.findIndex(t => t.id === destElement.dataset.id);
          destIndex = isAfter ? droppedOnTaskIndex + 1: droppedOnTaskIndex;
      }
      moveTask(draggedTask, sourceColumnId, destColumnId, destIndex);
    }
  }, [draggedTask, sourceColumnId, moveTask, columns]);

  const filteredColumns = useMemo(() => {
      return Object.keys(columns).reduce((acc, columnId) => {
        const column = columns[columnId];
        const filteredTasks = column.tasks.filter(task => 
          task.content.toLowerCase().includes(searchTerm.toLowerCase())
        );
        acc[columnId] = { ...column, tasks: filteredTasks };
        return acc;
      }, {});
  }, [columns, searchTerm]);

  return (
    <>
      <div className="search-bar">
        <input 
          type="text"
          placeholder="Search tasks..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>
      <div className="kanban-board" onTouchMove={handleTouchMove}>
        {Object.values(filteredColumns).map(column => (
          <Column
            key={column.id}
            column={column}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragOver={(e) => handleDragOver(e, column.id)}
            onDrop={(e) => handleDrop(e, column.id)}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            isActive={activeColumn === column.id}
          />
        ))}
      </div>
    </>
  );
};

export default KanbanBoard;
