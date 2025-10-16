// Mock SE_API for local development
if (typeof SE_API === 'undefined') {
  console.log("SE_API is not defined. Mocking for local development.");
  window.SE_API = {
    store: {
      get: function (key) {
        return new Promise((resolve) => {
          const data = sessionStorage.getItem(key);
          resolve(data ? JSON.parse(data) : null);
        });
      },
      set: function (key, value) {
        return new Promise((resolve) => {
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
let sessionSummary = "";

// Configurable settings
let config = {
  tierThresholds: {
    tier1: 3,
    tier2: 7,
    tier3: 12
  },
  viewerTaskLimit: 3,
  offlineThreshold: 5 * 60 * 1000 // 5 minutes
};
window.addEventListener('onWidgetLoad', function (obj) {
  const fieldData = obj.detail.fieldData;

  // Apply fieldData to config
  sessionSummary = fieldData.sessionSummary || "Session Goals";
  config.tierThresholds.tier1 = fieldData.tier1Threshold || 3;
  config.tierThresholds.tier2 = fieldData.tier2Threshold || 7;
  config.tierThresholds.tier3 = fieldData.tier3Threshold || 12;
  config.viewerTaskLimit = fieldData.viewerTaskLimit || 3;

  // Apply customizations
  const root = document.documentElement;
  root.style.setProperty('--background-color', fieldData.backgroundColor);
  root.style.setProperty('--text-color', fieldData.textColor);
  root.style.setProperty('--progress-bar-color', fieldData.progressBarColor);

  // Load data from StreamElements store
  SE_API.store.get('cst_data').then(data => {
    if (data && data.lists) {
      lists = data.lists;
      pendingTasks = data.pendingTasks || [];
      progressPoints = data.progressPoints || 0;
    } else {
      // Initialize with default lists if no data
      lists = {
        "Streamer": {
          tasks: [],
          summary: sessionSummary
        },
        "Viewers": {
          tasks: [],
          limit: config.viewerTaskLimit
        }
      };
      // Load legacy streamer tasks from config
      for (let i = 1; i <= 5; i++) {
        if (fieldData[`streamerTask${i}`]) {
          lists["Streamer"].tasks.push({
            text: fieldData[`streamerTask${i}`],
            completed: false
          });
        }
      }
    }
    renderAllLists();
    updateProgressBar();
  });
});
window.addEventListener('message', function (e) {
  if (e.data.type === 'event:received') {
    controller(e.data.detail);
  }
});
function controller(detail) {
  if (detail.listener === 'message') {
    handleMessage(detail.event);
  }
}
function handleMessage(event) {
  const message = event.data.text.trim();
  const command = message.split(' ')[0];
  const args = message.substring(command.length + 1).split(' ');
  const username = event.data.displayName;
  const userRoles = event.data.tags;

  // Update last seen timestamp for any user who sends a message
  Object.values(lists).forEach(list => {
    const userTask = list.tasks.find(t => t.username && t.username.toLowerCase() === username.toLowerCase());
    if (userTask) {
      userTask.lastSeen = Date.now();
      if (userTask.status === 'offline') {
        userTask.status = 'active'; // They came back online
        renderList(list.name);
      }
    }
  });

  // --- Command Handling ---
  switch (command) {
    case '!addtask':
      const listName = args[0];
      const taskText = args.slice(1).join(' ');
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
    case '!task':
      if (args[0]) {
        addPendingTask(username, args.join(' '));
      }
      break;
    case '!status':
      updateUserTaskStatus(username, args[0]);
      break;
    case '!approve':
      if (userRoles.mod || userRoles.broadcaster) {
        approvePendingTask(args[0]);
      }
      break;
    case '!reject':
      if (userRoles.mod || userRoles.broadcaster) {
        pendingTasks = pendingTasks.filter(t => t.username.toLowerCase() !== args[0].toLowerCase());
        saveData();
      }
      break;
    case '!donetask':
      if (userRoles.mod || userRoles.broadcaster) {
        const taskToComplete = lists["Viewers"].tasks.find(t => t.username.toLowerCase() === args[0].toLowerCase());
        if (taskToComplete && taskToComplete.status !== 'completed') {
          taskToComplete.status = 'completed';
          incrementProgress();
          renderList("Viewers");
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
    status: 'pending'
  });
  saveData();
  console.log(`Task from ${username} added to pending queue: ${taskText}`);
  // TODO: Add chat feedback
}
function approvePendingTask(username) {
  const taskToApprove = pendingTasks.find(t => t.username.toLowerCase() === username.toLowerCase());
  if (taskToApprove) {
    const viewerList = lists["Viewers"];
    if (viewerList.tasks.length < (viewerList.limit || config.viewerTaskLimit)) {
      viewerList.tasks.push({
        ...taskToApprove,
        status: 'active',
        lastSeen: Date.now()
      });
      pendingTasks = pendingTasks.filter(t => t.username.toLowerCase() !== username.toLowerCase());
      renderList("Viewers");
      saveData();
      // TODO: Add chat feedback
    } else {
      console.log("Viewer task list is full.");
      // TODO: Add chat feedback
    }
  }
}
function updateUserTaskStatus(username, status) {
  const viewerTask = lists["Viewers"].tasks.find(t => t.username.toLowerCase() === username.toLowerCase());
  if (viewerTask && viewerTask.status !== 'completed') {
    if (status === 'complete') {
      viewerTask.status = 'completed';
      incrementProgress();
    } else if (status === 'pause') {
      viewerTask.status = 'paused';
    }
    renderList("Viewers");
    saveData();
  }
}
function incrementProgress() {
  progressPoints++;
  updateProgressBar();
  // TODO: Add visual celebration
}
function updateProgressBar() {
  const progressBar = document.getElementById('progress-bar');
  const progressText = document.getElementById('progress-text');
  const maxPoints = config.tierThresholds.tier3;
  const percentage = Math.min(progressPoints / maxPoints * 100, 100);
  progressBar.style.width = `${percentage}%`;
  progressText.textContent = `${progressPoints}/${maxPoints}`;
  progressBar.className = 'progress-bar'; // Reset classes
  if (progressPoints >= config.tierThresholds.tier3) {
    progressBar.classList.add('tier-3-complete');
  } else if (progressPoints >= config.tierThresholds.tier2) {
    progressBar.classList.add('tier-2-complete');
  } else if (progressPoints >= config.tierThresholds.tier1) {
    progressBar.classList.add('tier-1-complete');
  }
}
function renderAllLists() {
  const container = document.getElementById('task-lists-container');
  container.innerHTML = '';
  for (const listName in lists) {
    const listData = lists[listName];
    const listWrapper = document.createElement('div');
    listWrapper.className = 'task-list-wrapper';
    listWrapper.id = `list-${listName.replace(/\s+/g, '-')}`;
    const title = document.createElement('h2');
    title.textContent = listData.summary || listName;
    listWrapper.appendChild(title);
    const ul = document.createElement('ul');
    listWrapper.appendChild(ul);
    container.appendChild(listWrapper);
    renderList(listName);
  }
}
function renderList(listName) {
  const listData = lists[listName];
  if (!listData) return;
  const listId = `list-${listName.replace(/\s+/g, '-')}`;
  const listWrapper = document.getElementById(listId);
  if (!listWrapper) return;
  const ul = listWrapper.querySelector('ul');
  ul.innerHTML = '';
  listData.tasks.forEach((task, index) => {
    const li = document.createElement('li');
    let content = '';
    if (task.username) {
      // Legacy viewer task format
      content = `${task.username}: ${task.task}`;
    } else if (task.addedBy) {
      // New universal task format
      content = `${task.text} (by ${task.addedBy})`;
    } else {
      // Streamer task format
      content = task.text;
    }
    li.textContent = content;

    // Apply styles based on status
    if (task.completed || task.status === 'completed') {
      li.classList.add('completed');
    } else if (task.status === 'offline') {
      li.classList.add('offline');
    } else if (task.status === 'paused') {
      li.style.fontStyle = 'italic';
    }

    // Add dev-only controls for streamer lists for now
    if (listName === 'Streamer') {
      const completeButton = document.createElement('button');
      completeButton.textContent = '✓';
      completeButton.onclick = e => {
        e.stopPropagation();
        window.completeTaskInList(listName, index);
      };
      li.appendChild(completeButton);
    }
    ul.appendChild(li);
  });
}
function saveData() {
  const dataToStore = {
    lists,
    pendingTasks,
    progressPoints
  };
  SE_API.store.set('cst_data', dataToStore);
}
function checkOfflineUsers() {
  const now = Date.now();
  let changed = false;
  if (lists["Viewers"]) {
    lists["Viewers"].tasks.forEach(task => {
      if (task.status === 'active' && now - task.lastSeen > config.offlineThreshold) {
        task.status = 'offline';
        changed = true;
      }
    });
  }
  if (changed) {
    renderList("Viewers");
  }
}
setInterval(checkOfflineUsers, 60 * 1000);

// --- Functions for Test UI ---
window.addList = function (listName) {
  if (!lists[listName]) {
    lists[listName] = {
      tasks: []
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
window.addTaskToList = function (listName, task) {
  if (lists[listName]) {
    lists[listName].tasks.push(task);
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
function addAlert(message, user, messageId) {
  const elem = document.createElement('div');
  elem.innerHTML = `<div class="alert" id="m${messageId}">
    <div>${user}</div>
    <span>${message}</span>
</div>`;
  document.getElementById('main-container').appendChild(elem);
}
function addMessage(message, username, messageId, userInfo) {
  const elem = document.createElement('div');
  elem.innerHTML = `<div class="message" id="m${messageId}">
    <div>${username}</div>
    <span>${message}</span>
</div>
`;
  document.getElementById('main-container').appendChild(elem);
  console.log("Successfully appended message to the DOM " + message);
}