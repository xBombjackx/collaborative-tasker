// Streamer Task Management
let streamerTasks = [];
let sessionSummary = "";

// Viewer Task Management
let viewerTasks = [];
let pendingTasks = [];

// PRS Management
let progressPoints = 0;
const tierThresholds = {
    tier1: 3,
    tier2: 7,
    tier3: 12
};

window.addEventListener('onWidgetLoad', function (obj) {
    const fieldData = obj.detail.fieldData;
    sessionSummary = fieldData.sessionSummary;

    // Apply customizations
    const root = document.documentElement;
    root.style.setProperty('--background-color', fieldData.backgroundColor);
    root.style.setProperty('--text-color', fieldData.textColor);
    root.style.setProperty('--progress-bar-color', fieldData.progressBarColor);


    SE_API.store.get('cst_data').then(data => {
        if (data) {
            streamerTasks = data.streamerTasks || [];
            viewerTasks = data.viewerTasks || [];
            pendingTasks = data.pendingTasks || [];
            progressPoints = data.progressPoints || 0;
        } else {
            // Load streamer tasks from config if no stored data
            streamerTasks = [];
            for (let i = 1; i <= 5; i++) {
                if (fieldData[`streamerTask${i}`]) {
                    streamerTasks.push({ text: fieldData[`streamerTask${i}`], completed: false });
                }
            }
        }
        renderStreamerTasks();
        renderViewerTasks();
        renderSessionSummary();
        updateProgressBar();
    });
});

window.addEventListener('message', function(e) {
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
    const command = event.data.text.split(' ')[0];
    const arg = event.data.text.substring(command.length + 1);
    const username = event.data.displayName;
    const userRoles = event.data.tags;

    // Update last seen timestamp for any user who sends a message
    const viewerTask = viewerTasks.find(t => t.username.toLowerCase() === username.toLowerCase());
    if (viewerTask) {
        viewerTask.lastSeen = Date.now();
    }

    // Viewer commands
    if (command === '!task') {
        if (arg) {
            const existingTask = pendingTasks.find(t => t.username === username) || viewerTasks.find(t => t.username === username);
            if (existingTask) {
                console.log(`${username} already has a task.`);
                return;
            }
            pendingTasks.push({ username: username, task: arg, status: 'pending' });
            saveData();
            console.log(`Task from ${username} added to pending queue: ${arg}`);
        }
    } else if (command === '!status') {
        const viewerTask = viewerTasks.find(t => t.username.toLowerCase() === username.toLowerCase());
        if (viewerTask && viewerTask.status !== 'completed') {
            if (arg === 'complete') {
                viewerTask.status = 'completed';
                progressPoints++;
                updateProgressBar();
                renderViewerTasks();
            } else if (arg === 'pause') {
                viewerTask.status = 'paused';
                renderViewerTasks();
            }
            saveData();
        }
    }

    // Moderator/Streamer commands
    if (userRoles.mod || userRoles.broadcaster) {
        if (command === '!approve') {
            const taskToApprove = pendingTasks.find(t => t.username.toLowerCase() === arg.toLowerCase());
            if (taskToApprove) {
                if (viewerTasks.length < 3) {
                    viewerTasks.push({ ...taskToApprove, status: 'active', lastSeen: Date.now() });
                    pendingTasks = pendingTasks.filter(t => t.username.toLowerCase() !== arg.toLowerCase());
                    renderViewerTasks();
                    saveData();
                } else {
                    console.log("Viewer task list is full.");
                }
            }
        } else if (command === '!reject') {
            pendingTasks = pendingTasks.filter(t => t.username.toLowerCase() !== arg.toLowerCase());
            saveData();
        } else if (command === '!donetask') {
            const taskToComplete = viewerTasks.find(t => t.username.toLowerCase() === arg.toLowerCase());
            if (taskToComplete && taskToComplete.status !== 'completed') {
                taskToComplete.status = 'completed';
                progressPoints++;
                updateProgressBar();
                renderViewerTasks();
                saveData();
            }
        }
    }
}

function updateProgressBar() {
    const progressBar = document.getElementById('progress-bar');
    const progressText = document.getElementById('progress-text');
    const maxPoints = tierThresholds.tier3;
    const percentage = (progressPoints / maxPoints) * 100;
    progressBar.style.width = `${percentage}%`;
    progressText.textContent = `${progressPoints}/${maxPoints}`;

    if (progressPoints >= tierThresholds.tier3) {
        progressBar.classList.add('tier-3-complete');
    } else if (progressPoints >= tierThresholds.tier2) {
        progressBar.classList.add('tier-2-complete');
    } else if (progressPoints >= tierThresholds.tier1) {
        progressBar.classList.add('tier-1-complete');
    }
}

function renderViewerTasks() {
    const taskList = document.getElementById('viewer-task-list');
    taskList.innerHTML = '';
    viewerTasks.forEach(task => {
        const li = document.createElement('li');
        li.textContent = `${task.username}: ${task.task}`;
        if (task.status === 'completed') {
            li.classList.add('completed');
        } else if (task.status === 'offline') {
            li.classList.add('offline');
        } else if (task.status === 'paused') {
            li.style.fontStyle = 'italic';
        }
        taskList.appendChild(li);
    });
}

function addStreamerTask(task) {
    streamerTasks.push({ text: task, completed: false });
    renderStreamerTasks();
    saveData();
}

function completeStreamerTask(index) {
    if (!streamerTasks[index].completed) {
        streamerTasks[index].completed = true;
        progressPoints++;
        updateProgressBar();
        saveData();
    }
    renderStreamerTasks();
}

function deleteStreamerTask(index) {
    streamerTasks.splice(index, 1);
    renderStreamerTasks();
    saveData();
}

function renderStreamerTasks() {
    const taskList = document.getElementById('streamer-task-list');
    taskList.innerHTML = '';
    streamerTasks.forEach((task, index) => {
        if (!task.text) return;
        const li = document.createElement('li');
        li.textContent = task.text;
        if (task.completed) {
            li.classList.add('completed');
        }

        const completeButton = document.createElement('button');
        completeButton.textContent = '✓';
        completeButton.onclick = () => completeStreamerTask(index);
        li.appendChild(completeButton);

        taskList.appendChild(li);
    });
}

function saveData() {
    const dataToStore = {
        streamerTasks,
        viewerTasks,
        pendingTasks,
        progressPoints
    };
    SE_API.store.set('cst_data', dataToStore);
}

function checkOfflineUsers() {
    const now = Date.now();
    const offlineThreshold = 5 * 60 * 1000; // 5 minutes
    viewerTasks.forEach(task => {
        if (now - task.lastSeen > offlineThreshold) {
            task.status = 'offline';
        }
    });
    renderViewerTasks();
}

setInterval(checkOfflineUsers, 60 * 1000); // Check every minute

function renderSessionSummary() {
    const summaryElement = document.querySelector('.streamer-tasks h2');
    if (summaryElement) {
        summaryElement.textContent = sessionSummary;
    }
}