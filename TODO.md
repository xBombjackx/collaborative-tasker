# CST Widget TODO List (v3.2 - Post-Review Update)

This document has been updated after a code review to reflect the current state and prioritize necessary changes.

## High Priority: Core Functionality & Bugs

### [x] Critical Bug: Fix Moderator Actions in Test UI
> **Problem:** The `handlePendingListClick` function in `.sdk/index.html` does not set the command role to 'mod' before emulating `!approve` or `!reject`.
>
> **Action:** Modify `handlePendingListClick` to set the role to 'mod' (e.g., by changing the dropdown or passing correct tags ` { mod: true } `) to ensure moderators can correctly manage pending tasks as intended by the `commands.js` logic. This is essential for testing core functionality.

### [x] Make Widget Fully Configurable via fieldData
> **Problem:** The `setConfig` function in `state.js` uses hardcoded defaults (like thresholds and limits) instead of prioritizing values from `fieldData` passed during `onWidgetLoad`.
>
> **Action:** Update `setConfig` to robustly use the values from `fieldData` first (e.g., `fieldData.tier1Threshold`) and only fall back to defaults if a specific field is not provided or invalid.

### [x] Align Streamer Task Initialization with `fields.json`
> **Problem:** `initializeDefaultState` in `widget.js` creates a hardcoded "Stream Goals" list, ignoring the `streamerTask1`-`streamerTask5` fields defined in `fields.json`.
>
> **Action:** Update `initializeDefaultState` to dynamically create the initial streamer task list. It should iterate through `fieldData.streamerTask1` to `fieldData.streamerTask5`, adding non-empty tasks to a list. Use `fieldData.sessionSummary` for the list's summary title.

### [x] Add Missing Configuration Fields to `fields.json`
> **Problem:** Configurable values like `tier1Threshold`, `tier2Threshold`, `tier3Threshold`, and `viewerTaskLimit` are used in `state.js` `setConfig` but are missing from `widget/fields.json`, preventing user configuration.
>
> **Action:** Add these fields to `widget/fields.json` with appropriate labels (e.g., "Tier 1 Points", "Viewer Task Limit"), types (`number`), sensible default values (e.g., 3, 7, 12, 3), and assign them to a relevant group (e.g., "Progress & Limits" or "Viewer Tasks").

### [x] Implement Full PRS Visuals for Each Tier
> **Problem:** The `design.md` requires visual feedback for *each* PRS tier reached, but `updateProgressBar` in `ui.js` only triggers confetti for the final tier (Tier 3).
>
> **Action:** Enhance `updateProgressBar` in `ui.js`. Trigger a distinct visual effect (e.g., making the tier segment glow briefly, playing a subtle animation/sound) when Tier 1 and Tier 2 thresholds are *first* reached. Ensure confetti or a similar major celebration effect fires upon completing *any* tier, possibly varying the intensity based on the tier achieved.

### [x] Implement `!donetask` Command
> **Problem:** The `design.md` specifies a `!donetask [ViewerName]` command for mods/streamers to mark any active viewer task as complete, but this command is not implemented in `commands.js`.
>
> **Action:** Add a case for `!donetask` in the `handleMessage` function in `commands.js`. This command handler should:
>    1. Check if the user `isMod`.
>    2. Expect a `username` argument (`args[0]`).
>    3. Use `State.findTaskByUsername` to find the specified user's task.
>    4. If found and not already completed, update the task's status to "completed" (`task.completed = true`, `task.status = "completed"`).
>    5. Call `State.incrementProgress()`.
>    6. Call `UI.updateProgressBar(...)` and `UI.renderList(...)`.
>    7. Call `State.saveData()`.
>    8. Provide feedback via `showFeedback`.

