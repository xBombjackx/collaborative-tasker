// widget/ui.js
const FLASH_ANIMATION_DURATION = 700;
let lastProgressPoints = -1;

function flashTierSegment(tier) {
    const tierSegment = document.getElementById(`tier-${tier}-segment`);
    if (tierSegment) {
        tierSegment.classList.add('flash');
        setTimeout(() => tierSegment.classList.remove('flash'), FLASH_ANIMATION_DURATION);
    }
}

function updateProgressBar(progressPoints, config) {
    const container = document.querySelector('.progress-bar-container');
    const progressBar = document.getElementById("progress-bar");
    const progressText = document.getElementById("progress-text");
    if (!container || !progressBar || !progressText) return;

    const { tier1, tier2, tier3 } = config.tierThresholds;
    const maxPoints = tier3;
    const percentage = Math.min((progressPoints / maxPoints) * 100, 100);

    progressBar.style.width = `${percentage}%`;
    progressText.textContent = `${progressPoints}/${maxPoints}`;

    // Set CSS variables for tier segment positions
    container.style.setProperty('--tier1-percent', `${(tier1 / maxPoints) * 100}%`);
    container.style.setProperty('--tier2-percent', `${(tier2 / maxPoints) * 100}%`);
    container.style.setProperty('--tier3-percent', '100%');

    // --- Tier Completion Visuals ---
    if (lastProgressPoints !== -1) { // Don't run on initial load
        // Tier 1 crossed
        if (progressPoints >= tier1 && lastProgressPoints < tier1) {
            flashTierSegment(1);
            triggerConfetti();
        }
        // Tier 2 crossed
        if (progressPoints >= tier2 && lastProgressPoints < tier2) {
            flashTierSegment(2);
            triggerConfetti();
        }
        // Tier 3 crossed
        if (progressPoints >= tier3 && lastProgressPoints < tier3) {
            flashTierSegment(3);
            triggerConfetti();
        }
    }

    lastProgressPoints = progressPoints;

    // --- Persistent Tier Styling ---
    progressBar.className = "progress-bar"; // Reset
    if (progressPoints >= tier3) {
        progressBar.classList.add("tier-3-complete");
    } else if (progressPoints >= tier2) {
        progressBar.classList.add("tier-2-complete");
    } else if (progressPoints >= tier1) {
        progressBar.classList.add("tier-1-complete");
    }
}

function renderAllLists(lists, config) {
    const container = document.getElementById("task-lists-container");
    if (!container) return;

    const existingListNames = new Set(
        [...container.querySelectorAll(".task-list-container")].map(
            (el) => el.dataset.listName
        )
    );
    const stateListNames = new Set(Object.keys(lists));

    // Remove lists that are no longer in the state
    for (const listName of existingListNames) {
        if (!stateListNames.has(listName)) {
            const listId = `list-${listName.replace(/\s+/g, "-")}`;
            const listContainer = document.getElementById(listId);
            if (listContainer) {
                listContainer.remove();
            }
        }
    }

    // Add or update lists that are in the state
    for (const listName in lists) {
        const listData = lists[listName];
        const listId = `list-${listName.replace(/\s+/g, "-")}`;
        let listContainer = document.getElementById(listId);

        if (!listContainer) {
            // Create list container if it doesn't exist
            listContainer = document.createElement("div");
            listContainer.className = "task-list-container";
            listContainer.id = listId;
            listContainer.dataset.listName = listName;

            const title = document.createElement("h2");
            title.className = "task-list-header";
            title.textContent = listData.summary || listName;
            listContainer.appendChild(title);

            const ul = document.createElement("ul");
            ul.className = "task-list";
            listContainer.appendChild(ul);

            container.appendChild(listContainer);
        }

        renderList(listName, lists, config);
    }
}

function renderList(listName, lists, config) {
    const listData = lists[listName];
    if (!listData) return;

    const listId = `list-${listName.replace(/\s+/g, "-")}`;
    const listContainer = document.getElementById(listId);
    if (!listContainer) return;

    const ul = listContainer.querySelector(".task-list");
    const existingLis = ul.querySelectorAll(".task-item");
    const tasks = listData.tasks;

    // Synchronize the DOM with the state
    for (let i = 0; i < tasks.length; i++) {
        const task = tasks[i];
        let li = existingLis[i];

        if (li) {
            updateListItemContent(li, task);
        } else {
            li = createListItem(task, i);
            ul.appendChild(li);
        }
        updateTaskAppearance(li, task.status || (task.completed ? "completed" : "active"));
    }

    // Remove extra lis if DOM has more than state
    for (let i = tasks.length; i < existingLis.length; i++) {
        existingLis[i].remove();
    }
}

function createListItem(task, index) {
    const li = document.createElement("li");
    li.className = "task-item";
    li.dataset.taskIndex = index;
    updateListItemContent(li, task);
    return li;
}

function updateListItemContent(li, task) {
    let taskTextSpan = li.querySelector('.task-text');
    if (!taskTextSpan) {
        taskTextSpan = document.createElement('span');
        taskTextSpan.className = 'task-text';
        li.appendChild(taskTextSpan);
    }
    const newText = task.text || task.task;
    if (taskTextSpan.textContent !== newText) {
        taskTextSpan.textContent = newText;
    }

    let taskUserSpan = li.querySelector('.task-user');
    const user = task.username || task.addedBy;

    if (user) {
        if (!taskUserSpan) {
            taskUserSpan = document.createElement('span');
            taskUserSpan.className = 'task-user';
            li.appendChild(taskUserSpan);
        }
        const newUserText = `(by ${user})`;
        if (taskUserSpan.textContent !== newUserText) {
            taskUserSpan.textContent = newUserText;
        }
    } else if (taskUserSpan) {
        // If there's no user but the span exists, remove it
        taskUserSpan.remove();
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


function applyTheme(theme) {
    const mainContainer = document.getElementById("main-container");
    if (mainContainer) {
        // Remove any existing theme classes
        const themePrefix = "theme-";
        const classesToRemove = [];
        for (let i = 0; i < mainContainer.classList.length; i++) {
            if (mainContainer.classList[i].startsWith(themePrefix)) {
                classesToRemove.push(mainContainer.classList[i]);
            }
        }
        mainContainer.classList.remove(...classesToRemove);

        // Add the new theme class
        mainContainer.classList.add(theme);
    }
}

export {
    updateProgressBar,
    renderAllLists,
    renderList,
    updateTaskAppearance,
    triggerConfetti,
    applyTheme
};