
import React, { useState, useCallback } from 'react';
import useKanban from '../hooks/useKanban';

const TaskCard = ({ task, columnId, onDragStart, onDragEnd, onTouchStart, onTouchEnd }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [content, setContent] = useState(task.content);
  const { editTask, deleteTask } = useKanban();

  const handleEdit = useCallback(() => {
    if (isEditing && content) {
      editTask(columnId, task.id, content);
    }
    setIsEditing(prev => !prev);
  }, [isEditing, content, columnId, task.id, editTask]);

  const handleDelete = useCallback(() => {
    if (window.confirm('Are you sure you want to delete this task?')) {
      deleteTask(columnId, task.id);
    }
  }, [columnId, task.id, deleteTask]);

  const handleGestureStart = useCallback((e) => {
      if(isEditing) {
          e.preventDefault();
          return;
      }
      if (e.type === 'touchstart') {
          onTouchStart(e, task, columnId);
      } else {
          onDragStart(e, task, columnId);
      }
  }, [isEditing, onDragStart, onTouchStart, task, columnId]);

  return (
    <div
      className="task-card"
      draggable={!isEditing}
      onDragStart={handleGestureStart}
      onDragEnd={onDragEnd}
      onTouchStart={handleGestureStart}
      onTouchEnd={onTouchEnd}
      data-id={task.id}
    >
      {isEditing ? (
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onBlur={handleEdit}
          autoFocus
        />
      ) : (
        <p onClick={() => setIsEditing(true)}>{task.content}</p>
      )}
       <div className="task-actions">
          <button onClick={handleEdit}>{isEditing ? 'Save' : 'Edit'}</button>
          <button onClick={handleDelete}>Delete</button>
      </div>
    </div>
  );
};

export default React.memo(TaskCard);
