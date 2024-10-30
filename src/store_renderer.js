async function loadStore() {
    const backgroundsList = document.getElementById("backgrounds-store");
    const userBalanceEl = document.getElementById("balance-amount");
    const userId = await window.firebaseAPI.getCurrentUserId();
    const userData = await window.firebaseAPI.getUserData(userId);
    let userBalance = userData.balance;
    
    userBalanceEl.textContent = userBalance;

    const ownedBackgrounds = userData.backgrounds;

    // Fetch and display backgrounds from Firebase Storage
    const allBackgrounds = await window.firebaseAPI.getBackgroundsInfo("all");
    for (const back_data of allBackgrounds) {
        const productDiv = document.createElement("div");
        productDiv.classList.add("store-item");

        const isOwned = ownedBackgrounds.includes(back_data.name);

        productDiv.innerHTML = `
            <img src="${back_data.url}" alt="${back_data.name}">
            <h4>${back_data.name}</h4>
            <button class="${isOwned ? 'purchased' : ''}" 
                    ${isOwned ? 'disabled' : ''}>
                ${isOwned ? 'Purchased' : 'Purchase for 50 coins'}
            </button>
        `;

        productDiv.querySelector('button').addEventListener('click', async function () {
            if (isOwned) return;

            if (userBalance >= 50) {
                // Deduct balance, update user backgrounds, and update Firestore
                userBalance -= 50;
                userBalanceEl.textContent = userBalance;

                await window.firebaseAPI.setDoc('users', userId, {balance: userBalance});
                await window.firebaseAPI.addNewBack(userId, back_data.name);
                // Update button state
                this.textContent = 'Purchased';
                this.classList.add('purchased');
                this.disabled = true;
            } else {
                alert("You don't have enough coins to purchase this background.");
            }
        });

        backgroundsList.appendChild(productDiv);
    }
}

// Call the loadStore function to display the store
loadStore();

function showPopup(message) {
    document.getElementById('message').textContent = message;
    document.getElementById('popup').style.display = 'block';
}

document.getElementById('closePopup').addEventListener('click', () => {
    document.getElementById('popup').style.display = 'none';
});