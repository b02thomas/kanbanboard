
import React, { useCallback } from 'react';
import TaskCard from './TaskCard';
import useKanban from '../hooks/useKanban';

const Column = ({ column, onDragStart, onDragEnd, onDragOver, onDrop, onTouchStart, onTouchEnd, isActive }) => {
  const { addTask } = useKanban();

  const handleAddTask = useCallback(() => {
    const content = prompt('New task content:');
    if (content) {
      addTask(column.id, content);
    }
  }, [addTask, column.id]);

  return (
    <div
      className={`column ${isActive ? 'active-drop-zone' : ''}`}
      onDragOver={onDragOver}
      onDrop={onDrop}
      data-id={column.id}
    >
      <h3>{column.title}</h3>
      <div className="task-list">
        {column.tasks.map(task => (
          <TaskCard
            key={task.id}
            task={task}
            columnId={column.id}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
          />
        ))}
      </div>
      <button onClick={handleAddTask}>+ Add Task</button>
    </div>
  );
};

export default React.memo(Column);
