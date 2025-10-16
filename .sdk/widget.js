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

  // --- Apply Customizations ---
  applyCustomizations(fieldData);

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
function applyCustomizations(fieldData) {
  const root = document.documentElement;
  root.style.setProperty("--background-color", fieldData.backgroundColor || '#1E1E1E');
  root.style.setProperty("--text-color", fieldData.textColor || '#FFFFFF');
  root.style.setProperty("--progress-bar-color", fieldData.progressBarColor || '#4CAF50');
}
function initializeDefaultState(config) {
  const defaultListName = config.defaultListName || "Viewers";
  const defaultState = {
    lists: {
      "Stream Goals": {
        tasks: [{
          text: "Example Streamer Task 1",
          completed: false
        }, {
          text: "Example Streamer Task 2",
          completed: false
        }],
        summary: config.sessionSummary
      },
      [defaultListName]: {
        tasks: [],
        limit: config.viewerTaskLimit
      }
    },
    pendingTasks: [],
    progressPoints: 0
  };
  State.setInitialState(defaultState);
  State.saveData();
}
function checkOfflineUsers() {
  const config = State.getConfig();
  const lists = State.getLists();
  const now = Date.now();
  let changed = false;
  for (const listName in lists) {
    const list = lists[listName];
    if (list.tasks) {
      list.tasks.forEach(task => {
        if (task.lastSeen && task.status === "active" && now - task.lastSeen > config.offlineThreshold) {
          task.status = "offline";
          changed = true;
        }
      });
    }
    if (changed) {
      UI.renderList(listName, lists, config);
    }
  }
  if (changed) {
    State.saveData();
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
        backgroundColor: "#222",
        textColor: "#eee",
        progressBarColor: "purple"
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
      event: {
        data: {
          text: message,
          displayName: username,
          tags: tags
        }
      }
    };
    onEventReceived({
      detail: mockEvent
    });
  }
};