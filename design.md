# Product Design Document: Collaborative Stream Tasker (CST)

**Version:** 1.0 (Minimum Viable Product - MVP)
**Status:** PDD Draft

## Overview

### Key Project Data

| Key                  | Value                                         |
| :------------------- | :-------------------------------------------- |
| **Product Name**     | Collaborative Stream Tasker (CST)             |
| **Primary Platform** | OBS/Streamlabs via StreamElements Widget      |
| **Target Users**     | Streamer (Primary), Live Viewers (Secondary)  |

---

## 1. Goals and Success Metrics

### 1.1 Project Goals
The primary goal of the Collaborative Stream Tasker is to increase viewer engagement and stream session retention during working live sessions by establishing a shared sense of productivity and accountability. This feature creates a unique, co-working experience for the community.

### 1.2 Success Metrics (Key Performance Indicators - KPIs)
The success of the MVP will be measured by the following metrics:
-   **Task Completion Rate (Primary KPI):** The ratio of viewer-submitted tasks completed versus the total number of viewer-submitted tasks approved.
-   **Viewer Task Submission Rate:** The average number of viewer tasks submitted per stream session.
-   **Average Session Duration:** Track changes in how long viewers stay after interacting with the task feature.

---

## 2. Product Overview and Use Cases
The Collaborative Stream Tasker will be a single, customizable web overlay (StreamElements Widget) displayed on the streamer's screen, containing two distinct lists: one for the Streamer's personal work and one for the Viewers' tasks.

### 2.1 Core User Flows

| User Type         | Action                                                                                             | System Response                                                                                                     |
| :---------------- | :------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------ |
| **Streamer**      | **Streamer Task Management:** Add/Edit/Complete/Delete their own tasks via the Widget Config Panel.  | Updates the Streamer Task List overlay instantly.                                                                   |
| **Viewer**        | **Task Submission:** Submits a task via a designated chat command (e.g., `!task [description]`).     | Task enters a Pending Approval queue. Viewer receives an instant chat confirmation.                                 |
| **Mod/Streamer**  | **Task Approval:** Approves a pending viewer task via a designated command (e.g., `!approve [user]`).| Task appears on the Viewer Task List overlay. Viewer receives an in-chat notification: "Your task has been approved!" |
| **Viewer**        | **Task Update:** Updates their task status via a command (e.g., `!status complete` or `!status pause`). | Status updates instantly on the Viewer Task List overlay (strikethrough or "Paused" label). Viewer receives an in-chat confirmation. |

### 2.2 Key Feature Requirements

| Feature Category        | Description                                                                                                                            |
| :---------------------- | :------------------------------------------------------------------------------------------------------------------------------------- |
| **Accountability & Reward** | Implement a simple visual progress tracker that advances every time any task (streamer or viewer) is marked `Complete`.              |
| **Streamer Task List**  | Dedicated section for the Streamer. Must include a prominent Session Summary line (editable via the widget panel).                     |
| **Viewer Task List**    | Dedicated section with a strict limit of 3 visible tasks at any one time.                                                              |
| **Persistence**         | Tasks should persist across stream restarts within the same day/session.                                                               |
| **Viewer Presence**     | If a viewer with an active task leaves chat, their task should be grayed out/hidden until they return.                                  |

---

## 3. Technical Implementation (StreamElements Widget)

### 3.1 Platform and Hosting
The solution will be a StreamElements Custom Widget, executed as a custom Browser Source URL in OBS/Streamlabs.

### 3.2 Data Storage and Logic
Task data will be stored and managed using the StreamElements Widget `$API` (a simple key-value store tied to the widget).

### 3.3 Chat Commands (MVP)

| Command                  | User Role      | Action                                                              |
| :----------------------- | :------------- | :------------------------------------------------------------------ |
| `!task [Task Title]`     | Viewer         | Submits a task to the Pending Queue.                                |
| `!status [complete/pause]` | Viewer         | Updates the status of their currently active approved task.         |
| `!approve [ViewerName]`  | Mod/Streamer   | Moves a task from the Pending Queue to the Viewer Task List.        |
| `!reject [ViewerName]`   | Mod/Streamer   | Removes a task from the Pending Queue.                              |
| `!donetask [ViewerName]` | Mod/Streamer   | Marks any active viewer task as complete.                           |

---

## 4. User Interface (UI) and Design Requirements
The overlay design must be clean, highly readable, and customizable via the StreamElements configuration panel (colors, font, size).

### 4.1 Streamer Task List
-   **Header/Summary:** Large, prominent text area for the Streamer's Session Summary.
-   **Tasks:** A simple bulleted list of the streamer's tasks.
-   **Style:** Tasks marked complete must display a strike-through (e.g., ~~Completed Task~~).

