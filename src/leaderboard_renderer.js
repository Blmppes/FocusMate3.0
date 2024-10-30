async function fetchLeaderboard() {
    try {
        const users = await window.firebaseAPI.getUsersData(); // Fetch users data from Firestore
        users.sort((a, b) => b.balance - a.balance); // Sort users by balance in ascending order

        const leaderboardBody = document.getElementById("leaderboard-body");
        leaderboardBody.innerHTML = ''; // Clear existing rows

        users.forEach(user => {
            const row = document.createElement("tr");
            row.innerHTML = `
                <td>${user.name}</td>
                <td>${user.balance} coins</td>
                <td>${user.backgrounds.length}</td>
            `;

            // Add click event to navigate to user profile page
            row.addEventListener('click', () => {
                window.location.href = `profile.html?userId=${user.id}`; // Redirect to profile page with userId
            });

            leaderboardBody.appendChild(row); // Add row to the table
        });
    } catch (error) {
        console.error("Error fetching leaderboard data:", error);
    }
}

function showPopup(message) {
    document.getElementById('message').textContent = message;
    document.getElementById('popup').style.display = 'block';
}

document.getElementById('closePopup').addEventListener('click', () => {
    document.getElementById('popup').style.display = 'none';
});

// Call fetchLeaderboard when the window is loaded
window.onload = fetchLeaderboard;
