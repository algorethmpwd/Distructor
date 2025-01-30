function debugLog(message) {
    console.log(`[Distructor Content] ${message}`);
}

(function () {
    let isBlocked = false;
    let blockEndTime = null;
    let blockOverlay = null;

    const originalSetTimeout = window.setTimeout;
    const originalSetInterval = window.setInterval;
    const originalRequestAnimationFrame = window.requestAnimationFrame;

    function createBlockOverlay(duration) {
        debugLog(`Creating block overlay for ${duration} hours`);

        try {
            isBlocked = true;

            const now = new Date();
            blockEndTime = now.getTime() + duration * 3600 * 1000;
            debugLog(`Block will end at: ${new Date(blockEndTime)}`);

            function stopAllProcesses() {
                // Clear all timers
                for (let i = 1; i < 10000; i++) {
                    window.clearTimeout(i);
                    window.clearInterval(i);
                }

                // Override timer functions
                window.setTimeout = () => 0;
                window.setInterval = () => 0;
                window.requestAnimationFrame = () => 0;
                window.requestIdleCallback = () => 0;
                window.queueMicrotask = () => {};

                // Stop all animations
                document.getAnimations().forEach((animation) => {
                    try {
                        animation.pause();
                        animation.cancel();
                    } catch (e) {
                        debugLog(`Animation stop error: ${e}`);
                    }
                });

                // Stop all media (videos, audio, iframes)
                document.querySelectorAll('video, audio, iframe').forEach((media) => {
                    try {
                        media.pause();
                        media.src = '';
                        media.remove();
                    } catch (e) {
                        debugLog(`Media stop error: ${e}`);
                    }
                });

                // Prevent new elements from loading
                const observer = new MutationObserver((mutations) => {
                    mutations.forEach((mutation) => {
                        mutation.addedNodes.forEach((node) => {
                            if (node.tagName === 'VIDEO' || node.tagName === 'AUDIO' || node.tagName === 'IFRAME') {
                                node.remove();
                            }
                        });
                    });
                });

                observer.observe(document.body, {
                    childList: true,
                    subtree: true,
                });
            }

            stopAllProcesses();
            setInterval(stopAllProcesses, 1000); // Periodically stop new processes

            // Create the block overlay
            blockOverlay = document.createElement('div');
            blockOverlay.id = 'distructorOverlay';
            blockOverlay.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100vw;
                height: 100vh;
                background-color: rgba(0, 0, 0, 0.97);
                z-index: 2147483647;
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: center;
                color: white;
                font-family: Arial, sans-serif;
                text-align: center;
                padding: 20px;
                box-sizing: border-box;
                pointer-events: auto !important;
                overflow: hidden;
            `;

            // Add "Blocked by Distructor" message
            const message = document.createElement('h1');
            message.textContent = 'This site is blocked by Distructor';
            message.style.cssText = `
                font-size: 2.5rem;
                margin-bottom: 10px;
                color: #ff6b6b;
                user-select: none;
            `;

            // Create container for "Made by" text
            const madeByContainer = document.createElement('div');
            madeByContainer.style.cssText = `
                font-size: 1.5rem;
                margin-bottom: 20px;
                user-select: none;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 5px;
            `;

            // Add "Made by" text
            const madeByText = document.createElement('span');
            madeByText.textContent = 'Made by';
            madeByText.style.color = 'white';

            // Add Algorethm as a clickable link with rainbow animation
            const algorethmLink = document.createElement('a');
            algorethmLink.href = 'https://youtube.com/@algorethm_';
            algorethmLink.target = '_blank';
            algorethmLink.textContent = 'Algorethm';
            algorethmLink.className = 'clickable-button';
            algorethmLink.style.cssText = `
                text-decoration: none;
                cursor: pointer !important;
                background: linear-gradient(to right, #ff0000, #ff7f00, #ffff00, #00ff00, #0000ff, #4b0082, #8f00ff);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                background-size: 200% auto;
                animation: rainbow 5s linear infinite;
                pointer-events: auto !important;
                position: relative;
                z-index: 2147483649;
            `;

            madeByContainer.appendChild(madeByText);
            madeByContainer.appendChild(algorethmLink);

            // Add countdown timer
            const countdown = document.createElement('div');
            countdown.id = 'distructorCountdown';
            countdown.style.cssText = `
                font-size: 2rem;
                color: #4ecdc4;
                font-weight: bold;
                user-select: none;
            `;

            // Add PayPal button with neomorphism
            const donationContainer = document.createElement('div');
            donationContainer.id = 'donationButtons';
            donationContainer.style.cssText = `
                margin-top: 20px;
                display: flex;
                justify-content: center;
                z-index: 2147483648;
            `;

            const paypalButton = document.createElement('a');
            paypalButton.href = 'https://www.paypal.com/donate/?hosted_button_id=Z9HENP8G6PTD6';
            paypalButton.target = '_blank';
            paypalButton.textContent = 'Donate via PayPal';
            paypalButton.className = 'clickable-button';
            paypalButton.style.cssText = `
                display: inline-block;
                padding: 12px 24px;
                background: #0095ff;
                color: white;
                border-radius: 10px;
                text-decoration: none;
                cursor: pointer !important;
                box-shadow: 5px 5px 10px #1a1a1a, 
                           -5px -5px 10px #404040;
                transition: all 0.3s ease;
                user-select: none;
                pointer-events: auto !important;
                position: relative;
                z-index: 2147483649;
            `;

            // Add hover effects and necessary styles
            const style = document.createElement('style');
            style.innerHTML = `
                @keyframes rainbow {
                    0% { background-position: 0% 50%; }
                    100% { background-position: 200% 50%; }
                }

                .neo-button:hover {
                    box-shadow: inset 5px 5px 10px rgba(0, 0, 0, 0.2),
                                inset -5px -5px 10px rgba(255, 255, 255, 0.1);
                    transform: scale(0.98);
                }

                .clickable-button {
                    pointer-events: auto !important;
                    cursor: pointer !important;
                    z-index: 2147483649;
                }
            `;
            document.head.appendChild(style);

            paypalButton.classList.add('neo-button');
            donationContainer.appendChild(paypalButton);

            // Append all elements to the overlay
            blockOverlay.appendChild(message);
            blockOverlay.appendChild(madeByContainer);
            blockOverlay.appendChild(countdown);
            blockOverlay.appendChild(donationContainer);

            // Ensure the overlay is always on top
            function ensureOverlayPresence() {
                if (!document.getElementById('distructorOverlay')) {
                    document.body.appendChild(blockOverlay);
                }
                document.body.style.overflow = 'hidden';
            }

            ensureOverlayPresence();
            setInterval(ensureOverlayPresence, 100);

            // Revamped event handling
            function handleEvent(e) {
                // Check if the click is on a clickable button
                if (e.target.closest('.clickable-button')) {
                    return true; // Allow the event to proceed
                }

                // Block all other events
                e.stopPropagation();
                e.preventDefault();
                return false;
            }

            // Add event listeners with the new handler
            const events = [
                'click',
                'mousedown',
                'mouseup',
                'touchstart',
                'touchend'
            ];

            events.forEach(eventType => {
                document.addEventListener(eventType, handleEvent, { capture: true });
            });

            // Separate keyboard event handler
            function handleKeyboard(e) {
                e.stopPropagation();
                e.preventDefault();
                return false;
            }

            // Block keyboard events
            const keyboardEvents = ['keydown', 'keyup', 'keypress'];
            keyboardEvents.forEach(eventType => {
                document.addEventListener(eventType, handleKeyboard, { capture: true });
            });

            // Countdown function
            function updateCountdown() {
                if (!isBlocked) return;

                const now = Date.now();
                const timeLeft = blockEndTime - now;

                if (timeLeft <= 0) {
                    debugLog('Block duration ended');
                    removeBlockOverlay();
                    window.location.reload();
                    return;
                }

                const hours = Math.floor(timeLeft / (1000 * 60 * 60));
                const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
                const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);

                const countdownElement = document.getElementById('distructorCountdown');
                if (countdownElement) {
                    countdownElement.textContent = `Time left: ${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
                }

                originalSetTimeout(updateCountdown, 1000);
            }

            updateCountdown();
            debugLog('Block overlay created successfully');
        } catch (error) {
            debugLog(`Error creating overlay: ${error.message}`);
            isBlocked = false;
        }
    }

    function removeBlockOverlay() {
        debugLog('Removing block overlay');

        window.setTimeout = originalSetTimeout;
        window.setInterval = originalSetInterval;
        window.requestAnimationFrame = originalRequestAnimationFrame;

        const overlay = document.getElementById('distructorOverlay');
        if (overlay) {
            overlay.remove();
        }

        document.body.style.overflow = 'auto';
        isBlocked = false;
        blockEndTime = null;
        blockOverlay = null;

        debugLog('Block overlay removed');
    }

    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        debugLog(`Received message: ${JSON.stringify(message)}`);

        if (message.action === 'ping') {
            sendResponse({ status: 'alive' });
        } else if (message.action === 'block' && message.duration) {
            createBlockOverlay(message.duration);
            sendResponse({ success: true });
        } else if (message.action === 'unblock') {
            removeBlockOverlay();
            sendResponse({ success: true });
        }
        return true;
    });

    debugLog('Content script loaded');
})();
