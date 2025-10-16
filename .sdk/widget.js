document.addEventListener("DOMContentLoaded", function () {
  // Mock SE_API for local development
  if (typeof SE_API === "undefined") {
    console.log("SE_API is not defined. Mocking for local development.");
    window.SE_API = {
      store: {
        get: function (key) {
          return new Promise(resolve => {
            const data = sessionStorage.getItem(key);
            resolve(data ? JSON.parse(data) : null);
          });
        },
        set: function (key, value) {
          return new Promise(resolve => {
            sessionStorage.setItem(key, JSON.stringify(value));
            resolve();
          });
        }
      }
      // You can mock other SE_API functions here as needed
    };
  }

  // Main data structure
  let lists = {};
  let pendingTasks = [];
  let progressPoints = 0;

  // Configurable settings from SE Fields
  let config = {};
  window.addEventListener("onWidgetLoad", function (obj) {
    console.log("onWidgetLoad event fired");
    const fieldData = obj.detail.fieldData;

    // --- Configuration Loading ---
    config = {
      sessionSummary: fieldData.sessionSummary || "Session Goals",
      tierThresholds: {
        tier1: fieldData.tier1Threshold || 3,
        tier2: fieldData.tier2Threshold || 7,
        tier3: fieldData.tier3Threshold || 12
      },
      viewerTaskLimit: fieldData.viewerTaskLimit || 3,
      offlineThreshold: 5 * 60 * 1000,
      // 5 minutes, not currently configurable
      defaultListName: "Viewers" // The list for legacy !task command
    };

    // --- Apply Customizations ---
    const root = document.documentElement;
    root.style.setProperty("--background-color", fieldData.backgroundColor);
    root.style.setProperty("--text-color", fieldData.textColor);
    root.style.setProperty("--progress-bar-color", fieldData.progressBarColor);

    // --- Data Loading ---
    SE_API.store.get("cst_data").then(data => {
      if (data && data.lists && Object.keys(data.lists).length > 0) {
        lists = data.lists;
        pendingTasks = data.pendingTasks || [];
        progressPoints = data.progressPoints || 0;
      } else {
        // Initialize with default lists if no data exists
        lists = {
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
          Viewers: {
            tasks: [],
            limit: config.viewerTaskLimit
          }
        };
        pendingTasks = [];
        progressPoints = 0;
      }
      renderAllLists();
      updateProgressBar();
    });
  });
  window.addEventListener("message", function (e) {
    if (e.data.type === "event:received") {
      controller(e.data.detail);
    }
  });
  function controller(detail) {
    if (detail.listener === "message") {
      handleMessage(detail.event);
    }
  }
  function handleMessage(event) {
    const message = event.data.text.trim();
    const command = message.split(" ")[0];
    const args = message.substring(command.length + 1).split(" ");
    const username = event.data.displayName;
    const userRoles = event.data.tags;

    // Update last seen timestamp for any user who sends a message
    Object.values(lists).forEach(list => {
      const userTask = list.tasks.find(t => t.username && t.username.toLowerCase() === username.toLowerCase());
      if (userTask) {
        userTask.lastSeen = Date.now();
        if (userTask.status === "offline") {
          userTask.status = "active"; // They came back online
          renderList(list.name);
        }
      }
    });

    // --- Command Handling ---
    switch (command) {
      case "!addtask":
        const listName = args[0];
        const taskText = args.slice(1).join(" ");
        if (listName && taskText && lists[listName]) {
          // For now, anyone can add to any list. Permissions to be added later.
          lists[listName].tasks.push({
            text: taskText,
            completed: false,
            addedBy: username
          });
          renderList(listName);
          saveData();
        }
        break;
      case "!task":
        if (args[0]) {
          addPendingTask(username, args.join(" "));
        }
        break;
      case "!status":
        updateUserTaskStatus(username, args[0]);
        break;
      case "!approve":
        if (userRoles.mod || userRoles.broadcaster) {
          approvePendingTask(args[0]);
        }
        break;
      case "!reject":
        if (userRoles.mod || userRoles.broadcaster) {
          pendingTasks = pendingTasks.filter(t => t.username.toLowerCase() !== args[0].toLowerCase());
          saveData();
        }
        break;
      case "!donetask":
        if (userRoles.mod || userRoles.broadcaster) {
          // Find the task in ANY list that matches the username
          let taskToComplete, listName;
          for (const name in lists) {
            const task = lists[name].tasks.find(t => t.username && t.username.toLowerCase() === args[0].toLowerCase());
            if (task) {
              taskToComplete = task;
              listName = name;
              break;
            }
          }
          if (taskToComplete && taskToComplete.status !== "completed") {
            taskToComplete.status = "completed";
            incrementProgress();
            renderList(listName);
            saveData();
          }
        }
        break;
    }
  }
  function addPendingTask(username, taskText) {
    const existingTask = pendingTasks.some(t => t.username === username) || lists["Viewers"] && lists["Viewers"].tasks.some(t => t.username === username);
    if (existingTask) {
      console.log(`${username} already has a task.`);
      // TODO: Add chat feedback
      return;
    }
    pendingTasks.push({
      username,
      task: taskText,
      status: "pending"
    });
    saveData();
    console.log(`Task from ${username} added to pending queue: ${taskText}`);
    // TODO: Add chat feedback
  }
  function approvePendingTask(username) {
    const taskToApprove = pendingTasks.find(t => t.username.toLowerCase() === username.toLowerCase());
    if (!taskToApprove) return;

    // Use the default list for legacy !task command, or a configurable one.
    const targetListName = config.defaultListName || "Viewers";
    const targetList = lists[targetListName];
    if (!targetList) {
      console.error(`Default list "${targetListName}" not found for pending task.`);
      // Maybe create it? For now, just error out.
      return;
    }
    const limit = targetList.limit || config.viewerTaskLimit;
    if (targetList.tasks.length < limit) {
      targetList.tasks.push({
        ...taskToApprove,
        status: "active",
        lastSeen: Date.now()
      });
      pendingTasks = pendingTasks.filter(t => t.username.toLowerCase() !== username.toLowerCase());
      renderList(targetListName);
      saveData();
      // TODO: Add chat feedback
    } else {
      console.log(`List "${targetListName}" is full.`);
      // TODO: Add chat feedback
    }
  }
  function updateUserTaskStatus(username, status) {
    // Find the user's task across all lists
    let userTask, listName;
    for (const name in lists) {
      const task = lists[name].tasks.find(t => t.username && t.username.toLowerCase() === username.toLowerCase());
      if (task) {
        userTask = task;
        listName = name;
        break;
      }
    }
    if (userTask && userTask.status !== "completed") {
      if (status === "complete") {
        userTask.status = "completed";
        incrementProgress();
      } else if (status === "pause") {
        userTask.status = "paused";
      }
      renderList(listName);
      saveData();
    }
  }
  function incrementProgress() {
    progressPoints++;
    updateProgressBar();
    // TODO: Add visual celebration
  }
  function updateProgressBar() {
    const progressBar = document.getElementById("progress-bar");
    const progressText = document.getElementById("progress-text");
    const maxPoints = config.tierThresholds.tier3;
    const percentage = Math.min(progressPoints / maxPoints * 100, 100);
    progressBar.style.width = `${percentage}%`;
    progressText.textContent = `${progressPoints}/${maxPoints}`;
    progressBar.className = "progress-bar"; // Reset classes
    if (progressPoints >= config.tierThresholds.tier3) {
      progressBar.classList.add("tier-3-complete");
    } else if (progressPoints >= config.tierThresholds.tier2) {
      progressBar.classList.add("tier-2-complete");
    } else if (progressPoints >= config.tierThresholds.tier1) {
      progressBar.classList.add("tier-1-complete");
    }
  }
  function renderAllLists() {
    const container = document.getElementById("task-lists-container");
    container.innerHTML = "";
    for (const listName in lists) {
      const listData = lists[listName];
      const listWrapper = document.createElement("div");
      listWrapper.className = "task-list-wrapper";
      listWrapper.id = `list-${listName.replace(/\s+/g, "-")}`;
      const title = document.createElement("h2");
      title.textContent = listData.summary || listName;
      listWrapper.appendChild(title);
      const ul = document.createElement("ul");
      listWrapper.appendChild(ul);
      container.appendChild(listWrapper);
      renderList(listName);
    }
  }
  function renderList(listName) {
    const listData = lists[listName];
    if (!listData) return;
    const listId = `list-${listName.replace(/\s+/g, "-")}`;
    const listWrapper = document.getElementById(listId);
    if (!listWrapper) return;
    const ul = listWrapper.querySelector("ul");
    ul.innerHTML = "";
    listData.tasks.forEach((task, index) => {
      const li = document.createElement("li");
      let content = "";
      // Determine content based on task properties
      if (task.username) {
        // Legacy viewer task from !task command
        content = `<span>${task.username}:</span> ${task.task}`;
      } else if (task.addedBy) {
        // Task from !addtask command
        content = `${task.text} <sub>(by ${task.addedBy})</sub>`;
      } else {
        // Simple task (e.g., streamer goal)
        content = task.text;
      }
      li.innerHTML = content;

      // Apply styles based on status
      if (task.completed || task.status === "completed") {
        li.classList.add("completed");
      } else if (task.status === "offline") {
        li.classList.add("offline");
      } else if (task.status === "paused") {
        li.style.fontStyle = "italic";
      }

      // Add dev-only controls for any task for now
      // These are placeholders for better test-ui controls
      const controls = document.createElement("div");
      controls.className = "dev-controls";
      const completeButton = document.createElement("button");
      completeButton.textContent = "✓";
      completeButton.onclick = e => {
        e.stopPropagation();
        window.completeTaskInList(listName, index);
      };
      const deleteButton = document.createElement("button");
      deleteButton.textContent = "X";
      deleteButton.onclick = e => {
        e.stopPropagation();
        window.deleteTaskFromList(listName, index);
      };
      controls.appendChild(completeButton);
      controls.appendChild(deleteButton);
      li.appendChild(controls);
      ul.appendChild(li);
    });
  }
  function saveData() {
    const dataToStore = {
      lists,
      pendingTasks,
      progressPoints
    };
    SE_API.store.set("cst_data", dataToStore);
  }
  function checkOfflineUsers() {
    const now = Date.now();
    let changed = false;
    // Iterate over all lists and all tasks
    for (const listName in lists) {
      const list = lists[listName];
      if (list.tasks) {
        list.tasks.forEach(task => {
          // Check for tasks that have a 'lastSeen' property and are currently 'active'
          if (task.lastSeen && task.status === "active" && now - task.lastSeen > config.offlineThreshold) {
            task.status = "offline";
            changed = true; // Mark that a change occurred
          }
        });
      }
      // If a change happened in this list, re-render it
      if (changed) {
        renderList(listName);
      }
    }
  }
  setInterval(checkOfflineUsers, 60 * 1000);

  // --- Functions for Test UI ---
  window.addList = function (listName, summary = "") {
    if (!listName.trim()) return;
    if (!lists[listName]) {
      lists[listName] = {
        tasks: [],
        summary: summary || listName
      };
      renderAllLists();
      saveData();
    }
  };
  window.deleteList = function (listName) {
    if (lists[listName]) {
      delete lists[listName];
      renderAllLists();
      saveData();
    }
  };
  window.addTaskToList = function (listName, taskText) {
    if (lists[listName] && taskText.trim()) {
      lists[listName].tasks.push({
        text: taskText,
        completed: false
      });
      renderList(listName);
      saveData();
    }
  };
  window.completeTaskInList = function (listName, taskIndex) {
    const task = lists[listName]?.tasks[taskIndex];
    if (task && !task.completed) {
      task.completed = true;
      incrementProgress();
      renderList(listName);
      saveData();
    }
  };
  window.deleteTaskFromList = function (listName, taskIndex) {
    if (lists[listName]?.tasks[taskIndex]) {
      lists[listName].tasks.splice(taskIndex, 1);
      renderList(listName);
      saveData();
    }
  };
  window.setProgressPoints = function (points) {
    progressPoints = points;
    updateProgressBar();
    saveData();
  };

  // --- Test UI Specific ---
  // Simulates a pending task for approval.
  window.addPendingTaskForTest = function (username, task) {
    if (!pendingTasks.some(t => t.username.toLowerCase() === username.toLowerCase())) {
      pendingTasks.push({
        username: username,
        task: task,
        status: "pending"
      });
      saveData();
      // In a real scenario, this would trigger a UI update for mods.
      // For the test UI, we'll just log it.
      console.log(`Added pending task for ${username}`);
    }
  };
  window.getWidgetState = function () {
    return {
      lists,
      pendingTasks,
      progressPoints
    };
  };
  function addAlert(message, user, messageId) {
    const elem = document.createElement("div");
    elem.innerHTML = `<div class="alert" id="m${messageId}">
    <div>${user}</div>
    <span>${message}</span>
</div>`;
    document.getElementById("main-container").appendChild(elem);
  }
  function addMessage(message, username, messageId, userInfo) {
    const elem = document.createElement("div");
    elem.innerHTML = `<div class="message" id="m${messageId}">
    <div>${username}</div>
    <span>${message}</span>
</div>`;
    document.getElementById("main-container").appendChild(elem);
    console.log("Successfully appended message to the DOM " + message);
  }
  if (window.SE_API && window.SE_API.store.get.toString().includes("sessionStorage")) {
    window.dispatchEvent(new CustomEvent("onWidgetLoad", {
      detail: {
        fieldData: {}
      }
    }));
  }
});