# CST Widget TODO List

This document outlines the necessary improvements, bug fixes, and future features for the Collaborative Stream Tasker (CST) widget. This is based on a code review performed on YYYY-MM-DD.

## High Priority: Core Functionality & Refactoring

-   [ ] **Implement Multiple List Support:**
    -   Refactor `widget.js` to handle an array/object of lists instead of hardcoded `streamerTasks` and `viewerTasks`.
    -   Each list should have its own properties (e.g., `name`, `tasks`, `permissions`).
    -   Update `widget.html` to dynamically render all lists.
-   [ ] **Create a Comprehensive Test UI:**
    -   Modify `.sdk/index.html` to be a full-featured testing suite.
    -   Add buttons/inputs to simulate every chat command (`!task`, `!approve`, `!status`, `!addtask`).
    -   Add controls to directly manipulate widget state (add/complete tasks for any list, change progress bar).
-   [ ] **Universal Task Addition Command:**
    -   Implement a new command like `!addtask [listName] [task description]` to allow users to add tasks to any list.
    -   Permissions will be handled in a later stage, but the basic functionality should be there.

## Medium Priority: Code Quality & Feature Completion

-   [ ] **Remove Hardcoded Values:**
    -   The viewer task limit (currently `3`) should be a configurable field in `fields.json`.
    -   PRS Tier thresholds (`3`, `7`, `12`) should be configurable.
    -   The offline user threshold (`5 minutes`) should be configurable.
-   [ ] **Improve User Feedback:**
    -   Implement chat confirmations for all commands, both successful and failed attempts (e.g., "Your task has been submitted for approval," "You already have an active task," "The viewer task list is full.").
    -   This is a requirement from the `design.md` that is not fully implemented.
-   [ ] **Complete Streamer Task Functionality:**
    -   The `design.md` specifies that streamer tasks should be managed from the Widget Config Panel. The current implementation uses UI buttons that were not in the design. This needs to be reconciled.
    -   Decide on a single source of truth for streamer task management.
-   [ ] **Visual Polish & PRS Feedback:**
    -   Implement the visual feedback for the Progress Reward System as specified in `design.md` (e.g., celebratory visual effect on task completion, tier completion animations/sounds).

## Low Priority: Future Features & Optimizations

-   [ ] **Develop a Permission System:**
    -   Create a system to define who can add/edit/complete tasks on each list (e.g., `everyone`, `mods`, `streamer`, `specific users`).
-   [ ] **Refactor `widget.js`:**
    -   Improve code modularity by separating concerns (e.g., UI rendering, data management, event handling).
    -   Add JSDoc comments to explain complex functions.
-   [ ] **Optimize `checkOfflineUsers`:**
    -   The current implementation iterates over all viewer tasks every minute. This could be optimized, perhaps by only checking users who haven't been seen recently.
-   [ ] **Channel Points Integration:**
    -   Begin planning for the Phase 2 feature of allowing viewers to use channel points to bypass the moderation queue.
-   [ ] **Persistence & Reset Logic:**
    -   Ensure the "persist across stream restarts within the same day/session" feature from `design.md` is fully implemented and robust. Add a manual "reset session" button for the streamer in the config.