### [x] Implement Moderator Task Reset Functionality
> **Problem:** A comment in `handleUpdateStatus` (`commands.js`) mentions mods should be able to reset a completed task, but a `reset` status is not explicitly handled in the `switch` statement.
>
> **Action:** Add a `case 'reset':` within the `switch (status)` block in the `handleUpdateStatus` function (`commands.js`). This case should:
>    1. Check if the `isMod` flag is true.
>    2. Verify that the task's current status is indeed "completed".
>    3. If both conditions are met, set `newStatus = "active"`, `task.completed = false`, and potentially adjust `feedbackMsg` (e.g., `@${username}'s task has been reset.`).
>    4. Ensure progress points are *not* decremented (unless desired, but typically resets don't undo progress).

## Medium Priority: SDK, Dependencies & Rendering Optimization

### [x] Optimize DOM Rendering
> **Problem:** `renderAllLists` in `ui.js` is called frequently (e.g., after `!addtask`, `!addlist`) and inefficiently re-renders all list containers and their contents.
>
> **Action:**
>    1. Refactor data-mutating functions in `state.js` (e.g., `addTask`, `updateTask`, `removeTask`) to return the `listName` that was affected. Functions like `addList` and `deleteList` might not need changes as `renderAllLists` is appropriate there.
>    2. Update the calling code in `commands.js` and `widget.js` (e.g., in `handleAddTask`, `handleUpdateStatus`) to capture the returned `listName` and call `UI.renderList(listName, State.getLists(), State.getConfig())` for that specific list instead of `UI.renderAllLists(...)` when only a single list's content has changed.

### [x] Improve `sdk.js` Robustness
> **Problem:** The `sdk.js` script lacks explicit error handling for file operations and isn't structured ideally for potential reuse as a module.
>
> **Action:** Add `try...catch` blocks around critical file system operations (e.g., `fs.readFileSync`, `fs.writeFileSync`, `fs.copyFileSync`, `fs.readdirSync`) within `sdk.js` functions like `syncAllWidgetFiles`, `widgetToIndex`, `processSVGs`, and `parseComponents`. Log errors using the `logger`. Consider wrapping the server startup logic (`app.listen`) in an `if (require.main === module)` block to allow importing functions from `sdk.js` elsewhere without automatically starting the dev server.

### [x] Address `npm audit` Vulnerabilities
> **Problem:** Project dependencies listed in `package.json` and `package-lock.json` may have known security vulnerabilities.
>
> **Action:** Run `npm audit` in the project directory. Attempt to fix automatically fixable issues using `npm audit fix`. Manually investigate any remaining vulnerabilities, especially high or critical severity ones. This may involve updating specific packages (`npm update <package-name>`) or finding alternative packages if updates are not available or introduce breaking changes. Ensure the application still functions correctly after updates.

## Low Priority: Future Features & Minor Optimizations

### [ ] Optimize `checkOfflineUsers`
> **Problem:** The current implementation in `widget.js` iterates through all tasks in all lists every 60 seconds to check for offline status, which could become inefficient with a large number of tasks.
>
> **Action:** Investigate more performant approaches. Options include: maintaining a timestamp for the last check per list, filtering tasks based on `lastSeen` before iterating, or using a more sophisticated presence tracking mechanism if the platform API allows.

### [ ] Refine `CST_API.completeTaskInList` in Test UI
> **Suggestion:** The test API function `completeTaskInList` in `.sdk/widget.js` directly modifies state (`task.completed = true`) and calls `State.incrementProgress()`. For better consistency and testing of the actual command logic, consider changing this function to instead call `widgetWindow.CST_API.emulateMessage(\`!status complete ${username}\`, username, { /* role tags */ })`. This ensures the full command path is tested.

### [ ] Plan Fine-Grained Permission System
> **Concept:** The current system uses a simple boolean `isMod` check. As outlined in the `ROADMAP.md` (Phase 2), plan a future system allowing more granular control (e.g., VIPs bypassing queue, specific list permissions).
>
> **Action:** Outline potential approaches. This might involve adding configuration options to `fields.json` (e.g., `vipCanBypassQueue: yes/no`, `listManagers: { "List Name": ["user1", "user2"] }`) and updating the logic in `commands.js` to check these configurations based on user roles/tags provided by the event data.