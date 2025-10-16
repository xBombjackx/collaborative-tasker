# CST Widget TODO List (v3 - Post-Refactor)

This document outlines the remaining tasks, bugs, and features for the Collaborative Stream Tasker (CST) widget, updated after a full code review and initial architectural refactoring.

---

## High Priority: Core Functionality & Bugs

-   [ ] **Make Widget Fully Configurable via `fieldData`**:
    -   The `onWidgetLoad` function in `widget.js` correctly receives `fieldData`, but the `setConfig` function in `state.js` uses hardcoded defaults for several key values (e.g., tier thresholds, viewer task limit).
    -   **Action:** Modify `state.js` to prioritize values from `fieldData` and only fall back to defaults if the fields are not provided. This is critical for customization.

-   [ ] **Fix Inconsistent DOM Rendering on State Changes**:
    -   The `renderAllLists` function in `ui.js` currently re-renders every list's content (`renderList`) regardless of which list actually changed.
    -   **Action:** Refactor the main data-mutating functions in `state.js` (e.g., `addTask`, `updateTask`) to return which specific list was changed. The calling code in `widget.js` should then only call `UI.renderList` for that specific list, preventing unnecessary re-renders of unchanged UI components.

-   [ ] **Implement Visual Polish for PRS**:
    -   The `design.md` requires celebratory visual effects (confetti, glowing tiers) when PRS thresholds are met. The `triggerConfetti` function exists in `ui.js` but is only called for the max tier.
    -   **Action:** Enhance `updateProgressBar` in `ui.js` to trigger a visual celebration (e.g., glowing effect) for each tier reached and ensure the confetti fires upon completing *any* tier, not just the final one.

---

## Medium Priority: SDK & Development Experience

-   [ ] **Improve `sdk.js` Robustness**:
    -   The `sdk.js` script starts its server immediately. It should be wrapped in an `if (require.main === module)` block so the file's functions can be exported and used in other build tools without starting the server.
    -   The script lacks robust error handling. For instance, a file-read error in `parseComponents` could crash the process.
    -   **Action:** Add the `require.main` check and wrap critical file system operations in `try...catch` blocks to improve stability.

-   [ ] **Address `npm audit` Vulnerabilities**:
    -   `npm install` reported 12 vulnerabilities (4 high). While not user-facing, these should be addressed to maintain project health.
    -   **Action:** Run `npm audit fix` and manually resolve any remaining vulnerabilities by updating packages in `package.json`.

---

## Low Priority: Future Features & Optimizations

-   [ ] **Develop a Fine-Grained Permission System**:
    -   The current system is binary (mod/broadcaster vs. viewer). The `design.md` hints at more complex permissions.
    -   **Action:** Plan a system (likely managed in `fields.json`) to control who can perform specific actions (e.g., who can complete tasks on a specific list).

-   [ ] **Optimize `checkOfflineUsers`**:
    -   The current implementation iterates through all tasks every 60 seconds. This is inefficient for large task lists.
    -   **Action:** Investigate a more performant approach. For example, only check users who haven't been seen in the last `N` minutes, rather than iterating the entire user list every time.

-   [ ] **Add Session Reset Logic**:
    -   The `design.md` requires a manual "reset session" button in the widget configuration.
    -   **Action:** Add a button to the test UI and a corresponding function in the `CST_API` that clears all tasks and progress points from storage and re-initializes the widget to its default state.

-   [ ] **Channel Points Integration (Phase 2)**:
    -   Plan for the Phase 2 feature of allowing viewers to use channel points to bypass the moderation queue. This requires research into the StreamElements API for channel point redemptions.