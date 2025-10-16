# CST Widget TODO List (v2)

This document outlines the refactoring tasks, bug fixes, and feature implementations needed to advance the Collaborative Stream Tasker (CST) widget.

---

## High Priority: Refactoring & Core Bugs

-   [ ] **Modularize `widget.js`**:
    -   Break down the single `widget.js` file into smaller, focused modules (e.g., `state.js` for data management, `ui.js` for rendering, `commands.js` for chat command logic). This will improve maintainability.
-   [ ] **Fix Redundant Code**:
    -   Remove the duplicate `addAlert` and `addMessage` function declarations at the bottom of `widget.js` to prevent potential errors and confusion.
-   [ ] **Implement Efficient DOM Updates**:
    -   Refactor the rendering functions (`renderAllLists`, `renderList`) to update only the specific elements that change, instead of re-rendering the entire list on every update.
-   [ ] **Centralize Test UI Functions**:
    -   Avoid polluting the global `window` object. Group all functions intended for the test UI (`addList`, `deleteList`, etc.) under a single object, like `window.CST_API`.

---

## Medium Priority: Feature Implementation & Configuration

-   [ ] **Make Widget Fully Configurable**:
    -   Remove hardcoded values from `widget.js`.
    -   Update the `onWidgetLoad` function to correctly pull PRS Tier thresholds (`tier1Threshold`, `tier2Threshold`, `tier3Threshold`) and the `viewerTaskLimit` from `fieldData`.
-   [ ] **Implement User Feedback System**:
    -   As required by `design.md`, create a system to send chat confirmations for all command actions (e.g., `!task`, `!approve`, `!reject`, `!status`).
    -   The feedback should cover both successful actions and errors (e.g., "Task list is full," "You already have a pending task.").
-   [ ] **Add Visual Polish for PRS**:
    -   Implement the celebratory visual effects for task and tier completion as specified in `design.md` (e.g., confetti effect, glowing tier markers).
-   [ ] **Enhance Test UI (`.sdk/index.html`)**:
    -   Add controls to simulate every chat command listed in `design.md`.
    -   Add a section to display a guide for all available commands for easy reference.
    -   Improve the overall styling to make it more user-friendly.

---

## Low Priority: Future Features & Optimizations

-   [ ] **Develop a Permission System**:
    -   Create a system to define who can add/edit/complete tasks on each list (e.g., everyone, mods, streamer). This could be managed via `fields.json`.
-   [ ] **Optimize `checkOfflineUsers`**:
    -   Investigate more performant ways to check for offline users, potentially reducing how often the check runs or how it iterates through tasks.
-   [ ] **Channel Points Integration**:
    -   Begin planning for the Phase 2 feature of allowing viewers to use channel points to bypass the moderation queue.
-   [ ] **Add Session Reset Logic**:
    -   Implement a manual "reset session" button in the widget configuration that clears all tasks and progress, as mentioned in the `design.md`'s persistence requirement.
