# CST Widget TODO List (v4.0 - Post-Implementation Review)

This document has been updated after a full code review and the completion of the previous TODO list. It outlines the next steps for improving the widget's stability, performance, and feature set.

## High Priority: Build & Stability

### [ ] Fix the Broken Build Process
> **Problem:** The `build` script in `package.json` points to a non-existent file (`.sdk/build.js`), making it impossible to create a production `widget.zip` bundle.
>
> **Action:** Create a new `build.js` script inside the `.sdk/` directory. This script should use a library like `archiver` or `zip-a-folder` to bundle the necessary files (`widget.html`, `widget.css`, `widget.js`, `themes.css`, `generated-components.js`, etc.) into a `widget.zip` file, ready for upload to StreamElements.

### [ ] Add Missing Configuration Fields
> **Problem:** Several values are hardcoded in the widget's source, limiting configurability.
>
> **Action:**
>    1. In `widget/state.js`, move the hardcoded `offlineThreshold` and the pending task limit (currently `100` in `addPendingTask`) into the `config` object.
>    2. Add corresponding fields to `widget/fields.json` (e.g., `offlineTimeout`, `pendingTaskLimit`) with appropriate labels, types, and default values so streamers can configure them.

### [ ] Improve SDK Script Robustness
> **Problem:** The `sdk.js` file has minimal error handling, particularly in file system callbacks, which could cause the development server to crash.
>
> **Action:** Wrap critical file system operations (`fs.readFile`, `fs.writeFile`, `fs.readdir`) within `try...catch` blocks or use their synchronous counterparts with proper error handling. Log any errors using the existing `logger`.

## Medium Priority: Performance & UX

### [ ] Implement Debouncing for State Saves
> **Problem:** The `State.saveData()` function is called after almost every state-changing action, which can lead to excessive writes to `SE_API.store`, especially if multiple actions happen in quick succession.
>
> **Action:** Implement a debouncing mechanism for `saveData()`. Create a single, debounced `saveData` function (e.g., using a simple `setTimeout`/`clearTimeout` pattern) that waits for a short period of inactivity (e.g., 500ms) before persisting the entire state. This will batch multiple changes into a single write operation.

### [ ] Optimize Initial Render
> **Problem:** The initial `onWidgetLoad` function calls `UI.renderAllLists()`, which can be inefficient if there are many lists.
>
> **Action:** Refactor the initial render logic. Instead of one large `renderAllLists()` call, iterate through the lists and call `UI.renderList()` for each one. This will make the initial load feel faster and more responsive.

### [ ] Make Chat Feedback Configurable
> **Problem:** All chat feedback messages are hardcoded within `commands.js`.
>
> **Action:** Add a new group in `fields.json` for "Chat Messages". Add fields for key feedback messages (e.g., `feedbackTaskApproved`, `feedbackTaskCompleted`, `feedbackQueueFull`). Update the `showFeedback` function or the command handlers to use these configured messages, falling back to a default if a field is empty. Use placeholders like `{username}` and `{task}` in the messages.

## Low Priority: Code Refactoring & Future Features

### [ ] Refactor `sdk.js` into Modules
> **Problem:** `sdk.js` is a single, large script responsible for the dev server, file watching, and component parsing.
>
> **Action:** Break `sdk.js` into smaller, more manageable modules. Create a `scripts/` or `sdk_modules/` directory and create separate files for the server (`server.js`), file watcher (`watcher.js`), and component parser (`parser.js`). The main `sdk.js` would then import and orchestrate these modules.

### [ ] Refactor `CST_API` for Command Emulation
> **Problem:** Some functions in the `CST_API` for the test UI still manipulate state directly (e.g., `setProgressPoints`, `addTaskToList`).
>
> **Action:** Refactor the remaining direct-manipulation functions in `window.CST_API` to use the `emulateCommand` function instead. For example, `setProgressPoints(10)` could be changed to `emulateCommand('!setpoints 10', 'broadcaster')` after implementing a `!setpoints` command for mods.

### [ ] Add Animations for Task Status Changes
> **Problem:** When a task's status changes (e.g., to "paused" or "offline"), the visual update is abrupt.
>
> **Action:** In `ui.js`, enhance the `updateTaskAppearance` function. When a status class is added, also add a temporary animation class (e.g., `fade-in-paused`) to smoothly transition the visual change (e.g., color, opacity).