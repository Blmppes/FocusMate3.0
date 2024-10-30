// DOM Elements
const chatContainer = document.getElementById('chat-container');
const roomLabel = document.getElementById('roomLabel');
const leaveButton = document.getElementById('leaveRoom');
const backgroundOptions = document.getElementById('background-options');
const roomBody = document.getElementById('room-body');
const participantsList = document.getElementById('participantsList');
const progressBar = document.getElementById('progress-bar');
const messageInput = document.getElementById('message-input');
const sendButton = document.getElementById('send-btn');
const fileInput = document.getElementById('file-input');
const sendFileButton = document.getElementById('send-file-btn');

// Get the room ID from the URL
const urlParams = new URLSearchParams(window.location.search);
const roomId = urlParams.get('id');
let userId;
let userData;
let coins = 0;
let isInteractingWithFileInput = false;

function showPopup(message) {
    document.getElementById('message').textContent = message;
    document.getElementById('popup').style.display = 'block';
}

function hidePopup(){
    document.getElementById('popup').style.display = 'none';
}

document.getElementById('closePopup').addEventListener('click', () => {
    hidePopup();
});

// Initialize user data
async function initializeUserData() {
    try {
        userId = await window.firebaseAPI.getCurrentUserId(); 
        userData = await window.firebaseAPI.getUserData(userId);
        coins = userData.balance;
    } catch (error) {
        console.error("Error fetching user data: ", error);
    }
}

// Join the room
const joinRoom = async () => {
    try {
        if (!roomId) return;
        
        chatContainer.style.display = 'block';
        roomLabel.innerHTML = roomId;
        window.electronAPI.send('lock-screen');
        // console.log(userData, userData.name);
        window.socketAPI.emit('joinRoom', { roomName: roomId, username: userData.name });
        
        await loadUserBackgrounds();
        startProgressBar();
        loadMessages(); // Load messages on joining
    } catch (error) {
        console.error("Error joining room:", error);
    }
};

let fileDialogOpen = false; // Flag to track if the file dialog is open
let userLeaving = false; // Flag to track if the user is leaving
let focusLossTimer; // Timer to handle focus loss logic

// Event listener to detect when the file input gains focus
fileInput.addEventListener('focus', () => {
    fileDialogOpen = true; // Mark the file dialog as open
    userLeaving = false; // Reset leaving state
    console.log('File dialog is about to open:', fileDialogOpen);
});

// Listen for the 'change' event to detect if a file was selected
fileInput.addEventListener('change', () => {
    fileDialogOpen = false; // Dialog closed after selection
    console.log('File selected, dialog closed');
});

// Use blur to detect when the file dialog closes without selection
fileInput.addEventListener('blur', () => {
    // If the file dialog is open, ignore blur
    if (fileDialogOpen) return;

    console.log('File dialog closed without selection');
});

// Handle the app-blurred event
window.electronAPI.receive('app-blurred', () => {
    console.log('App lost focus.');
    // Set the userLeaving flag to true
    userLeaving = true; 

    // Start a timer to check if the app stays blurred
    focusLossTimer = setTimeout(() => {
        // If the dialog is not open, we proceed to kick out
        if (!fileDialogOpen) {
            console.log('Kicking user out due to prolonged focus loss...');
            window.socketAPI.emit('leaveRoom', { roomName: roomId, username: userData.name });
            document.location.href = 'index.html';
        }
    }, 1000); // 1 second; adjust as needed
});

// Detect when the app gains focus again
window.electronAPI.receive('app-focused', () => {
    console.log('App regained focus');
    // Clear the timer if the app gains focus
    clearTimeout(focusLossTimer);
    
    // Reset dialog state if it was not opened
    if (!fileDialogOpen) {
        fileDialogOpen = false; // Ensure consistent state
    }
});

// Create a timer to periodically check the focus state
setInterval(() => {
    if (userLeaving) {
        const isAppFocused = document.hasFocus(); // Check if the app is currently focused

        // If the app is focused again, reset the leaving state
        if (isAppFocused) {
            userLeaving = false;
            console.log("User is back in the app.");
        }
    }
}, 1000); // Check every second


// Load messages from Firestore for the room
async function loadMessages() {
    try {
        const messages = await window.firebaseAPI.getRoomMessages(roomId);
        messages.forEach(displayMessage); // Display each message
    } catch (error) {
        console.error("Error loading messages:", error);
    }
}

// Send message on button click
sendButton.addEventListener('click', sendMessage);

