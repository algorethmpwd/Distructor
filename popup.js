const urlForm = document.getElementById('urlForm');
const urlInput = document.getElementById('urlInput');
const startTimeInput = document.getElementById('startTime');
const durationInput = document.getElementById('duration');
const recurrenceSelect = document.getElementById('recurrence');
const urlList = document.getElementById('urlList');
const toggle = document.getElementById('distructorToggle');
const statusLabel = document.getElementById('statusLabel');
const tabs = document.querySelectorAll('.tab-button');
const tabContents = document.querySelectorAll('.tab-content');
const whitelistInput = document.getElementById('whitelistInput');
const addWhitelistButton = document.getElementById('addWhitelist');
const whitelistUrls = document.getElementById('whitelistUrls');
const exportSettingsButton = document.getElementById('exportSettings');
const importSettingsButton = document.getElementById('importSettings');
const importFileInput = document.getElementById('importFile');

let editingIndex = -1; // Track which item is being edited

// Initialize Distructor state on load
function initializeDisturctor() {
    // Retrieve both enabled state and blocked URLs
    chrome.storage.local.get(['distructorEnabled', 'blockedUrls', 'whitelist'], (result) => {
        // Set toggle state, default to false if not set
        const enabled = result.distructorEnabled || false;
        toggle.checked = enabled;
        statusLabel.textContent = enabled ? 'On' : 'Off';

        // Render URL list whether enabled or not
        renderUrlList(result.blockedUrls || []);

        // Render whitelist
        renderWhitelist(result.whitelist || []);
    });
}

// Toggle Distructor
toggle.addEventListener('change', () => {
    const enabled = toggle.checked;
    
    // Store enabled state
    chrome.storage.local.set({ distructorEnabled: enabled }, () => {
        statusLabel.textContent = enabled ? 'On' : 'Off';
    });
});

// Tab navigation
tabs.forEach(tab => {
    tab.addEventListener('click', () => {
        tabs.forEach(btn => btn.classList.remove('active'));
        tabContents.forEach(content => content.style.display = 'none');
        
        const targetTab = document.getElementById(tab.dataset.tab);
        targetTab.style.display = 'block';
        tab.classList.add('active');
    });
});

// Reset form
function resetForm() {
    urlInput.value = '';
    startTimeInput.value = '';
    durationInput.value = '';
    recurrenceSelect.selectedIndex = 0;
    document.querySelectorAll('#daySelector input').forEach(checkbox => {
        checkbox.checked = false;
    });
    editingIndex = -1;
    urlForm.querySelector('button[type="submit"]').textContent = 'Add';
}

// Handle URL form submission
urlForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const url = urlInput.value.trim();
    const startTime = startTimeInput.value;
    const duration = parseFloat(durationInput.value); // Parse as float
    const days = Array.from(document.querySelectorAll('#daySelector input:checked')).map(input => input.value);
    const recurrence = recurrenceSelect.value;

    if (url && startTime && duration > 0 && days.length > 0) { // Ensure duration is greater than 0
        chrome.storage.local.get(['blockedUrls'], (result) => {
            const blockedUrls = result.blockedUrls || [];

            if (editingIndex !== -1) {
                // Editing existing entry
                blockedUrls[editingIndex] = {
                    url,
                    startTime,
                    duration,
                    days,
                    recurrence,
                    active: true
                };
            } else {
                // Adding new entry
                blockedUrls.push({
                    url,
                    startTime,
                    duration,
                    days,
                    recurrence,
                    active: true
                });
            }

            // Explicitly save blockedUrls with guaranteed retention
            chrome.storage.local.set({ blockedUrls }, () => {
                renderUrlList(blockedUrls);
                resetForm();
                showToast('Schedule added successfully!');
            });
        });
    } else {
        showToast('Please enter valid details.');
    }
});

