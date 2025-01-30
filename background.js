function debugLog(message) {
    console.log(`[Distructor Debug] ${message}`);
}

async function isContentScriptInjected(tabId) {
    try {
        await chrome.tabs.sendMessage(tabId, { action: 'ping' });
        return true;
    } catch (error) {
        debugLog(`Content script not injected in tab ${tabId}: ${error.message}`);
        return false;
    }
}

async function injectContentScript(tabId) {
    try {
        const isInjected = await isContentScriptInjected(tabId);
        if (!isInjected) {
            await chrome.scripting.executeScript({
                target: { tabId },
                files: ['content.js']
            });
            debugLog(`Content script injected into tab ${tabId}`);
        }
    } catch (error) {
        debugLog(`Failed to inject content script: ${error.message}`);
    }
}

function calculateRemainingDuration(startTime, duration) {
    const [startHour, startMinute] = startTime.split(':').map(Number);
    const startMinutes = startHour * 60 + startMinute;
    const durationMinutes = duration * 60;
    
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    
    if (currentMinutes >= startMinutes) {
        const remainingMinutes = (startMinutes + durationMinutes) - currentMinutes;
        return remainingMinutes > 0 ? remainingMinutes / 60 : 0;
    } else {
        return duration;
    }
}

async function shouldBlockUrl(url, entry) {
    try {
        const whitelist = await chrome.storage.local.get('whitelist');
        const tabUrl = new URL(url);

        if (whitelist.whitelist?.some(whitelistUrl => tabUrl.hostname.endsWith(whitelistUrl))) {
            debugLog(`URL ${url} is whitelisted.`);
            return { shouldBlock: false };
        }

        const currentTime = new Date();
        const currentDay = currentTime.toLocaleString('en-US', { weekday: 'long' });
        const currentMinutes = currentTime.getHours() * 60 + currentTime.getMinutes();

        const [startHour, startMinute] = entry.startTime.split(':').map(Number);
        const startMinutes = startHour * 60 + startMinute;
        const endMinutes = startMinutes + (Number(entry.duration) * 60);

        let urlMatches = false;
        try {
            const entryUrl = entry.url;
            const isRegex = entryUrl.startsWith('/') && entryUrl.endsWith('/');
            if (isRegex) {
                const regexPattern = entryUrl.slice(1, -1);
                const regex = new RegExp(regexPattern);
                urlMatches = regex.test(tabUrl.hostname);
            } else {
                const isWildcard = entryUrl.includes('*');
                if (isWildcard) {
                    const wildcardPattern = entryUrl.replace(/\*/g, '.*');
                    const regex = new RegExp(`^${wildcardPattern}$`);
                    urlMatches = regex.test(tabUrl.hostname);
                } else {
                    const entryUrlObj = new URL(entryUrl.startsWith('http') ? entryUrl : `https://${entryUrl}`);
                    urlMatches = tabUrl.hostname.endsWith(entryUrlObj.hostname);
                }
            }
        } catch (error) {
            debugLog(`Error parsing URL: ${error.message}`);
            return { shouldBlock: false };
        }

        let isRecurringMatch = false;
        switch (entry.recurrence) {
            case 'daily':
                isRecurringMatch = true;
                break;
            case 'weekly':
                isRecurringMatch = entry.days.includes(currentDay);
                break;
            case 'monthly':
                const current_date = currentTime.getDate();
                const start_date = new Date(currentTime);
                start_date.setHours(startHour, startMinute, 0, 0);
                isRecurringMatch = current_date === start_date.getDate();
                break;
            default:
                isRecurringMatch = false;
        }

        const shouldBlock = (
            entry.active &&
            isRecurringMatch &&
            currentMinutes >= startMinutes &&
            currentMinutes < endMinutes &&
            urlMatches
        );

        if (shouldBlock) {
            const remainingDuration = calculateRemainingDuration(entry.startTime, entry.duration);
            debugLog(`URL ${url} should be blocked for ${remainingDuration} more hours`);
            return { shouldBlock: true, remainingDuration };
        }

        return { shouldBlock: false };
    } catch (error) {
        debugLog(`Error in shouldBlockUrl: ${error.message}`);
        return { shouldBlock: false };
    }
}