async function sendMessage() {
    const messageText = messageInput.value.trim();
    const file = fileInput.files[0]; // Get the selected file

    let message = {
        text: messageText,
        userId: userId,
        userName: userData.name,
        timestamp: Date.now(),
        linkToFile: null // Initialize as null
    };

    try {
        if (file) {
            // Upload file to Firebase Storage and get the download URL
            const fileUrl = await window.firebaseAPI.uploadFile('messages', roomId, file); // Implement this function to handle file uploads
            message.linkToFile = fileUrl; // Set the link to the uploaded file
        }

        // Add message to Firestore
        await window.firebaseAPI.addRoomMessage(roomId, message);
        
        // Emit new message event to notify other clients
        window.socketAPI.emit('newMessage', message);

        // Show in UI immediately
        displayMessage(message);
        messageInput.value = ''; // Clear input
        fileInput.value = ''; // Clear file input
    } catch (error) {
        console.error("Error sending message:", error);
    }
}

// Display message in the chat
function displayMessage({ text, userName, timestamp, linkToFile }) {
    const messageElement = document.createElement('div');
    messageElement.classList.add('message');

    const time = new Date(timestamp).toLocaleTimeString();
    messageElement.innerHTML = `<strong>${userName}</strong> <small>${time}</small><p>${text}</p>`;

    // If there's a file link, create an anchor element to download/view it
    if (linkToFile) {
        const fileExtension = linkToFile.split('.').pop().toLowerCase(); // Get file extension
        if (['jpg', 'jpeg', 'png', 'gif', 'bmp'].includes(fileExtension)) {
            // If it's an image file, display the image
            const imageElement = document.createElement('img');
            imageElement.src = linkToFile;
            imageElement.alt = 'Image message';
            imageElement.style.maxWidth = '200px'; // Set max width for images
            imageElement.style.maxHeight = '200px'; // Set max height for images
            messageElement.appendChild(imageElement);
        } else {
            // If it's a file, create a link for downloading
            const fileLink = document.createElement('a');
            fileLink.href = linkToFile;
            fileLink.textContent = `Download ${linkToFile.split('/').pop()}`; // Display file name
            fileLink.target = '_blank'; // Open in new tab
            messageElement.appendChild(fileLink);
        }
    }

    // Append the message to the messages container
    const messagesContainer = document.getElementById('messages');
    messagesContainer.appendChild(messageElement);
    messagesContainer.scrollTop = messagesContainer.scrollHeight; // Auto-scroll
}

// Listen for new messages in real-time
window.socketAPI.on('newMessage', (message) => {
    displayMessage(message);
});

// Load owned backgrounds from Firestore
const loadUserBackgrounds = async () => {
    try {
        const ownedBackgrounds = await window.firebaseAPI.getBackgroundsInfo(userData.backgrounds);

        // Clear previous options and display backgrounds
        backgroundOptions.innerHTML = '';
        ownedBackgrounds.forEach(background => {
            const backgroundItem = document.createElement('img');
            backgroundItem.src = background.url;
            backgroundItem.alt = background.name;
            backgroundItem.addEventListener('click', () => {
                roomBody.style.backgroundImage = `url(${background.url})`;
                const modal = bootstrap.Modal.getInstance(document.getElementById('backgroundModal'));
                modal.hide();
                console.log(`Background changed to: ${background.url}`);
            });
            backgroundOptions.appendChild(backgroundItem);
        });
    } catch (error) {
        console.error("Error fetching backgrounds: ", error);
    }
};

// Function to update coins in Firebase
async function updateCoinsInFirebase() {
    try {
        await window.firebaseAPI.setDoc('users', userId, { balance: coins });
    } catch (error) {
        console.error("Error updating coins in Firebase: ", error);
    }
}

// Start the progress bar
async function startProgressBar() {
    let progress = 0;
    const interval = setInterval(() => {
        progress += 10; // Increase progress by 10%
        progressBar.style.width = `${progress}%`;

        if (progress >= 100) {
            coins += 1; // Increment coins
            progress = 0; // Reset progress
            progressBar.style.width = '0%'; // Reset bar width
            updateCoinsInFirebase(); // Update Firebase without await to prevent blocking
        }
    }, 1000); // Update every second
}

// Call initialization and join room
initializeUserData().then(joinRoom);

// Handle incoming user connection
window.socketAPI.on('userConnected', async (packet) => {
    console.log(`User connected: ${packet.name} (ID: ${packet.userId})`);
    showPopup(`User ${packet.name} has just entered the room!`);
});

