// frontend/ts/login.ts

// Fetch usernames from the server
async function fetchUsernames() {
    try {
        const response = await fetch('/api/users/usernames');
        if (!response.ok) {
            throw new Error('Failed to fetch usernames');
        }
        return await response.json();
    } catch (error) {
        console.error('Error fetching usernames:', error);
        return [];
    }
}

// Populate the datalist with usernames
async function populateUsernames() {
    const usernames = await fetchUsernames();
    const datalist = document.getElementById('usernames') as HTMLDataListElement;
    datalist.innerHTML = ''; // Clear existing options

    usernames.forEach((username: string) => {
        const option = document.createElement('option');
        option.value = username;
        datalist.appendChild(option);
    });
}

// Handle login button click
document.getElementById('loginButton')?.addEventListener('click', () => {
    const usernameInput = document.getElementById('username') as HTMLInputElement;
    const username = usernameInput.value.trim();

    if (!username) {
        alert('Please enter a username');
        return;
    }

    // Check if the username exists in the datalist
    const datalist = document.getElementById('usernames') as HTMLDataListElement;
    const options = Array.from(datalist.options).map(option => option.value);

    if (!options.includes(username)) {
        if (confirm(`Create new user (${username})?`)) {
            // Logic to create a new user
            console.log(`Creating new user: ${username}`);
            // Implement user creation logic here
            localStorage.setItem('username', username);
            window.location.href = '/voting.html';
        }
    } else {
        // Proceed with login
        console.log(`Logging in as: ${username}`);
        localStorage.setItem('username', username);
        window.location.href = '/voting.html';
    }
});

// Initialize the page
window.addEventListener('DOMContentLoaded', () => {
    populateUsernames();
});

// Hide navigation elements on login page
window.addEventListener('load', () => {
    const navElements = document.querySelectorAll('#navVoting, #navMyVotes, #navStats, #logoutButton');
    navElements.forEach(element => {
        (element as HTMLElement).style.display = 'none';
    });
    
    const usernameDisplay = document.getElementById('usernameDisplay');
    if (usernameDisplay) {
        usernameDisplay.style.display = 'none';
    }
});
