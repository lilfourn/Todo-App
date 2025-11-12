# Todo App

Minimalist Tauri desktop todo app with local storage and smooth animations.

## Installation

```bash
brew tap lilfourn/todoapp
brew install --cask todo-app
```

## Tech Stack

- **Frontend**: React 19 + TypeScript + Vite
- **Desktop**: Tauri 2.9.2 (latest stable)
- **Backend**: Supabase (Authentication & Database)
- **Styling**: Custom CSS with animations
- **Storage**: Tauri Plugin FS 2.1.3
- **Plugins**: Dialog 2.1.3, Deep Link 2.0.1

## How It Works

1. **Task Creation**: Press Cmd+N to create a new task
2. **Task Completion**: Click the checkbox to mark as complete
3. **Undo**: Accidentally completed? Press Cmd+Z to restore
4. **Automatic Cleanup**:
   - After 24 hours: Uncompleted tasks are marked as "late"
   - After 48 hours: Completed tasks are permanently removed
5. **Persistence**: All data stored locally in app data directory

---

Customize as needed.

## License

MIT
