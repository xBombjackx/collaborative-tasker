High Priority: Core Functionality & Testing
[ ] Refactor CST_API for Command Emulation

Problem: Some functions in the CST_API for the test UI still manipulate state directly (e.g., completeTaskInList, addTaskToList). This makes the test environment less accurate.

Action: Refactor the remaining direct-manipulation functions in window.CST_API to use the emulateCommand function instead. For example, completeTaskInList('Stream Goals', 0) could become emulateCommand('!donetask StreamerUserName', 'mod') (assuming streamer tasks eventually get tied to a user or a specific mod command is added for them) or require adding streamer-specific commands if needed. addTaskToList should likely use emulateCommand('!addtask <listName> <taskText>', 'mod').

[ ] Update mockWidgetLoad with Full fieldData

Problem: The mockWidgetLoad function in widget.js used for local testing is missing several configuration fields now present in fields.json (e.g., offlineTimeout, pendingTaskLimit, all feedback messages).

Action: Update the fieldData object within mockWidgetLoad to include realistic default values for all fields defined in widget/fields.json. This ensures the local test environment behaves more like the actual StreamElements environment.

[ ] Fix Theme Selector Save Logic

Problem: The theme selector change event listener in widget.js saves the entire fieldData object back to SE_API.store. This is inefficient and could potentially overwrite configuration changes made externally (e.g., via the StreamElements overlay editor) between widget loads. It also references a non-existent State.getRawState().

Action: Modify the theme selector event listener to only update the theme value. Ideally, this would involve calling a hypothetical State.updateConfigField('theme', newTheme) function which would then trigger debouncedSaveData, or directly using SE_API.store.set with a more targeted update if state doesn't track fieldData directly post-load (which seems to be the case). Remove the reference to State.getRawState().

Medium Priority: Performance & UX
[ ] Optimize Initial Render / Granular List Rendering

Problem: The initial onWidgetLoad function calls UI.renderAllLists(), and adding/deleting lists also redraws everything. While renderList updates individual lists on task changes, the initial paint and structural changes could be more efficient.

Action: Refactor the rendering logic. For initial load, consider rendering lists sequentially instead of via renderAllLists. For list additions/deletions in CST_API (and potentially future commands), modify the UI functions to only add or remove the specific list container from the DOM instead of re-rendering all lists.

[ ] Add Animations for Task Status Changes

Problem: When a task's status changes (e.g., to "paused" or "offline"), the visual update is abrupt.

Action: In ui.js, enhance the updateTaskAppearance function. When a status class (e.g., .offline, .paused, .completed) is added or removed, also add/remove a temporary animation class (e.g., task-status-change-offline) that triggers a short CSS transition or animation for properties like background color, opacity, or text decoration. Ensure the animation duration is reasonable (e.g., 300-500ms).

Low Priority: Code Refactoring & Future Features (Roadmap Alignment)
[ ] Refactor sdk.js into Modules

Problem: sdk.js is a single, large script responsible for the dev server, file watching, component parsing, and SVG processing.

Action: Break sdk.js into smaller, more manageable modules. Create a scripts/ or sdk_modules/ directory and create separate files for the server (server.js), file watcher (watcher.js), component parser (parser.js), and SVG processor (svgProcessor.js). The main sdk.js would then import and orchestrate these modules.

[ ] Implement Granular Permissions System (Aligns with Roadmap Phase 2)

Problem: Command authorization currently relies only on a simple isMod check (mod or broadcaster tags). The roadmap specifies a more flexible role-based system.

Action:

Add new fields to widget/fields.json for configuring permissions (e.g., permissionManageLists: "mod,editor", permissionApproveTasks: "mod", permissionBypassQueue: "vip,subscriber").

Update state.js (setConfig) to load these new fields into the config object.

Create a helper function (e.g., hasPermission(userTags, requiredRolesString) in commands.js or a new permissions.js) that checks if a user's tags meet the requirements defined in the configuration string.

Update the command handlers in commands.js to use this new hasPermission function instead of the basic isMod check.

[ ] Improve sdk.js Error Handling

Problem: The sdk.js file has minimal explicit error handling for file system operations, potentially leading to crashes in the dev server.

Action: Wrap critical file system operations (fs.readFile, fs.writeFile, fs.readdir, fs.copyFileSync, etc.) within try...catch blocks or use promise-based versions with .catch() handlers. Log any errors using the existing logger. (Note: Lower priority as the build seems stable now).