async function sendMessage(tabId, action, duration = null) {
    try {
        await injectContentScript(tabId);
        await chrome.tabs.sendMessage(tabId, {
            action: action,
            duration: duration
        });
        debugLog(`${action} message sent to tab ${tabId}`);
    } catch (error) {
        debugLog(`Error sending ${action} message: ${error.message}`);
    }
}

async function handleScheduleDelete(deletedEntry) {
    try {
        const tabs = await chrome.tabs.query({});
        for (const tab of tabs) {
            if (tab.url && !tab.url.startsWith('chrome://')) {
                try {
                    const tabUrl = new URL(tab.url);
                    const entryUrl = new URL(deletedEntry.url.startsWith('http') ? deletedEntry.url : `https://${deletedEntry.url}`);
                    
                    if (tabUrl.hostname.endsWith(entryUrl.hostname)) {
                        await sendMessage(tab.id, 'unblock');
                        debugLog(`Unblocked ${tab.url} after schedule deletion`);
                    }
                } catch (error) {
                    debugLog(`Error parsing URL during deletion: ${error.message}`);
                }
            }
        }
    } catch (error) {
        debugLog(`Error handling schedule deletion: ${error.message}`);
    }
}

async function handleSingleUrlToggle(entry) {
    try {
        const tabs = await chrome.tabs.query({});
        for (const tab of tabs) {
            if (tab.url && !tab.url.startsWith('chrome://')) {
                try {
                    const tabUrl = new URL(tab.url);
                    const entryUrl = new URL(entry.url.startsWith('http') ? entry.url : `https://${entry.url}`);
                    
                    if (tabUrl.hostname.endsWith(entryUrl.hostname)) {
                        if (entry.active) {
                            const { shouldBlock, remainingDuration } = await shouldBlockUrl(tab.url, entry);
                            if (shouldBlock) {
                                await sendMessage(tab.id, 'block', remainingDuration);
                            }
                        } else {
                            await sendMessage(tab.id, 'unblock');
                        }
                        debugLog(`Toggle handled for ${tab.url} - Active: ${entry.active}`);
                    }
                } catch (error) {
                    debugLog(`Error parsing URL during toggle: ${error.message}`);
                }
            }
        }
    } catch (error) {
        debugLog(`Error handling single URL toggle: ${error.message}`);
    }
}

chrome.runtime.onInstalled.addListener(() => {
    debugLog('Extension installed/updated');
    chrome.storage.local.set({ 
        blockedUrls: [], 
        distructorEnabled: false,
        whitelist: []
    });
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.url && !tab.url.startsWith('chrome://')) {
        debugLog(`Tab updated: ${tab.url}`);
        const result = await chrome.storage.local.get(['blockedUrls', 'distructorEnabled']);
        
        if (!result.distructorEnabled || !result.blockedUrls || result.blockedUrls.length === 0) {
            debugLog('Distructor is disabled or no blocked URLs found.');
            return;
        }

        for (const entry of result.blockedUrls) {
            const { shouldBlock, remainingDuration } = await shouldBlockUrl(tab.url, entry);
            if (shouldBlock) {
                debugLog(`Blocking URL: ${tab.url}`);
                await sendMessage(tabId, 'block', remainingDuration);
                break;
            }
        }
    }
});

let debounceTimeout;
function debounce(callback, delay) {
    clearTimeout(debounceTimeout);
    debounceTimeout = setTimeout(callback, delay);
}

