// widget/ui.js

function updateProgressBar(progressPoints, config) {
    const progressBar = document.getElementById("progress-bar");
    const progressText = document.getElementById("progress-text");
    if (!progressBar || !progressText) return;

    const maxPoints = config.tierThresholds.tier3;
    const percentage = Math.min((progressPoints / maxPoints) * 100, 100);

    progressBar.style.width = `${percentage}%`;
    progressText.textContent = `${progressPoints}/${maxPoints}`;

    // Reset classes
    progressBar.className = "progress-bar";

    // Add tier completion classes
    if (progressPoints >= config.tierThresholds.tier3) {
        progressBar.classList.add("tier-3-complete");
        triggerConfetti();
    } else if (progressPoints >= config.tierThresholds.tier2) {
        progressBar.classList.add("tier-2-complete");
    } else if (progressPoints >= config.tierThresholds.tier1) {
        progressBar.classList.add("tier-1-complete");
    }
}

function renderAllLists(lists, config) {
    const container = document.getElementById("task-lists-container");
    if (!container) return;
    container.innerHTML = ""; // Clear existing lists

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
        renderList(listName, lists, config); // Render the tasks for the newly created list structure
    }
}

function renderList(listName, lists, config) {
    const listData = lists[listName];
    if (!listData) return;

    const listId = `list-${listName.replace(/\s+/g, "-")}`;
    const listWrapper = document.getElementById(listId);
    if (!listWrapper) return;

    const ul = listWrapper.querySelector("ul");
    const existingLis = ul.querySelectorAll("li");
    const tasks = listData.tasks;

    // Synchronize the DOM with the state
    for (let i = 0; i < tasks.length; i++) {
        const task = tasks[i];
        let li = existingLis[i];

        if (li) {
            // Update existing li
            updateListItemContent(li, task);
        } else {
            // Add new li if state has more tasks than DOM
            li = createListItem(task, i);
            ul.appendChild(li);
        }
        // Always update appearance in case status changed
        updateTaskAppearance(li, task.status || (task.completed ? "completed" : "active"));
    }

    // Remove extra lis if DOM has more than state
    for (let i = tasks.length; i < existingLis.length; i++) {
        existingLis[i].remove();
    }
}

function createListItem(task, index) {
    const li = document.createElement("li");
    li.dataset.taskIndex = index;
    updateListItemContent(li, task);
    return li;
}

function updateListItemContent(li, task) {
    let content = "";
    if (task.username) {
        content = `<span>${task.username}:</span> ${task.task}`;
    } else if (task.addedBy) {
        content = `${task.text} <sub>(by ${task.addedBy})</sub>`;
    } else {
        content = task.text;
    }
    // Avoid re-rendering if content is identical
    if (li.innerHTML !== content) {
        li.innerHTML = content;
    }
}

function updateTaskAppearance(listItem, status) {
    listItem.classList.remove("completed", "offline", "paused"); // Reset states
    switch (status) {
        case "completed":
            listItem.classList.add("completed");
            break;
        case "offline":
            listItem.classList.add("offline");
            break;
        case "paused":
            listItem.classList.add("paused");
            break;
    }
}


function triggerConfetti() {
    if (typeof anime === 'function') {
        const confettiContainer = document.body;
        for (let i = 0; i < 100; i++) {
            const confetti = document.createElement('div');
            confetti.className = 'confetti';
            confetti.style.left = anime.random(0, 100) + 'vw';
            confetti.style.animationDelay = anime.random(0, 2) + 's';
            confetti.style.backgroundColor = `hsl(${anime.random(0, 360)}, 100%, 50%)`;
            confettiContainer.appendChild(confetti);

            anime({
                targets: confetti,
                translateY: '100vh',
                easing: 'easeInQuad',
                duration: anime.random(2000, 4000),
                complete: () => {
                    confetti.remove();
                }
            });
        }
    }
}


export {
    updateProgressBar,
    renderAllLists,
    renderList,
    updateTaskAppearance,
    triggerConfetti
};