### 4.2 Viewer Task List
-   **Limit:** Only the 3 most recently approved tasks should be visible.
-   **Elements Per Task:** Status Indicator, Viewer Name, and Task Title.
-   **Status Visuals:**
    -   "To Do" / "Paused": Normal text.
    -   "Complete": Text is struck-through and may fade slightly.
    -   "Offline" State: If the submitting user is not in chat, the task text should be grayed out.

### 4.3 Task Approval Queue & Notification
-   **Approval:** Handled off-screen by the Streamer/Mod using chat commands.
-   **Notification:** When a viewer submits a task, the bot must send a chat message confirming receipt and stating it is "pending approval."

---

## 5. Future Considerations (Phase 2 Roadmap)
-   **Channel Points Integration:** Allow viewers to use a Channel Points Reward to bypass the moderation queue.
-   **Repetitive Tasks (Streamer):** Option in the config panel to designate tasks that reset to "To Do" after a stream session ends.
-   **Task History:** Implement a back-end to track and display total tasks completed over time, visible via a `!totaldone` command.

---

## 6. Progress Reward System (PRS) Design
The PRS is a shared accountability meter that advances whenever any task is marked `Complete`.

### 6.1 Concept: The Shared Success Meter

| Element        | Description                                                                                             |
| :------------- | :------------------------------------------------------------------------------------------------------ |
| **Visual**     | A horizontal or vertical bar/meter that fills up as tasks are completed.                                |
| **Reward Tiers** | The bar is divided into Tiers. Hitting a Tier unlocks a designated community reward.                   |
| **Reset**      | The bar resets at the start of every new stream session.                                                |
| **Reward Mechanic** | Every single task (Streamer or Viewer) marked `Complete` counts as 1 point toward filling the bar. |

### 6.2 Mechanics and Logic
-   **Task Value:** 1 completed task = 1 Progress Point (PP).
-   **Tier Thresholds (MVP Defaults):**
    -   Tier 1: 3 PP
    -   Tier 2: 7 PP
    -   Tier 3 (Max): 12 PP
-   **Visual Feedback on Completion:** When a task is completed, the bar fills proportionally, and a small celebratory visual effect (e.g., confetti) overlays the bar for 1-2 seconds.
-   **Tier Completion Feedback:** The system should trigger a prominent visual/audio cue and send a custom chat message from the bot (e.g., "Focus Bar TIER 1 REACHED!").

### 6.3 Visual Design Requirements
-   **Location:** The bar should be positioned prominently on the stream overlay.
-   **Aesthetics:** Use a "Level Up" or "Energy Bar" aesthetic.
-   **Display:** Clearly display the current task count and the total goal (e.g., "7/12 Tasks Completed").
-   **Tier Markers:** Distinct lines or icons should be visible on the bar itself.
-   **Tier Fulfillment:** Once a Tier is reached, that segment of the bar should visually change (e.g., glow, change to gold).

---

## 7. Development and Delivery Plan
**Estimated Total Development Time:** Approximately 14.5 Days

### Phase 1: Core Streamer Widget & Viewer Submission (MVP)

| Task ID | Task Description                     | Estimated Time |
| :------ | :----------------------------------- | :------------- |
| P1.1    | Widget Setup & Core Data Structure   | 1 day          |
| P1.2    | Streamer Task List UI & Logic        | 1.5 days       |
| P1.3    | Streamer Task Completion Logic       | 0.5 day        |
| P1.4    | Viewer Task Submission Handler       | 1 day          |
| P1.5    | Viewer Submission Notification       | 0.5 day        |
| P1.6    | Basic Overlay Styling                | 1 day          |

### Phase 2: Moderation, Viewer List & Accountability

| Task ID | Task Description                     | Estimated Time |
| :------ | :----------------------------------- | :------------- |
| P2.1    | Approval/Rejection Commands          | 1 day          |
| P2.2    | Viewer Task List Display             | 1 day          |
| P2.3    | Viewer Status Update Command         | 1.5 days       |
| P2.4    | Viewer Presence Tracking             | 2 days         |
| P2.5    | Progress Reward System (PRS) Logic   | 1 day          |
| P2.6    | Progress Reward System (PRS) UI      | 1 day          |

### Phase 3: Polish and Future Features

| Task ID | Task Description                     | Estimated Time |
| :------ | :----------------------------------- | :------------- |
| P3.1    | PRS Tier Trigger & Feedback          | 1 day          |
| P3.2    | Visual Polish & Customization        | 1.5 days       |
| P3.3    | Persistence & Reset Logic            | 1 day          |
| P3.4    | Channel Points Integration (Prep)    | 0.5 day        |