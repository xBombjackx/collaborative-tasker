// widget/commands.js
import * as State from './state.js';
import * as UI from './ui.js';

function handleMessage(event, showFeedback) {
    const message = event.data.text.trim();
    const command = message.split(" ")[0].toLowerCase();
    const args = message.substring(command.length + 1).split(" ");
    const username = event.data.displayName;
    const userRoles = event.data.tags || {};
    const isMod = userRoles.mod || userRoles.broadcaster;

    updateUserLastSeen(username);

    switch (command) {
        case "!addtask":
            if (isMod) {
                handleAddTask(username, args[0], args.slice(1).join(" "), showFeedback);
            }
            break;
        case "!task":
            handleViewerTask(username, args.join(" "), showFeedback);
            break;
        case "!status":
            handleUpdateStatus(username, args[0], args[1], isMod, showFeedback);
            break;
        case "!approve":
            if (isMod) {
                handleApprove(args[0], showFeedback);
            }
            break;
        case "!reject":
            if (isMod) {
                handleReject(args[0], showFeedback);
            }
            break;
        case "!help":
            handleHelp(showFeedback);
            break;
    }
}

function updateUserLastSeen(username) {
    const {
        task,
        listName
    } = State.findTaskByUsername(username);
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
    const success = State.addTask(listName, {
        text: taskText,
        completed: false,
        addedBy: adder
    });
    if (success) {
        UI.renderList(listName, State.getLists(), State.getConfig());
        showFeedback(`Task "${taskText}" added to list ${listName}.`);
    } else {
        showFeedback(`Error: List "${listName}" not found.`);
    }
}

function handleViewerTask(username, taskText, showFeedback) {
    if (!taskText) {
        showFeedback(`@${username}, please provide a task. Usage: !task <YourTaskDescription>`);
        return;
    }
    const result = State.addPendingTask(username, taskText);
    if (result.success) {
        showFeedback(`@${username}, your task has been submitted for approval!`);
    } else {
        if (result.reason === 'existing') {
            showFeedback(`@${username}, you already have a pending or active task.`);
        } else {
            showFeedback(`@${username}, the submission queue is full. Please try again later.`);
        }
    }
}

function handleApprove(username, showFeedback) {
    if (!username) {
        showFeedback("Usage: !approve <username>");
        return;
    }
    const taskToApprove = State.findPendingTask(username);
    if (!taskToApprove) {
        showFeedback(`No pending task found for @${username}.`);
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
        showFeedback(`The task list for "${targetListName}" is full. @${username}'s task cannot be approved right now.`);
        return;
    }

    State.removePendingTask(username);
    State.addTask(targetListName, { ...taskToApprove,
        status: "active",
        lastSeen: Date.now()
    });

    UI.renderList(targetListName, State.getLists(), State.getConfig());
    showFeedback(`@${username}'s task has been approved and added to the list!`);
}

function handleReject(username, showFeedback) {
    if (!username) {
        showFeedback("Usage: !reject <username>");
        return;
    }
    if (State.removePendingTask(username)) {
        showFeedback(`@${username}'s task has been rejected.`);
    } else {
        showFeedback(`No pending task found for @${username}.`);
    }
}

function handleUpdateStatus(requestor, status, targetUser, isMod, showFeedback) {
    const username = isMod && targetUser ? targetUser : requestor;
    const {
        task,
        listName
    } = State.findTaskByUsername(username);

    if (!task) {
        showFeedback(`@${username}, you do not have an active task.`);
        return;
    }
    if (task.status === "completed" && status !== 'reset') { // Mods can reset a completed task
        showFeedback(`@${username}'s task is already completed.`);
        return;
    }

    let newStatus = task.status;
    let feedbackMsg = "";

    switch (status) {
        case "complete":
        case "done":
            if (task.status === "completed") return; // Avoid re-completing
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

function handleHelp(showFeedback) {
    const viewerCommands = "Viewer: !task <desc>, !status <complete|pause|resume>";
    const modCommands = "Mod: !approve <user>, !reject <user>, !status <status> <user>, !addtask <list> <desc>";
    showFeedback(`CST Commands | ${viewerCommands} | ${modCommands}`);
}

export {
    handleMessage
};