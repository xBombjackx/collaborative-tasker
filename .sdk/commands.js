// widget/commands.js
import * as State from './state.js';
import * as UI from './ui.js';

// This function will be the main entry point for handling chat messages.
function handleMessage(event, showFeedback) {
    const message = event.data.text.trim();
    const command = message.split(" ")[0];
    const args = message.substring(command.length + 1).split(" ");
    const username = event.data.displayName;
    const userRoles = event.data.tags || {};

    // Update user's last seen time on any message
    updateUserLastSeen(username);

    switch (command) {
        case "!addtask":
            if (userRoles.mod || userRoles.broadcaster) {
                const listName = args[0];
                const taskText = args.slice(1).join(" ");
                handleAddTask(username, listName, taskText, showFeedback);
            }
            break;
        case "!task":
            const taskText = args.join(" ");
            handleViewerTask(username, taskText, showFeedback);
            break;
        case "!status":
            const status = args[0];
            handleUpdateStatus(username, status, showFeedback);
            break;
        case "!approve":
            if (userRoles.mod || userRoles.broadcaster) {
                const targetUser = args[0];
                handleApprove(targetUser, showFeedback);
            }
            break;
        case "!reject":
            if (userRoles.mod || userRoles.broadcaster) {
                const targetUser = args[0];
                handleReject(targetUser, showFeedback);
            }
            break;
        case "!donetask":
            if (userRoles.mod || userRoles.broadcaster) {
                const targetUser = args[0];
                handleDoneTask(targetUser, showFeedback);
            }
            break;
    }
}

function updateUserLastSeen(username) {
    const { task, listName } = State.findTaskByUsername(username);
    if (task) {
        task.lastSeen = Date.now();
        if (task.status === "offline") {
            task.status = "active";
            UI.renderList(listName, State.getLists(), State.getConfig());
            State.saveData();
        }
    }
}

function handleAddTask(adder, listName, taskText, showFeedback) {
    if (!listName || !taskText) {
        showFeedback("Usage: !addtask <ListName> <TaskDescription>");
        return;
    }
    const success = State.addTask(listName, { text: taskText, completed: false, addedBy: adder });
    if (success) {
        UI.renderList(listName, State.getLists(), State.getConfig());
        showFeedback(`Task added to ${listName}.`);
    } else {
        showFeedback(`List "${listName}" not found.`);
    }
}

function handleViewerTask(username, taskText, showFeedback) {
    if (!taskText) {
        showFeedback("Usage: !task <YourTaskDescription>");
        return;
    }
    const result = State.addPendingTask(username, taskText);
    if (result.success) {
        showFeedback(`@${username}, your task has been submitted for approval!`);
    } else {
        if (result.reason === 'existing') {
            showFeedback(`@${username}, you already have a pending or active task.`);
        } else {
            showFeedback(`@${username}, the submission queue is currently full. Please try again later.`);
        }
    }
}

function handleApprove(username, showFeedback) {
    if (!username) return;
    const taskToApprove = State.findPendingTask(username);
    if (!taskToApprove) {
        showFeedback(`No pending task found for ${username}.`);
        return;
    }

    const config = State.getConfig();
    const targetListName = config.defaultListName;
    const targetList = State.getLists()[targetListName];

    if (!targetList) {
        console.error(`Default list "${targetListName}" not found.`);
        showFeedback("Error: Default viewer list not found. Please configure the widget.", true);
        return;
    }

    if (targetList.tasks.length >= (targetList.limit || config.viewerTaskLimit)) {
        showFeedback(`The task list for "${targetListName}" is full.`);
        return;
    }

    State.removePendingTask(username);
    State.addTask(targetListName, {
        ...taskToApprove,
        status: "active",
        lastSeen: Date.now(),
    });

    UI.renderList(targetListName, State.getLists(), State.getConfig());
    showFeedback(`@${username}'s task has been approved and added to the list!`);
}

function handleReject(username, showFeedback) {
    if (!username) return;
    if (State.removePendingTask(username)) {
        showFeedback(`@${username}'s task has been rejected.`);
    } else {
        showFeedback(`No pending task found for ${username}.`);
    }
}


function handleUpdateStatus(username, status, showFeedback) {
    const { task, listName } = State.findTaskByUsername(username);
    if (!task) {
        showFeedback(`@${username}, you don't have an active task.`);
        return;
    }
    if (task.status === "completed") return;

    let newStatus = task.status;
    let feedbackMsg = "";

    switch (status) {
        case "complete":
        case "done":
            newStatus = "completed";
            const newProgress = State.incrementProgress();
            UI.updateProgressBar(newProgress, State.getConfig());
            feedbackMsg = `@${username}'s task is now complete! Great job!`;
            break;
        case "pause":
            newStatus = "paused";
            feedbackMsg = `@${username}'s task is paused.`;
            break;
        case "resume":
            newStatus = "active";
            feedbackMsg = `@${username}'s task has been resumed.`;
            break;
        default:
            showFeedback(`Invalid status. Use 'complete', 'pause', or 'resume'.`);
            return;
    }

    task.status = newStatus;
    State.saveData();
    UI.renderList(listName, State.getLists(), State.getConfig());
    showFeedback(feedbackMsg);
}

function handleDoneTask(username, showFeedback) {
    const { task, listName } = State.findTaskByUsername(username);
     if (!task) {
        showFeedback(`No active task found for user ${username}.`);
        return;
    }
    if (task.status === 'completed') {
        showFeedback(`${username}'s task is already completed.`);
        return;
    }

    task.status = 'completed';
    const newProgress = State.incrementProgress();

    UI.renderList(listName, State.getLists(), State.getConfig());
    UI.updateProgressBar(newProgress, State.getConfig());
    State.saveData();

    showFeedback(`Task for ${username} marked as done. Progress increased!`);
}

export { handleMessage };