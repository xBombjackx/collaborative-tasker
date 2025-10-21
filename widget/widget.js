// widget/widget.js
// Mock SE_API for local development
if (typeof window.SE_API === "undefined") {
  console.log("SE_API is not defined, mocking for local development.");
  window.SE_API = {
    store: {
      get: key => new Promise(resolve => {
        const data = sessionStorage.getItem(key);
        resolve(data ? JSON.parse(data) : null);
      }),
      set: (key, value) => new Promise(resolve => {
        sessionStorage.setItem(key, JSON.stringify(value));
        resolve();
      })
    },
    say: message => {
      console.log(`SE_API.say: ${message}`);
    }
  };
}
import * as State from './state.js';
import * as UI from './ui.js';
import { handleMessage } from './commands.js';
import { addAlert, addMessage } from './generated-components.js';

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

const debouncedSaveData = debounce(State.saveData, 1000);

export { debouncedSaveData };

document.addEventListener("DOMContentLoaded", function () {
  // This is the main entry point for the widget.
  // It sets up event listeners and initializes the widget.

  // --- Event Listeners ---
  window.addEventListener("onWidgetLoad", onWidgetLoad);
  window.addEventListener("onEventReceived", onEventReceived); // SE's new event system
  window.addEventListener("message", onLegacyEventReceived); // Legacy for older test environments

  // --- Initialization ---
  // Check if we're in a local dev environment and trigger a mock load event.
  if (isDevelopmentEnvironment()) {
    mockWidgetLoad();
  }
});
function onWidgetLoad(obj) {
  console.log("onWidgetLoad event fired");
  const fieldData = obj.detail.fieldData;

  // --- Configuration Loading ---
  const config = State.setConfig(fieldData);

  // --- Apply Theme ---
  UI.applyTheme(fieldData.theme || "theme-1");

  // --- Theme Selector ---
  const themeSelect = document.getElementById("theme-select");
  if (themeSelect) {
    themeSelect.value = fieldData.theme || "theme-1";
    themeSelect.addEventListener("change", (event) => {
      const newTheme = event.target.value;
      fieldData.theme = newTheme;
      UI.applyTheme(newTheme);
      SE_API.store.set("collaborative-tasker-data", { ...State.getRawState(), fieldData });
    });
  }

  // --- Data Loading ---
  State.loadData().then(data => {
    if (data && data.lists && Object.keys(data.lists).length > 0) {
      State.setInitialState(data);
    } else {
      // Initialize with default lists if no data exists
      initializeDefaultState(config);
    }
    // --- Initial Render ---
    UI.renderAllLists(State.getLists(), config);
    UI.updateProgressBar(State.getProgressPoints(), config);
  });

  // Start the periodic check for offline users
  setInterval(checkOfflineUsers, 60 * 1000);
}
function onEventReceived({
  detail: event
}) {
  // Primary event handler for StreamElements events
  if (event.listener === "message") {
    handleMessage(event, showFeedback);
  }
  // Handle other events like cheers, subs, etc. here if needed
}
function onLegacyEventReceived(e) {
  // Fallback for older test environments using postMessage
  if (e.data.type === "event:received") {
    onEventReceived(e.data);
  }
}
function initializeDefaultState(config) {
    const defaultListName = config.defaultListName || "Viewers";
    const streamerListName = config.sessionSummary || "Stream Goals";

    // Dynamically create streamer tasks from fieldData
    const streamerTasks = [];
    for (let i = 1; i <= 5; i++) {
        const taskKey = `streamerTask${i}`;
        const taskText = State.getConfig()[taskKey]; // Access config set from fieldData
        if (taskText && taskText.trim() !== "") {
            streamerTasks.push({ text: taskText, completed: false });
        }
    }

    const defaultState = {
        lists: {
            // Only add the streamer list if there are tasks for it
            ...(streamerTasks.length > 0 && {
                [streamerListName]: {
                    tasks: streamerTasks,
                    summary: streamerListName
                }
            }),
            [defaultListName]: {
                tasks: [],
                limit: config.viewerTaskLimit
            }
        },
        pendingTasks: [],
        progressPoints: 0
    };

    State.setInitialState(defaultState);
    debouncedSaveData();
}
function checkOfflineUsers() {
    const config = State.getConfig();
    const lists = State.getLists();
    const now = Date.now();
    const CHECK_INTERVAL = 30 * 1000; // Check each list at most every 30 seconds
    let overallChanged = false;

    for (const listName in lists) {
        const list = lists[listName];
        // Ensure lastChecked is a number, default to 0 if not present for older data
        const lastChecked = list.lastChecked || 0;

        if (now - lastChecked > CHECK_INTERVAL) {
            let listChanged = false;
            if (list.tasks) {
                list.tasks.forEach(task => {
                    if (task.lastSeen && task.status === "active" && now - task.lastSeen > config.offlineThreshold) {
                        task.status = "offline";
                        listChanged = true;
                        overallChanged = true;
                    }
                });
            }
            if (listChanged) {
                UI.renderList(listName, lists, config);
            }
            // Update the last checked time for this list regardless of changes
            list.lastChecked = now;
        }
    }

    if (overallChanged) {
        debouncedSaveData();
    }
}
function showFeedback(message, isError = false) {
  console.log(`[FEEDBACK]${isError ? '[ERROR]' : ''}: ${message}`);

  // Use the StreamElements API to send a chat message
  if (window.SE_API && typeof window.SE_API.say === 'function') {
    window.SE_API.say(message);
  } else {
    console.warn("SE_API.say() is not available. Feedback is only logged to the console.");
  }
}
function isDevelopmentEnvironment() {
  // A simple check to see if we're likely in the test environment
  return window.SE_API && typeof SE_API.store.get === 'function' && SE_API.store.get.toString().includes("sessionStorage");
}
function mockWidgetLoad() {
  // Dispatch a mock onWidgetLoad event for local testing.
  window.dispatchEvent(new CustomEvent("onWidgetLoad", {
    detail: {
      fieldData: {
        // Add any default mock field data here
        tier1Threshold: 5,
        tier2Threshold: 10,
        tier3Threshold: 15,
        viewerTaskLimit: 5,
        theme: "theme-1",
        streamerTask1: "Fix the build process",
        streamerTask2: "Make chat feedback configurable"
      }
    }
  }));
}

