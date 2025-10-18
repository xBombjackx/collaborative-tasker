# Roadmap: Collaborative Stream Tasker (CST)

This document outlines the development roadmap for the Collaborative Stream Tasker (CST) widget. It is designed to guide development from the current MVP state to a feature-rich, multi-platform tool for community engagement.

---

## Phase 1: Stabilization & Core Feature Polish (Current Focus)

This phase is focused on addressing critical bugs, improving core functionality based on the initial design, and enhancing the development experience. The goal is to create a stable and fully configurable MVP.

### Key Objectives:
-   **Achieve Full MVP Functionality:** Ensure all features described in the `design.md` are working as intended.
-   **Improve Stability & Performance:** Refactor critical code paths for efficiency and robustness.
-   **Enhance Developer Experience:** Streamline the SDK and resolve dependencies.

### Tasks:
-   [ ] **Bug Fixes:**
    -   **Critical:** Fix moderator actions (`!approve`, `!reject`) in the test UI by correctly setting the user role to `mod`.
    -   Resolve all `npm audit` vulnerabilities to ensure a secure and stable dependency tree.
-   [ ] **Core Functionality:**
    -   **Configuration:** Make the widget fully configurable via `fieldData` by updating `state.js` to prioritize streamer settings over hardcoded defaults.
    -   **PRS Visuals:** Implement the full visual feedback for the Progress Reward System, including celebratory effects (e.g., confetti, glowing tiers) for *each* tier reached.
-   [ ] **Performance & SDK:**
    -   **Rendering:** Optimize DOM rendering by refactoring `state.js` and `widget.js` to only re-render the specific list that has changed, rather than all lists.
    -   **SDK Robustness:** Improve `sdk.js` with better error handling and structure it to be portable for other build tools.

---

## Phase 2: Enhanced Interactivity & Platform Integration

With a stable MVP, this phase focuses on expanding the widget's feature set to create a more dynamic and engaging experience, with a focus on platform-specific integrations for Twitch and YouTube.

### Key Objectives:
-   Introduce monetization and engagement paths for specific platforms.
-   Provide richer visual and audio feedback for in-stream events.
-   Begin building out a more granular permissions system.

### Features:
-   [ ] **Twitch Integration: Channel Points**
    -   Allow viewers to spend channel points on a custom reward to bypass the moderation queue for task submissions.
    -   Create a separate, smaller priority queue for these tasks.
-   [ ] **YouTube Integration: Super Chat / Super Stickers**
    -   Implement a feature where viewers who use Super Chat or Super Stickers can have their task highlighted or prioritized.
    -   This provides a monetization path for YouTube creators.
-   [ ] **Customizable Alerts & Notifications**
    -   Create new components (via the `components` system) for on-screen alerts that trigger when:
        -   A viewer's task is approved.
        -   A PRS tier is reached.
        -   A community goal is completed.
-   [ ] **Fine-Grained Permission System**
    -   Begin planning and implementing a system (configurable in `fields.json`) to allow streamers to define who can perform specific actions (e.g., allow VIPs to bypass the moderation queue).

---

## Phase 3: Gamification & Long-Term Engagement

This phase aims to transform the widget from a session-based tool into a long-term community engagement system that encourages recurring participation.

### Key Objectives:
-   Introduce features that reward long-term participation.
-   Foster a sense of friendly competition and community achievement.
-   Provide streamers with more tools to manage community-wide goals.

### Features:
-   [ ] **Viewer Leaderboards**
    -   Implement a persistent leaderboard that tracks and displays which viewers have completed the most tasks over a set period (e.g., weekly, monthly, all-time).
    -   Add chat commands like `!toptasks` to display the leaders.
-   [ ] **Task Streaks**
    -   Reward viewers for completing at least one task across multiple consecutive streams.
    -   Display a "streak" icon next to their name on the task list.
-   [ ] **Community Goals**
    -   Allow the streamer to set a community-wide task goal (e.g., "Complete 15 viewer tasks to unlock a giveaway").
    -   Create a separate UI element to track progress toward this goal.
-   [ ] **Task History & Stats**
    -   Implement a command (`!mystats`) for viewers to see their personal task history and completion rate.

---

## Multi-Platform Strategy

To support multiple streaming platforms without creating a cluttered and unmaintainable codebase, the project will adopt a modular architecture:

1.  **Core Widget:** The main `widget` directory will remain the platform-agnostic foundation, containing the core UI, state management, and command parsing logic.
2.  **Platform-Specific Modules:** Platform-specific features will be developed in separate, isolated modules (e.g., `integrations/twitch.js`, `integrations/youtube.js`).
3.  **Conditional Loading:** The main `widget.js` will detect the platform it is running on and conditionally load the appropriate integration module. This ensures that only relevant code is executed and makes it easier to add support for new platforms (e.g., TikTok) in the future.