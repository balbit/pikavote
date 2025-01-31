interface Vote {
    id: number;
    video_id: number;
    score: number;
    star: number;
    time: string;
}

// Function to load user's votes
function loadMyVotes() {
    const username = localStorage.getItem('username');
    if (!username) {
        console.error('Username not found in localStorage.');
        window.location.href = `/login.html`;
        return;
    }

    fetch(`/api/votes/my_votes/${username}`, {
        method: 'GET',
        headers: {
            'Authorization': 'Bearer ' + 'YOUR_BEARER_TOKEN', // Replace with dynamic token if available
        },
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return response.json();
    })
    .then((data: Vote[]) => {
        // Sort votes by time in decreasing order (most recent first)
        data.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

        const votesTableBody = document.querySelector('#votesTable tbody')!;
        votesTableBody.innerHTML = ''; // Clear existing rows

        data.forEach((vote: Vote) => {
            const row = document.createElement('tr');

            // Make video_id clickable
            const videoLink = document.createElement('a');
            videoLink.href = `/voting.html?videoId=${vote.video_id}`;
            videoLink.className = 'video-link';
            videoLink.textContent = vote.video_id.toString();

            // Score display
            const scoreText = document.createElement('span');
            scoreText.textContent = vote.score.toString();

            // Star display
            const starText = document.createElement('span');
            starText.textContent = vote.star ? '⭐' : '';

            // Time display
            const timeText = document.createElement('span');
            timeText.textContent = new Date(vote.time).toLocaleString();

            // Delete button
            const deleteButton = document.createElement('button');
            deleteButton.textContent = 'Delete';
            deleteButton.className = 'delete-button';
            deleteButton.addEventListener('click', () => {
                deleteVote(vote.id);
            });

            row.innerHTML = `
                <td></td>
                <td></td>
                <td></td>
                <td></td>
                <td></td>
            `;

            row.children[0].appendChild(videoLink);
            row.children[1].appendChild(scoreText);
            row.children[2].appendChild(starText);
            row.children[3].appendChild(timeText);
            row.children[4].appendChild(deleteButton);

            votesTableBody.appendChild(row);
        });
    })
    .catch(err => {
        console.error('Error fetching my votes:', err);
    });
}

// Function to delete a vote
function deleteVote(voteId: number) {
    if (!confirm('Are you sure you want to delete this vote?')) {
        return;
    }

    fetch(`/api/votes/${voteId}`, {
        method: 'DELETE',
        headers: {
            'Authorization': 'Bearer ' + 'YOUR_BEARER_TOKEN', // Replace with dynamic token if available
        },
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        console.log('Vote deleted:', data);
        // Refresh the votes table
        loadMyVotes();
    })
    .catch(err => {
        console.error('Error deleting vote:', err);
        alert('Failed to delete vote.');
    });
}

// Initial setup: Load votes on page load
window.addEventListener('load', () => {
    const username = localStorage.getItem('username');
    if (!username) {
        window.location.href = `/login.html`;
        return;
    }

    document.getElementById('usernameDisplay')!.innerText = username;
    loadMyVotes();
});