// Render URL list
function renderUrlList(blockedUrls = []) {
    urlList.innerHTML = '';
    blockedUrls.forEach((entry, index) => {
        const li = document.createElement('li');
        
        // Shortened day names
        const shortDays = entry.days.map(day => day.substring(0, 3));
        
        li.innerHTML = `
            <span>${entry.url} (Days: ${shortDays.join(', ')} From: ${entry.startTime} For: ${entry.duration} Hours, Recurrence: ${entry.recurrence})</span>
        `;

        const toggleButton = document.createElement('button');
        toggleButton.textContent = entry.active ? 'Disable' : 'Enable';
        toggleButton.classList.add('toggle-btn');
        toggleButton.addEventListener('click', () => {
            // Create a new array with the updated entry
            const updatedBlockedUrls = [...blockedUrls];
            updatedBlockedUrls[index] = {
                ...entry,
                active: !entry.active
            };
            
            // Save the updated array to trigger the background.js listener
            chrome.storage.local.set({ blockedUrls: updatedBlockedUrls }, () => {
                renderUrlList(updatedBlockedUrls);
                showToast('Schedule toggled successfully!');
            });
        });

        const editButton = document.createElement('button');
        editButton.textContent = 'Edit';
        editButton.classList.add('edit-btn');
        editButton.addEventListener('click', () => {
            // Populate form with existing data
            urlInput.value = entry.url;
            startTimeInput.value = entry.startTime;
            durationInput.value = entry.duration;
            recurrenceSelect.value = entry.recurrence;
            
            // Reset day checkboxes
            document.querySelectorAll('#daySelector input').forEach(checkbox => {
                checkbox.checked = entry.days.includes(checkbox.value);
            });

            // Change submit button text
            urlForm.querySelector('button[type="submit"]').textContent = 'Update';
            
            // Set editing index
            editingIndex = index;

            // Switch to Setter tab
            tabs.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.style.display = 'none');
            document.getElementById('setter').style.display = 'block';
            document.querySelector('.tab-button[data-tab="setter"]').classList.add('active');
        });

        const deleteButton = document.createElement('button');
        deleteButton.textContent = 'Delete';
        deleteButton.classList.add('delete-btn');
        deleteButton.addEventListener('click', () => {
            blockedUrls.splice(index, 1);
            chrome.storage.local.set({ blockedUrls }, () => {
                renderUrlList(blockedUrls);
                showToast('Schedule deleted successfully!');
            });
        });

        li.appendChild(toggleButton);
        li.appendChild(editButton);
        li.appendChild(deleteButton);
        urlList.appendChild(li);
    });
}

// Render whitelist
function renderWhitelist(whitelist) {
    whitelistUrls.innerHTML = '';
    whitelist.forEach((url, index) => {
        const li = document.createElement('li');
        li.textContent = url;

        const deleteButton = document.createElement('button');
        deleteButton.textContent = 'Delete';
        deleteButton.addEventListener('click', () => {
            whitelist.splice(index, 1);
            chrome.storage.local.set({ whitelist }, () => {
                renderWhitelist(whitelist);
                showToast('Whitelist entry deleted!');
            });
        });

        li.appendChild(deleteButton);
        whitelistUrls.appendChild(li);
    });
}

// Add to whitelist
addWhitelistButton.addEventListener('click', () => {
    const url = whitelistInput.value.trim();
    if (url) {
        chrome.storage.local.get('whitelist', (result) => {
            const whitelist = result.whitelist || [];
            whitelist.push(url);
            chrome.storage.local.set({ whitelist }, () => {
                renderWhitelist(whitelist);
                whitelistInput.value = '';
                showToast('Whitelist entry added!');
            });
        });
    }
});

// Export settings
exportSettingsButton.addEventListener('click', () => {
    chrome.storage.local.get(null, (data) => {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'distructor_settings.json';
        a.click();
        URL.revokeObjectURL(url);
        showToast('Settings exported successfully!');
    });
});

// Import settings
importSettingsButton.addEventListener('click', () => {
    importFileInput.click();
});

importFileInput.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = JSON.parse(e.target.result);
            chrome.storage.local.set(data, () => {
                showToast('Settings imported successfully!');
                initializeDisturctor(); // Refresh the UI
            });
        } catch (error) {
            showToast('Invalid settings file.');
        }
    };
    reader.readAsText(file);
});

// Show toast notifications
function showToast(message, duration = 3000) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.add('show');

    setTimeout(() => {
        toast.classList.remove('show');
    }, duration);
}

// Initialize on script load
initializeDisturctor();