# CST Widget TODO List (v3.1)

This document has been updated after a full code review to reflect the current state of the project and prioritize the most impactful changes.

## High Priority: Core Functionality & Bugs

### [ ] Critical Bug: Fix Moderator Actions in Test UI
> **Problem:** The `handlePendingListClick` function in `.sdk/index.html` does not set the command role to 'mod' before emulating `!approve` or `!reject`.
>
> **Action:** Modify `handlePendingListClick` to set the role to 'mod' to ensure moderators can correctly manage pending tasks. This is essential for testing core functionality.

### [ ] Make Widget Fully Configurable via fieldData
> **Problem:** The `setConfig` function in `state.js` uses hardcoded defaults instead of prioritizing values from `fieldData`.
>
> **Action:** Update `setConfig` to use the values from `fieldData` first and only fall back to defaults if a field is not provided. This is critical for customization.

### [ ] Optimize DOM Rendering
> **Problem:** `renderAllLists` in `ui.js` is inefficiently re-rendering all lists on any state change.
>
> **Action:** Refactor the data-mutating functions in `state.js` (e.g., `addTask`, `updateTask`) to return which list was changed. Then, update the calling code in `widget.js` to only call `UI.renderList` for that specific list.

### [ ] Implement Full PRS Visuals
> **Problem:** The `design.md` requires celebratory effects for each PRS tier, but `triggerConfetti` only fires for the final tier.
>
> **Action:** Enhance `updateProgressBar` in `ui.js` to trigger a visual celebration (like a glowing effect) for each tier reached and ensure confetti fires upon completing any tier.

## Medium Priority: SDK & Development Experience

### [ ] Improve sdk.js Robustness
> **Problem:** The `sdk.js` script lacks robust error handling and isn't structured for potential use in other build tools.
>
> **Action:** Wrap the server initialization in an `if (require.main === module)` block and add `try...catch` blocks around critical file system operations.

### [ ] Address npm audit Vulnerabilities
> **Problem:** `npm install` reported several vulnerabilities.
>
> **Action:** Run `npm audit fix` and manually resolve any remaining issues by updating packages in `package.json`.

## Low Priority: Future Features & Optimizations

### [ ] Develop a Fine-Grained Permission System
> **Concept:** The current system is binary (mod vs. viewer). Plan a system to control who can perform specific actions (e.g., who can complete tasks on a specific list).

### [ ] Optimize checkOfflineUsers
> **Problem:** The current implementation iterates through all tasks every 60 seconds, which is inefficient.
>
> **Action:** Investigate a more performant approach, such as only checking users who haven't been seen in the last N minutes.
