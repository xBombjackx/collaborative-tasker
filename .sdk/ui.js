// widget/ui.js
import { getLists, getConfig, getTheme, setTheme, getCompletedTaskCount } from "./state.js";
const FLASH_ANIMATION_DURATION = 700;
let lastProgressPoints = -1;

function flashTierSegment(tier) {
    const tierSegment = document.getElementById(`tier-${tier}-segment`);
    if (tierSegment) {
        tierSegment.classList.add('flash');
        setTimeout(() => tierSegment.classList.remove('flash'), FLASH_ANIMATION_DURATION);
    }
}

function renderAllLists(lists, config) {
    const container = document.getElementById('task-lists-container');
    container.innerHTML = ''; // Clear existing lists
    for (const listName in lists) {
        renderList(listName, lists, config);
    }
}

function renderList(listName, lists, config) {
    const container = document.getElementById('task-lists-container');
    let listContainer = container.querySelector(`[data-list-name="${listName}"]`);
    if (!listContainer) {
        listContainer = document.createElement('div');
        listContainer.className = 'task-list-container';
        listContainer.dataset.listName = listName;
        container.appendChild(listContainer);
    }

    const list = lists[listName];
    if (!list) return;

    let ul = listContainer.querySelector('ul');
    if (!ul) {
        ul = document.createElement('ul');
        listContainer.appendChild(ul);
    }

    ul.innerHTML = ''; // Clear existing items

    list.tasks.forEach((task, index) => {
        const li = createListItem(task, index);
        ul.appendChild(li);
    });
}

function createListItem(task, index) {
    const li = document.createElement('li');
    li.className = 'task-item';
    li.dataset.taskIndex = index;
    updateListItemContent(li, task);
    return li;
}

function updateListItemContent(li, task) {
    let checkbox = li.querySelector('.task-checkbox');
    if (!checkbox) {
        checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'task-checkbox';
        li.prepend(checkbox);
    }
    checkbox.checked = !!task.completed;

    let taskTextSpan = li.querySelector('.task-text');
    if (!taskTextSpan) {
        taskTextSpan = document.createElement('span');
        taskTextSpan.className = 'task-text';
        checkbox.insertAdjacentElement('afterend', taskTextSpan);
    }
    const newText = task.text || task.task;
    if (taskTextSpan.textContent !== newText) {
        taskTextSpan.textContent = newText;
    }
}


function updateProgressBar(config) {
    const completedCount = getCompletedTaskCount();
    const progressBar = document.getElementById('progress-bar');
    const progressText = document.getElementById('progress-text');
    const { tier1, tier2, tier3 } = config.tierThresholds;
    const maxPoints = tier3;

    if (!progressBar || !progressText) return;

    const percentage = maxPoints > 0 ? (completedCount / maxPoints) * 100 : 0;
    progressBar.style.width = `${percentage}%`;
    progressText.textContent = `${completedCount}/${maxPoints}`;

    // Tier segment flashing logic
    if (completedCount !== lastProgressPoints) {
        if (completedCount >= tier1 && lastProgressPoints < tier1) flashTierSegment(1);
        if (completedCount >= tier2 && lastProgressPoints < tier2) flashTierSegment(2);
        if (completedCount >= tier3 && lastProgressPoints < tier3) flashTierSegment(3);
        lastProgressPoints = completedCount;
    }
}

function initThemeSelector() {
    const themeSelector = document.getElementById('theme-selector');
    if (themeSelector) {
        themeSelector.addEventListener('click', (e) => {
            if (e.target.classList.contains('theme-swatch')) {
                const newTheme = e.target.dataset.theme;
                if (newTheme) {
                    setTheme(newTheme);
                    applyTheme();
                }
            }
        });
    }
}

function applyTheme() {
    const mainContainer = document.getElementById('main-container');
    if (mainContainer) {
        const currentTheme = getTheme();
        // Remove any existing theme classes
        mainContainer.className = mainContainer.className.replace(/theme-\d+/g, '').trim();
        // Add the new theme class
        mainContainer.classList.add(currentTheme);
    }
}

export {
    renderAllLists,
    renderList,
    updateProgressBar,
    initThemeSelector,
    applyTheme
};
