import React, { useState, useEffect, useCallback} from 'react';
import { listen } from '@tauri-apps/api/event';
import { supabase } from './lib/supabase';
import { useAuth } from './contexts/AuthContext';
import Preferences from './components/Preferences';
import './styles.css';

interface Task {
  id: string;
  name: string;
  createdAt: number;
  completedAt?: number;
  deletedAt?: number;
  isLate?: boolean;
}

interface CompletedTaskHistory {
  task: Task;
  completedAt: number;
}

const App: React.FC = () => {
  const { user, signOut } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTaskName, setNewTaskName] = useState('');
  const [showInput, setShowInput] = useState(false);
  const [inputRef, setInputRef] = useState<HTMLInputElement | null>(null);
  const [history, setHistory] = useState<CompletedTaskHistory[]>([]);
  const [showPreferences, setShowPreferences] = useState(false);
  const maxHistorySize = 10;

  const loadTasks = useCallback(async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      if (error) throw error;

      if (data) {
        const mappedTasks: Task[] = data.map(task => ({
          id: task.id,
          name: task.name,
          createdAt: new Date(task.created_at).getTime(),
          completedAt: task.completed_at ? new Date(task.completed_at).getTime() : undefined,
          deletedAt: task.deleted_at ? new Date(task.deleted_at).getTime() : undefined,
          isLate: task.is_late || false,
        }));
        setTasks(mappedTasks);
      }
    } catch (error) {
      console.error('Failed to load tasks:', error);
      setTasks([]);
    }
  }, [user]);

  const runCleanup = useCallback(async () => {
    if (!user) return;
    
    try {
      // Call the cleanup function on the database
      await supabase.rpc('cleanup_tasks');
      
      // Call mark_tasks_late function
      await supabase.rpc('mark_tasks_late');
      
      // Reload tasks to reflect changes
      await loadTasks();
    } catch (error) {
      console.error('Failed to cleanup tasks:', error);
    }
  }, [user, loadTasks]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  // Load user preferences and apply them
  useEffect(() => {
    const loadUserPreferences = async () => {
      if (!user) return;

      try {
        const { data, error } = await supabase
          .from('user_preferences')
          .select('theme, font')
          .eq('user_id', user.id)
          .single();

        if (error && error.code !== 'PGRST116') {
          console.error('Error loading preferences:', error);
          return;
        }

        if (data) {
          if (data.theme) {
            document.documentElement.setAttribute('data-theme', data.theme);
          }
          if (data.font) {
            document.body.setAttribute('data-font', data.font);
          }
        }
      } catch (error) {
        console.error('Failed to load user preferences:', error);
      }
    };

    loadUserPreferences();
  }, [user]);

  useEffect(() => {
    // Run cleanup on mount and every hour
    runCleanup();
    const interval = setInterval(runCleanup, 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, [runCleanup]);

  useEffect(() => {
    // Listen for menu events from macOS menubar
    let unlistenSignOut: (() => void) | undefined;
    let unlistenPreferences: (() => void) | undefined;
    
    console.log('Setting up menu listeners...');
    
    // Sign out listener
    listen('sign-out-user', () => {
      console.log('Sign out event received!');
      signOut();
    }).then((unlistenFn) => {
      unlistenSignOut = unlistenFn;
    });

    // Preferences listener
    listen('navigate-to-preferences', () => {
      console.log('Preferences event received!');
      setShowPreferences(true);
    }).then((unlistenFn) => {
      unlistenPreferences = unlistenFn;
    });

    console.log('Menu listeners set up successfully!');

    return () => {
      if (unlistenSignOut) unlistenSignOut();
      if (unlistenPreferences) unlistenPreferences();
    };
  }, [signOut]);

  const addTask = useCallback(async () => {
    if (!user || !newTaskName.trim()) return;
    
    try {
      const { data, error } = await supabase
        .from('tasks')
        .insert({
          user_id: user.id,
          name: newTaskName.trim(),
        })
        .select()
        .single();

      if (error) throw error;

      if (data) {
        const newTask: Task = {
          id: data.id,
          name: data.name,
          createdAt: new Date(data.created_at).getTime(),
          isLate: data.is_late || false,
        };
        setTasks([...tasks, newTask]);
      }
      
      setNewTaskName('');
      setShowInput(false);
    } catch (error) {
      console.error('Failed to add task:', error);
    }
  }, [newTaskName, tasks, user]);

  const completeTask = useCallback(async (taskId: string) => {
    if (!user) return;
    
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    try {
      const now = new Date().toISOString();
      
      // Update task in database to mark as completed
      const { error } = await supabase
        .from('tasks')
        .update({
          completed_at: now,
          deleted_at: now,
        })
        .eq('id', taskId)
        .eq('user_id', user.id);

      if (error) throw error;

      // Add to local history
      const completedTask = { 
        ...task, 
        completedAt: Date.now(),
        deletedAt: Date.now()
      };
      const updatedHistory = [{ task: completedTask, completedAt: Date.now() }, ...history].slice(0, maxHistorySize);
      setHistory(updatedHistory);

      // Remove from local state
      const updatedTasks = tasks.filter(t => t.id !== taskId);
      setTasks(updatedTasks);
    } catch (error) {
      console.error('Failed to complete task:', error);
    }
  }, [tasks, history, user]);

  const undoLastCompletion = useCallback(async () => {
    if (!user || history.length === 0) return;

    const lastCompleted = history[0];
    
    try {
      // Update task in database to restore it
      const { error } = await supabase
        .from('tasks')
        .update({
          completed_at: null,
          deleted_at: null,
          is_late: false,
        })
        .eq('id', lastCompleted.task.id)
        .eq('user_id', user.id);

      if (error) throw error;

      // Update local state
      const restoredTask = { ...lastCompleted.task };
      delete restoredTask.completedAt;
      delete restoredTask.deletedAt;
      delete restoredTask.isLate;

      const updatedTasks = [...tasks, restoredTask];
      setTasks(updatedTasks);

      const updatedHistory = history.slice(1);
      setHistory(updatedHistory);
    } catch (error) {
      console.error('Failed to undo completion:', error);
    }
  }, [history, tasks, user]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
        e.preventDefault();
        setShowInput(true);
        setTimeout(() => inputRef?.focus(), 0);
      }
      
      if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        e.preventDefault();
        undoLastCompletion();
      }

      if (e.key === 'Escape' && showInput) {
        setShowInput(false);
        setNewTaskName('');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [inputRef, showInput, undoLastCompletion]);

  const incompleteTasks = tasks.filter(t => !t.completedAt && !t.deletedAt).length;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStart = today.getTime();
  
  const completedToday = history.filter(h => h.completedAt >= todayStart).length;
  const totalTasksToday = incompleteTasks + completedToday;
  const progressPercentage = totalTasksToday > 0 ? (completedToday / totalTasksToday) * 100 : 0;
  
  const dateString = new Date().toLocaleDateString('en-US', { 
    weekday: 'long', 
    month: 'long', 
    day: 'numeric' 
  });

  return (
    <>
      <div className="app">
        <div className="header" data-tauri-drag-region>
        <h1 className="title">Today</h1>
        <div className="date">{dateString}</div>
      </div>

      <div className="progress-container">
        <div className="progress-bar">
          <div 
            className="progress-fill"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
        <div className="progress-text">
          {completedToday} of {totalTasksToday} completed
        </div>
      </div>

      <div className="tasks-container">
        {tasks.filter(t => !t.completedAt && !t.deletedAt).length === 0 && !showInput ? (
          <div className="empty-state">
            <div className="empty-icon">📝</div>
            <div className="empty-text">No tasks for today</div>
            <div className="empty-subtext">Press ⌘ + N to create one</div>
          </div>
        ) : (
          <div className="task-list">
            {tasks.filter(task => !task.completedAt && !task.deletedAt).map(task => (
              <div 
                key={task.id} 
                className={`task-item ${task.isLate ? 'late' : ''} ${task.completedAt ? 'completed' : ''}`}
              >
                <button
                  className="task-checkbox"
                  onClick={() => completeTask(task.id)}
                  aria-label="Complete task"
                >
                  <div className="checkbox-box" />
                </button>
                <div className="task-content">
                  <div className="task-name">{task.name}</div>
                  {task.isLate && <div className="late-badge">Late</div>}
                </div>
              </div>
            ))}
          </div>
        )}

        {showInput && (
          <div className="new-task-input-container">
            <input
              ref={setInputRef}
              type="text"
              value={newTaskName}
              onChange={(e) => setNewTaskName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  addTask();
                }
              }}
              placeholder="What needs to be done?"
              className="new-task-input"
              autoFocus
            />
            <div className="input-actions">
              <button onClick={addTask} className="btn-primary">Add Task</button>
              <button onClick={() => {
                setShowInput(false);
                setNewTaskName('');
              }} className="btn-secondary">Cancel</button>
            </div>
          </div>
        )}
      </div>

      <div className="footer">
        <div className="keyboard-hint">
          <span>⌘ + N</span> New task
        </div>
        <div className="keyboard-hint">
          <span>⌘ + Z</span> Undo
        </div>
        </div>
      </div>

      {showPreferences && (
        <Preferences onClose={() => setShowPreferences(false)} />
      )}
    </>
  );
};

export default App;