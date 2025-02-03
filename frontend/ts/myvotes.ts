interface Vote {
    id: number;
    video_id: number;
    score: number;
    star: number;
    time: string;
}

interface VideoData {
    video: {
        id: number;
        video_link: string;
        submission_time: string;
        comments: string;
    };
    user: {
        email: string;
        name: string;
        following: string;
        social: string;
    };
}

async function extractPosterUrl(videoLink: string): Promise<string | null> {
    const response = await fetch(`/api/videos/proxy?url=${encodeURIComponent(videoLink)}`);
    if (!response.ok) throw new Error("Failed to fetch video.");
    const html = await response.text();

    // check if "videoPoster" is present in the html
    if (!html.includes('videoPoster')) {
        console.error('videoPoster not found in HTML.');
        return null;
    }

    const idx = html.indexOf('videoPoster');
    console.log(html.slice(idx - 50, idx + 200));

    // const regex = /videoPoster\\\\\\":\\s*\\"(https:\/\/[^\\]+\/poster\.jpg)\\"/;
    const regex = /videoPoster\\\\\\\":\\\\\\\"(https:[a-z0-9\/\.\-_]+poster.jpg)/;
    const match = html.match(regex);
    console.log('Match:', match);
    return match ? match[1] : null;
}

async function downloadVideo(videoLink: string, videoId: number): Promise<void> {
    try {
        // Get the video page HTML through the proxy
        const response = await fetch(`/api/videos/proxy?url=${encodeURIComponent(videoLink)}`);
        if (!response.ok) throw new Error("Failed to fetch video.");
        const html = await response.text();
    
        // Parse the HTML to find the video source
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        let videoSourceUrl = '';
        const videoElement = doc.querySelector('video');
        const sourceElement = doc.querySelector('video source, video[src]');
        if (sourceElement && sourceElement.getAttribute('src')) {
            videoSourceUrl = sourceElement.getAttribute('src')!;
        } else if (videoElement && videoElement.getAttribute('src')) {
            videoSourceUrl = videoElement.getAttribute('src')!;
        }
        videoSourceUrl = videoSourceUrl.replace(/['"\\]/g, '').replace(/\n/g, '');
        if (!videoSourceUrl.startsWith('http://') && !videoSourceUrl.startsWith('https://')) {
            throw new Error('Invalid video URL');
        }
    
        // Fetch the video file as a blob
        const videoResponse = await fetch(videoSourceUrl);
        if (!videoResponse.ok) throw new Error("Failed to download video file.");
        const blob = await videoResponse.blob();
    
        // Create a temporary download link and trigger it
        const a = document.createElement('a');
        const blobUrl = URL.createObjectURL(blob);
        a.href = blobUrl;
        a.download = `video_${videoId}.mp4`; // Adjust extension as needed
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(blobUrl);
    } catch (error) {
        console.error(`Error downloading video ${videoId}:`, error);
    }
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
            // Create a clickable box so users can download multiple videos
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.className = 'checkbox';

            // Fetch video poster
            const data: Promise<VideoData> = fetch(`/api/videos/video/${vote.video_id}`).then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status}`);
                }
                return response.json();
            });

            data.then((videoData) => {
                const videoLink = videoData.video.video_link;
                row.setAttribute('data-video-link', videoLink);
                extractPosterUrl(videoLink).then((posterUrl) => {
                    if (posterUrl) {
                        const poster = document.createElement('img');
                        poster.src = posterUrl;
                        poster.width = 100;
                        row.children[1].appendChild(poster);
                    }
                });
            });

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
                <td></td>
                <td></td>
            `;
            
            row.children[0].appendChild(checkbox);
            row.children[2].appendChild(videoLink);
            row.children[3].appendChild(scoreText);
            row.children[4].appendChild(starText);
            row.children[5].appendChild(timeText);
            row.children[6].appendChild(deleteButton);

            votesTableBody.appendChild(row);
        });

        const filterDropdown = document.getElementById('filterScore') as HTMLSelectElement;
        filterRows(parseInt(filterDropdown.value, 10));
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

function forEachRow(callback: (row: HTMLTableRowElement, checkbox: HTMLInputElement, score: number) => void) {
    const rows = document.querySelectorAll<HTMLTableRowElement>('#votesTable tbody tr');
    rows.forEach(row => {
        const checkbox = row.querySelector<HTMLInputElement>('.checkbox');
        if (!checkbox) return;
        // The score is in the 4th cell (index 3)
        const scoreText = row.children[3].textContent;
        const score = scoreText ? parseFloat(scoreText) : 0;
        callback(row, checkbox, score);
    });
}

// "Select All" button handler
function selectAll() {
    forEachRow((_, checkbox) => {
        checkbox.checked = true;
    });
}

// "Select All ≥ 5" button handler
function selectAll5() {
    forEachRow((_, checkbox, score) => {
        checkbox.checked = score >= 5;
    });
}

// "Select All ≥ 4" button handler
function selectAll4() {
    forEachRow((_, checkbox, score) => {
        checkbox.checked = score >= 4;
    });
}

function filterRows(minScore: number) {
    const rows = document.querySelectorAll<HTMLTableRowElement>('#votesTable tbody tr');
    rows.forEach(row => {
        const scoreText = row.children[3].textContent;
        const score = scoreText ? parseFloat(scoreText) : 0;
        row.style.display = score >= minScore ? '' : 'none';
    });
}

// "Download Selected" button handler
async function downloadSelected() {
    // Get all rows that are checked
    const rows = document.querySelectorAll<HTMLTableRowElement>('#votesTable tbody tr');
    // Process each selected row sequentially or concurrently as desired
    console.log('Selected rows:', rows);
    for (const row of Array.from(rows)) {
        console.log('Row:', row);
        const checkbox = row.querySelector<HTMLInputElement>('.checkbox');
        console.log('Checkbox:', checkbox);
        console.log('Checkbox checked:', checkbox?.checked);
        if (checkbox && checkbox.checked) {
            // Get the video link saved in the row's dataset
            const videoLink = row.getAttribute('data-video-link');
            // Also get the video id (from the clickable link in cell 2)
            const videoIdText = row.querySelector<HTMLAnchorElement>('.video-link')?.textContent;
            const videoId = videoIdText ? parseInt(videoIdText, 10) : NaN;
            if (videoLink && !isNaN(videoId)) {
                // Call our download helper
                await downloadVideo(videoLink, videoId);
            }
        }
    }
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

    const selectAllBtn = document.getElementById('selectAllBtn')!;
    const selectAll5Btn = document.getElementById('selectAll5Btn')!;
    const selectAll4Btn = document.getElementById('selectAll4Btn')!;
    const downloadSelectedBtn = document.getElementById('downloadSelectedBtn')!;

    selectAllBtn.addEventListener('click', selectAll);
    selectAll5Btn.addEventListener('click', selectAll5);
    selectAll4Btn.addEventListener('click', selectAll4);
    downloadSelectedBtn.addEventListener('click', downloadSelected);

    const filterDropdown = document.getElementById('filterScore') as HTMLSelectElement;
    filterDropdown.addEventListener('change', () => {
        filterRows(parseInt(filterDropdown.value, 10));
    });
});