// --- Test UI API ---
// Expose a limited API to the window for the test environment.
window.CST_API = {
  addList: (listName, summary) => {
    console.log("CST_API.addList called with:", listName);
    if (State.addList(listName, summary)) {
      UI.renderAllLists(State.getLists(), State.getConfig());
    }
  },
  deleteList: listName => {
    if (State.deleteList(listName)) {
      UI.renderAllLists(State.getLists(), State.getConfig());
    }
  },
  addTaskToList: (listName, taskText) => {
    if (State.addTask(listName, {
      text: taskText,
      completed: false
    })) {
      UI.renderList(listName, State.getLists(), State.getConfig());
    }
  },
  toggleTaskComplete: (listName, taskIndex) => {
    const list = State.getLists()[listName];
    const task = list?.tasks[taskIndex];
    if (task) {
      const wasCompleted = task.completed;
      task.completed = !wasCompleted;
      task.status = task.completed ? "completed" : "active";

      // Update progress points
      const newProgress = wasCompleted ? State.decrementProgress() : State.incrementProgress();

      // Re-render the UI
      UI.renderList(listName, State.getLists(), State.getConfig());
      UI.updateProgressBar(newProgress, State.getConfig());
      debouncedSaveData();
    }
  },
  completeTaskInList: (listName, taskIndex) => {
    const task = State.getLists()[listName]?.tasks[taskIndex];
    if (task && !task.completed) {
      task.completed = true;
      const newProgress = State.incrementProgress();
      UI.renderList(listName, State.getLists(), State.getConfig());
      UI.updateProgressBar(newProgress, State.getConfig());
    }
  },
  deleteTaskFromList: (listName, taskIndex) => {
    if (State.removeTask(listName, taskIndex)) {
      UI.renderList(listName, State.getLists(), State.getConfig());
    }
  },
  setProgressPoints: points => {
    State.setProgress(points);
    UI.updateProgressBar(points, State.getConfig());
  },
  addPendingTaskForTest: (username, task) => {
    State.addPendingTask(username, task);
    // In the test UI, we'll rely on the interval refresh to show this.
  },
  getWidgetState: () => {
    return {
      lists: State.getLists(),
      pendingTasks: State.getPendingTasks(),
      progressPoints: State.getProgressPoints()
    };
  },
  emulateMessage: (message, username = "TestUser", tags = { broadcaster: true }) => {
    const mockEvent = {
      listener: "message",
      data: {
        text: message,
        displayName: username,
        tags: tags
      }
    };
    onEventReceived({
      detail: mockEvent
    });
  },
  resetAllData: () => {
    if (State.resetAllData()) {
        // Re-render everything to reflect the cleared state
        UI.renderAllLists(State.getLists(), State.getConfig());
        UI.updateProgressBar(State.getProgressPoints(), State.getConfig());

        // A simple way to trigger re-initialization with defaults
        // This simulates a fresh load without a full page reload
        mockWidgetLoad();
    }
  }
};