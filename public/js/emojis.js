
const emojiButton = document.getElementById('emoji-button');
const emojiPicker = document.getElementById('emoji-picker');

// Emoji picker functionality
emojiButton.addEventListener('click', () => {
    emojiPicker.classList.toggle('visible');
});

// Close emoji picker when clicking outside
document.addEventListener('click', (e) => {
    if (!emojiButton.contains(e.target) && !emojiPicker.contains(e.target)) {
        emojiPicker.classList.remove('visible');
    }
});

// Handle emoji selection
emojiPicker.addEventListener('emoji-click', event => {
    const emoji = event.detail.unicode;
    const cursorPosition = messageInput.selectionStart;
    const textBeforeCursor = messageInput.value.substring(0, cursorPosition);
    const textAfterCursor = messageInput.value.substring(cursorPosition);
    
    // Insert emoji at cursor position
    messageInput.value = textBeforeCursor + emoji + textAfterCursor;
    
    // Move cursor to after the inserted emoji
    messageInput.selectionStart = cursorPosition + emoji.length;
    messageInput.selectionEnd = cursorPosition + emoji.length;
    
    // Focus back on the input
    messageInput.focus();
    
    // Hide picker after selection
    emojiPicker.classList.remove('visible');
});

// Add to the enableUI function
function enableUI(enabled) {
    messageInput.disabled = !enabled;
    sendButton.disabled = !enabled;
    usernameInput.disabled = !enabled;
    changeUsernameBtn.disabled = !enabled;
    newRoomInput.disabled = !enabled;
    createRoomBtn.disabled = !enabled;
    emojiButton.disabled = !enabled; 
    
    if (enabled) {
        messageInput.focus();
    }
}