chrome.storage.onChanged.addListener(async (changes, namespace) => {
    if (namespace === 'local') {
        if (changes.blockedUrls) {
            debounce(async () => {
                const oldUrls = changes.blockedUrls.oldValue || [];
                const newUrls = changes.blockedUrls.newValue || [];
                
                for (let i = 0; i < newUrls.length; i++) {
                    const newEntry = newUrls[i];
                    const oldEntry = oldUrls[i];
                    
                    if (oldEntry && newEntry && 
                        oldEntry.url === newEntry.url && 
                        oldEntry.active !== newEntry.active) {
                        await handleSingleUrlToggle(newEntry);
                        continue;
                    }
                }
                
                for (const oldEntry of oldUrls) {
                    const stillExists = newUrls.some(newEntry => 
                        newEntry.url === oldEntry.url && 
                        newEntry.startTime === oldEntry.startTime &&
                        newEntry.days.join(',') === oldEntry.days.join(',')
                    );
                    
                    if (!stillExists) {
                        await handleScheduleDelete(oldEntry);
                    }
                }
            }, 500);
        }
        
        const result = await chrome.storage.local.get(['blockedUrls', 'distructorEnabled']);
        if (changes.distructorEnabled) {
            const tabs = await chrome.tabs.query({});
            for (const tab of tabs) {
                if (tab.url && !tab.url.startsWith('chrome://')) {
                    if (!result.distructorEnabled) {
                        let wasBlocked = false;
                        for (const entry of result.blockedUrls || []) {
                            const { shouldBlock } = await shouldBlockUrl(tab.url, entry);
                            if (shouldBlock) {
                                wasBlocked = true;
                                break;
                            }
                        }
                        if (wasBlocked) {
                            await sendMessage(tab.id, 'unblock');
                        }
                    } else {
                        for (const entry of result.blockedUrls || []) {
                            if (!entry.active) continue;
                            const { shouldBlock, remainingDuration } = await shouldBlockUrl(tab.url, entry);
                            if (shouldBlock) {
                                await sendMessage(tab.id, 'block', remainingDuration);
                                break;
                            }
                        }
                    }
                }
            }
        }
    }
});

setInterval(async () => {
    try {
        const result = await chrome.storage.local.get(['blockedUrls', 'distructorEnabled']);
        if (!result.distructorEnabled || !result.blockedUrls || result.blockedUrls.length === 0) {
            return;
        }
        
        const tabs = await chrome.tabs.query({});
        for (const tab of tabs) {
            if (tab.url && !tab.url.startsWith('chrome://')) {
                let matchesScheduledUrl = false;
                let currentBlockState = false;
                
                for (const entry of result.blockedUrls) {
                    if (!entry.active) continue;
                    
                    try {
                        const tabUrl = new URL(tab.url);
                        const entryUrl = entry.url;

                        const isRegex = entryUrl.startsWith('/') && entryUrl.endsWith('/');
                        if (isRegex) {
                            const regexPattern = entryUrl.slice(1, -1);
                            const regex = new RegExp(regexPattern);
                            matchesScheduledUrl = regex.test(tabUrl.hostname);
                        } else {
                            const isWildcard = entryUrl.includes('*');
                            if (isWildcard) {
                                const wildcardPattern = entryUrl.replace(/\*/g, '.*');
                                const regex = new RegExp(`^${wildcardPattern}$`);
                                matchesScheduledUrl = regex.test(tabUrl.hostname);
                            } else {
                                const entryUrlObj = new URL(entryUrl.startsWith('http') ? entryUrl : `https://${entryUrl}`);
                                matchesScheduledUrl = tabUrl.hostname.endsWith(entryUrlObj.hostname);
                            }
                        }

                        if (matchesScheduledUrl) {
                            const { shouldBlock, remainingDuration } = await shouldBlockUrl(tab.url, entry);
                            if (shouldBlock) {
                                await sendMessage(tab.id, 'block', remainingDuration);
                                currentBlockState = true;
                                break;
                            }
                        }
                    } catch (error) {
                        debugLog(`Error parsing URL: ${error.message}`);
                        continue;
                    }
                }
                
                if (matchesScheduledUrl && !currentBlockState) {
                    await sendMessage(tab.id, 'unblock');
                }
            }
        }
    } catch (error) {
        debugLog(`Error in periodic check: ${error.message}`);
    }
}, 30000);