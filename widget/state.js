// widget/state.js

// Main data structure
let lists = {};
let pendingTasks = [];
let progressPoints = 0;

// Configurable settings from SE Fields
let config = {};

function getLists() {
    return lists;
}

function getPendingTasks() {
    return pendingTasks;
}

function getProgressPoints() {
    return progressPoints;
}

function setInitialState(initialData) {
    lists = initialData.lists || {};
    pendingTasks = initialData.pendingTasks || [];
    progressPoints = initialData.progressPoints || 0;
}

function setConfig(fieldData) {
    config = {
        sessionSummary: fieldData.sessionSummary || "Session Goals",
        tierThresholds: {
            tier1: fieldData.tier1Threshold || 3,
            tier2: fieldData.tier2Threshold || 7,
            tier3: fieldData.tier3Threshold || 12,
        },
        viewerTaskLimit: fieldData.viewerTaskLimit || 3,
        offlineThreshold: 5 * 60 * 1000,
        defaultListName: "Viewers",
    };
    return config;
}

function getConfig() {
    return config;
}

function findTaskByUsername(username) {
    for (const listName in lists) {
        const task = lists[listName].tasks.find(
            (t) => t.username && t.username.toLowerCase() === username.toLowerCase()
        );
        if (task) {
            return { task, listName };
        }
    }
    return { task: null, listName: null };
}

function addList(listName, summary = "") {
    if (!listName.trim() || lists[listName]) return false;
    lists[listName] = {
        tasks: [],
        summary: summary || listName,
    };
    saveData();
    return true;
}

function deleteList(listName) {
    if (!lists[listName]) return false;
    delete lists[listName];
    saveData();
    return true;
}

function addTask(listName, taskData) {
    if (!lists[listName]) return false;
    lists[listName].tasks.push(taskData);
    saveData();
    return true;
}

function updateTask(listName, taskIndex, updates) {
    const task = lists[listName]?.tasks[taskIndex];
    if (!task) return false;
    Object.assign(task, updates);
    saveData();
    return true;
}

function removeTask(listName, taskIndex) {
    if (!lists[listName]?.tasks[taskIndex]) return false;
    lists[listName].tasks.splice(taskIndex, 1);
    saveData();
    return true;
}

function addPendingTask(username, taskText) {
    const defaultListName = getConfig().defaultListName || "Viewers";
    const existingTask = pendingTasks.some(t => t.username.toLowerCase() === username.toLowerCase()) ||
        (lists[defaultListName] && lists[defaultListName].tasks.some(t => t.username && t.username.toLowerCase() === username.toLowerCase()));
    if (existingTask) {
        return { success: false, reason: "existing" };
    }
    if (pendingTasks.length >= 100) { // Limit pending queue
        return { success: false, reason: "full" };
    }
    pendingTasks.push({ username, task: taskText, status: "pending" });
    saveData();
    return { success: true };
}

function findPendingTask(username) {
    return pendingTasks.find(t => t.username.toLowerCase() === username.toLowerCase());
}

function removePendingTask(username) {
    const initialLength = pendingTasks.length;
    pendingTasks = pendingTasks.filter(t => t.username.toLowerCase() !== username.toLowerCase());
    if (pendingTasks.length < initialLength) {
        saveData();
        return true;
    }
    return false;
}

function incrementProgress() {
    progressPoints++;
    saveData();
    return progressPoints;
}

function setProgress(points) {
    progressPoints = points;
    saveData();
}

function saveData() {
    const dataToStore = {
        lists,
        pendingTasks,
        progressPoints,
    };
    SE_API.store.set("cst_data", dataToStore);
    console.log("Data saved:", dataToStore);
}

function loadData() {
    return SE_API.store.get("cst_data");
}

function resetState() {
    lists = {};
    pendingTasks = [];
    progressPoints = 0;
    saveData();
}

export {
    config,
    getLists,
    getPendingTasks,
    getProgressPoints,
    setInitialState,
    setConfig,
    getConfig,
    findTaskByUsername,
    addList,
    deleteList,
    addTask,
    updateTask,
    removeTask,
    addPendingTask,
    findPendingTask,
    removePendingTask,
    incrementProgress,
    setProgress,
    saveData,
    loadData,
    resetState,
};