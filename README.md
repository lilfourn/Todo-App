# Todo App

A minimalist Tauri desktop todo application with local storage and elegant animations.

## Features

- **Minimalist UI**: Clean, aesthetic design with smooth animations
- **Keyboard Shortcuts**:
  - `Cmd + N` (or `Ctrl + N`): Create new task
  - `Cmd + Z` (or `Ctrl + Z`): Undo last completion
  - `Escape`: Cancel task creation
- **Local Storage**: All tasks persist locally using Tauri's filesystem
- **Progress Tracking**: Animated progress bar showing daily completion
- **Smart Task Management**:
  - Tasks marked as "late" after 24 hours (if uncompleted)
  - Completed tasks automatically removed after 48 hours
  - Undo system keeps last 10 completed tasks
- **Auto-cleanup**: Runs hourly to manage task lifecycle

## Tech Stack

- **Frontend**: React 19 + TypeScript + Vite
- **Desktop**: Tauri 2.x
- **Styling**: Custom CSS with animations
- **Storage**: Tauri Plugin FS

## Development

```bash
# Install dependencies
npm install

# Run development server
npm run tauri dev

# Build for production
npm run tauri build
```

## Project Structure

```
todo-app/
├── src/
│   ├── App.tsx          # Main application logic
│   ├── styles.css       # Minimalist styling with animations
│   └── main.tsx         # React entry point
├── src-tauri/
│   ├── src/main.rs      # Tauri backend
│   ├── Cargo.toml       # Rust dependencies
│   └── tauri.conf.json  # App configuration
└── package.json
```

## How It Works

1. **Task Creation**: Press Cmd+N to create a new task
2. **Task Completion**: Click the checkbox to mark as complete
3. **Undo**: Accidentally completed? Press Cmd+Z to restore
4. **Automatic Cleanup**:
   - After 24 hours: Uncompleted tasks are marked as "late"
   - After 48 hours: Completed tasks are permanently removed
5. **Persistence**: All data stored locally in app data directory

## License

MIT
