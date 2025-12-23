// Quick button fix for चेtanā app
// This file ensures proper button functionality across the application

document.addEventListener('DOMContentLoaded', function() {
    // Remove any existing event listeners to prevent duplicates
    const quickButtons = document.querySelectorAll('.quick-btn');
    
    // Clear any existing listeners by cloning and replacing elements
    quickButtons.forEach(button => {
        if (!button.hasAttribute('data-listener-fixed')) {
            button.setAttribute('data-listener-fixed', 'true');
            
            // Remove any existing click listeners by cloning the element
            const newButton = button.cloneNode(true);
            button.parentNode.replaceChild(newButton, button);
            
            // Add single click listener to the new button
            newButton.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                
                const message = this.getAttribute('data-message');
                if (message) {
                    // Determine if we're in demo or therapist chat
                    const isDemoChat = document.getElementById('demo-chat-screen').classList.contains('active');
                    const isTherapistChat = document.getElementById('therapist-chat-screen').classList.contains('active');
                    
                    if (isDemoChat) {
                        // Send message directly for demo chat
                        if (typeof handleQuickMessage === 'function') {
                            handleQuickMessage('demo', message);
                        }
                    } else if (isTherapistChat) {
                        // Send message directly for therapist chat
                        if (typeof handleQuickMessage === 'function') {
                            handleQuickMessage('therapist', message);
                        }
                    } else {
                        // Fallback: just populate the input field
                        const activeScreen = document.querySelector('.screen.active');
                        const messageInput = activeScreen?.querySelector('input[type="text"]');
                        if (messageInput) {
                            messageInput.value = message;
                            messageInput.focus();
                        }
                    }
                }
            }, { once: false }); // Allow multiple clicks but prevent event bubbling
        }
    });
});