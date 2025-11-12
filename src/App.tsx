import React, { useState, useEffect, useCallback, useRef } from 'react';
import { listen } from '@tauri-apps/api/event';
import { supabase } from './lib/supabase';
import { useAuth } from './contexts/AuthContext';
import Preferences from './components/Preferences';
import { logger } from './lib/logger';
import './styles.css';

// Allowed event names for IPC validation
const ALLOWED_EVENTS = ['sign-out-user', 'navigate-to-preferences'] as const;

// Validates that an event name is in the allowlist
const isValidEvent = (eventName: string): boolean => {
  return ALLOWED_EVENTS.includes(eventName as any);
};

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

// Event payload type definitions for type safety
interface SignOutEvent {
  // Currently empty, but typed for future use
}

interface NavigateToPreferencesEvent {
  // Currently empty, but typed for future use
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
  
  // Rate limiting for IPC events
  const lastEventTime = useRef<Record<string, number>>({});
  
  // Store unlisten functions in refs to prevent re-registration
  const signOutUnlistenRef = useRef<(() => void) | null>(null);
  const prefsUnlistenRef = useRef<(() => void) | null>(null);
  
  // Stable wrappers for actions to avoid effect dependencies
  const signOutRef = useRef(signOut);
  const setShowPreferencesRef = useRef(setShowPreferences);
  
  // Keep refs updated
  useEffect(() => {
    signOutRef.current = signOut;
    setShowPreferencesRef.current = setShowPreferences;
  }, [signOut, setShowPreferences]);

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
      logger.error(error, { context: 'load_tasks' });
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
      logger.error(error, { context: 'cleanup_tasks' });
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
          logger.error(error, { context: 'load_preferences' });
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
        logger.error(error, { context: 'load_user_preferences' });
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
    // Listen for menu events from macOS menubar with validation
    // Run once on mount with empty dependency array to prevent re-registration
    logger.debug('Setting up menu listeners');
    
    (async () => {
      try {
        // Sign out listener with validation and rate limiting
        const unlistenSignOut = await listen<SignOutEvent>('sign-out-user', () => {
          try {
            // Layer 2: Validate event name
            if (!isValidEvent('sign-out-user')) {
              logger.warn('Invalid event name rejected', { event: 'sign-out-user' });
              return;
            }
            
            // Layer 4: Rate limiting (max once per second)
            const now = Date.now();
            const lastTime = lastEventTime.current['sign-out-user'] || 0;
            if (now - lastTime < 1000) {
              logger.warn('Sign-out event rate limited', { timeSinceLastEvent: now - lastTime });
              return;
            }
            lastEventTime.current['sign-out-user'] = now;
            
            logger.debug('Sign out event received');
            logger.info('Sign out event received', { source: 'menu' });
            signOutRef.current();
          } catch (error) {
            logger.error(error, { context: 'sign_out_event_handler' });
          }
        });
        signOutUnlistenRef.current = unlistenSignOut;

        // Preferences listener with validation and rate limiting
        const unlistenPreferences = await listen<NavigateToPreferencesEvent>('navigate-to-preferences', () => {
          try {
            // Layer 2: Validate event name
            if (!isValidEvent('navigate-to-preferences')) {
              logger.warn('Invalid event name rejected', { event: 'navigate-to-preferences' });
              return;
            }
            
            // Layer 4: Rate limiting (max once per second)
            const now = Date.now();
            const lastTime = lastEventTime.current['navigate-to-preferences'] || 0;
            if (now - lastTime < 1000) {
              logger.warn('Preferences event rate limited', { timeSinceLastEvent: now - lastTime });
              return;
            }
            lastEventTime.current['navigate-to-preferences'] = now;
            
            logger.debug('Preferences event received');
            setShowPreferencesRef.current(true);
          } catch (error) {
            logger.error(error, { context: 'preferences_event_handler' });
          }
        });
        prefsUnlistenRef.current = unlistenPreferences;

        logger.debug('Menu listeners set up successfully');
      } catch (error) {
        logger.error(error, { context: 'setup_event_listeners' });
      }
    })();

    return () => {
      try {
        if (signOutUnlistenRef.current) signOutUnlistenRef.current();
        if (prefsUnlistenRef.current) prefsUnlistenRef.current();
      } catch (error) {
        logger.error(error, { context: 'cleanup_event_listeners' });
      }
    };
  }, []); // Empty dependency array - run once on mount

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
      logger.error(error, { context: 'add_task' });
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
      logger.error(error, { context: 'complete_task' });
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
      logger.error(error, { context: 'undo_completion' });
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