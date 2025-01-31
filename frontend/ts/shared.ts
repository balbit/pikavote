// Add logout functionality
document.getElementById('logoutButton')?.addEventListener('click', () => {
    localStorage.removeItem('username');
    window.location.href = '/login.html';
});

// Check login status on every page load
window.addEventListener('load', () => {
    const username = localStorage.getItem('username');
    const currentPath = window.location.pathname;
    
    if (!username && currentPath !== '/login.html') {
        // If not logged in and not on login page, redirect to login
        window.location.href = '/login.html';
    } else if (username) {
        // If logged in, update username display
        const usernameDisplay = document.getElementById('usernameDisplay');
        if (usernameDisplay) {
            usernameDisplay.innerText = username;
        }
    }
}); 