// Handle the userDisconnected event
window.socketAPI.on('userDisconnected', async (packet) => {
    console.log(`User disconnected: ${packet.userId}`);
    showPopup(`User ${packet.name} left the room!`);
});

// Update the participants modal with the current users
window.socketAPI.on('updateParticipants', (participants) => {
    console.log("Updating participants list:", participants);
    participantsList.innerHTML = ''; // Clear the current list
    participants.forEach(participantId => {
        const listItem = document.createElement('li');
        listItem.classList.add('list-group-item');
        listItem.innerText = `User: ${participantId.name}`;
        participantsList.appendChild(listItem);
    });
});

// Fetch and display the list of friends
const loadFriendsList = async () => {
    try {
        const userData = await window.firebaseAPI.getUserData(userId); // Get the user's friends from Firebase
        console.log(userData);
        const friends = userData.friends;
        const friendsList = document.getElementById('friendsList');
        friendsList.innerHTML = ''; // Clear existing list
        if(friends.length == 0) return;

        for (const friend of friends) {
            const friendData = await window.firebaseAPI.getUserData(friend);
            const listItem = document.createElement('li');
            listItem.classList.add('list-group-item', 'd-flex', 'justify-content-between', 'align-items-center');
            listItem.textContent = friendData.name;

            const inviteButton = document.createElement('button');
            inviteButton.textContent = 'Invite';
            inviteButton.classList.add('btn', 'btn-success', 'btn-sm');
            inviteButton.addEventListener('click', () => inviteFriend(friend, friendData.name));

            listItem.appendChild(inviteButton);
            friendsList.appendChild(listItem);
        };
    } catch (error) {
        console.error("Error fetching friends: ", error);
    }
};

// Call loadFriendsList when modal is opened
document.getElementById('inviteFriendsBtn').addEventListener('click', loadFriendsList);

const inviteFriend = async (friendId, friendName) => {
    try {
        console.log(`Inviting friend ${friendName} (ID: ${friendId}) to the room ${roomId}`);
        
        // Create invitation in Firestore
        await window.firebaseAPI.addDoc('invites', {
            sender: userId,
            receiver: friendId,
            roomId: roomId,
            roomName: roomLabel.innerHTML,
            timestamp: Date.now()
        });
        
        // Notify the user that the invite was sent
        showPopup(`Invitation sent to ${friendName}.`);
    } catch (error) {
        console.error("Error sending invite: ", error);
    }
};

const showInvitationPopup = (roomName, sender, roomId) => {
    console.log(`Received invitation from ${sender} to join room ${roomName}`);
    

    const acceptButton = document.createElement('button');
    acceptButton.textContent = 'Accept';
    acceptButton.classList.add('btn', 'btn-success');
    acceptButton.addEventListener('click', () => acceptInvite(roomId));

    const denyButton = document.createElement('button');
    denyButton.textContent = 'Deny';
    denyButton.classList.add('btn', 'btn-danger');
    denyButton.addEventListener('click', hidePopup);

    // Append buttons to the popup
    const popupContent = document.getElementById('popup');
    popupContent.innerHTML = ''; // Clear previous content
    popupContent.appendChild(acceptButton);
    popupContent.appendChild(denyButton);
    showPopup(`You have been invited to join ${roomName} by ${sender}.`);
};

window.electronAPI.receive('firestore:docChanged', (roomName, sender, receiver, roomId) => {
    console.log(receiver, userId);
    if (receiver == userId) {
        showInvitationPopup(roomName, sender, roomId);
    }
});

const acceptInvite = (roomId) => {
    console.log(`Joining room ${roomId} after accepting invite.`);
    window.location.href = `room.html?id=${roomId}`; // Redirect user to the invited room
};

window.socketAPI.on('endnow', () => {
    window.location.href = 'index.html';
});

// Leave room event listener
leaveButton.addEventListener('click', async () => {
    await window.socketAPI.emit('leaveRoom', { roomName: roomId, username: userData.name });
    window.location.href = 'index.html'; // Redirect to the home page
});

window.socketAPI.on('hostLeaving', async (roomName) => {
    if (await window.firebaseAPI.checkRoomExists(roomName)) { // Check if the room still exists
        // Perform the necessary actions to delete the room from the client-side collection
        
        await window.firebaseAPI.deleteRoom(roomName);
    } else {
        console.log(`Room ${roomName} has already been deleted.`);
    }
});

