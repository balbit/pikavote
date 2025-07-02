// import { Chart } from 'chart.js';
// import { Chart } from 'chart.js';


// // Register the necessary components
// Chart.register(...registerables);
declare var JSZip: any;

interface VideoStat {
    id: number;
    video_link: string;
    submission_time: string;
    creator_name: string;
    creator_email: string;
    average_score: number;
    total_votes: number;
}

interface VideoStatsResponse {
    total_votes: number;
    total_videos: number;
    videos_with_0_votes: number;
    videos_with_1_or_more_votes: number;
    videos_with_3_or_more_votes: number;
    vote_scores_histogram: {
        scores: number[];
        counts: number[];
    };
    top_videos: VideoStat[];
}

let currentPage = 0;
let pageSize = 15;

const scoreFilters = [3,4,5];
const voteFilters = [2,3,4];
let scoreFilter = 0;
let voteFilter = 0;

// Function to load video statistics
function loadVideoStats() {
    const offset = currentPage * pageSize;
    fetch(`/api/videos/stats?offset=${offset}&limit=${pageSize}`, {
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
    .then((data: VideoStatsResponse) => {
        const statsList = document.getElementById('statsList')!;
        const controlsHTML = `
            <div id="controls" style="margin-bottom: 20px;">
                <span style="flex-grow: 1;"></span>
                <button id="selectGe5">Score >= 5</button>
                <button id="selectGe4">Score >= 4</button>
                <button id="selectGe3">Score >= 3</button>
                <button id="selectVotes2">Votes >= 2</button>
                <button id="selectVotes3">Votes >= 3</button>
                <button id="selectVotes4">Votes >= 4</button>
            </div>
        `;


        // Build pagination controls (previous/next)
        const paginationHTML = `
            <div id="pagination" style="margin-bottom: 20px; display: flex; align-items: center; gap: 10px;">
                <button id="prevPage" ${currentPage === 0 ? 'disabled' : ''} style="display: flex; align-items: center;">
                    <span style="font-size: 1em;">&#9664;</span>
                </button>
                <span> Page ${currentPage + 1} </span>
                <button id="nextPage" style="display: flex; align-items: center;">
                    <span style="font-size: 1em;">&#9654;</span>
                </button>
                <label for="pageSizeSelect" style="margin-left:20px;">Page Size:</label>
                <select id="pageSizeSelect">
                    <option value="10" ${pageSize === 10 ? 'selected' : ''}>10</option>
                    <option value="15" ${pageSize === 15 ? 'selected' : ''}>15</option>
                    <option value="20" ${pageSize === 20 ? 'selected' : ''}>20</option>
                    <option value="30" ${pageSize === 30 ? 'selected' : ''}>30</option>
                    <option value="50" ${pageSize === 50 ? 'selected' : ''}>50</option>
                    <option value="100" ${pageSize === 100 ? 'selected' : ''}>100</option>
                    <option value="300" ${pageSize === 300 ? 'selected' : ''}>300</option>
                    <option value="600" ${pageSize === 600 ? 'selected' : ''}>600</option>
                </select>
                <span style="flex-grow: 1;"></span>
                <button id="selectPage">Select All</button>
                <button id="downloadSelected">Download Selected</button>
                <button id="downloadAsZip">Download Individual</button>
            </div>
        `;

        // Build the table including a checkbox column and storing video link as data attribute.
        const tableHTML = `
            <h3>Top Videos</h3>
            ${paginationHTML}
            ${controlsHTML}
            <table id="topVideosTable">
                <thead>
                    <tr>
                        <th>Select</th>
                        <th>Video ID</th>
                        <th>Creator</th>
                        <th>Score</th>
                        <th>Total Votes</th>
                        <th>Submission Date</th>
                        <th>Links</th>
                    </tr>
                </thead>
                <tbody>
                    ${data.top_videos.map((video: VideoStat) => `
                        <tr data-video-link="${video.video_link}">
                            <td><input type="checkbox" class="checkbox" /></td>
                            <td><a href="#" class="video-link" data-video-id="${video.id}">${video.id}</a></td>
                            <td>
                                <div class="creator-info">
                                    <span class="creator-name">${video.creator_name}</span>
                                    <span class="creator-email">${video.creator_email}</span>
                                </div>
                            </td>
                            <td class="score-cell">${video.average_score.toFixed(2)}</td>
                            <td>${video.total_votes}</td>
                            <td>${new Date(video.submission_time).toLocaleString()}</td>
                            <td>
                                <a href="${video.video_link}" target="_blank" class="external-link">
                                    Original
                                </a>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;

        // Build the overall stats HTML (e.g., overall votes and videos)
        statsList.innerHTML = `
            ${tableHTML}
            <h3>Overall Statistics</h3>
            <p><strong>Total Votes:</strong> ${data.total_votes}</p>
            <p><strong>Total Videos:</strong> ${data.total_videos}</p>
            <div id="statsCharts">
                <div style="display: flex; flex-wrap: wrap; gap: 40px; margin-top: 40px;">
                    <div style="width: 40%;">
                        <canvas id="pieChart"></canvas>
                    </div>
                    <div style="width: 50%;">
                        <canvas id="barChart"></canvas>
                    </div>
                </div>
            </div>
        `;

        const userVotesList = document.getElementById('userVotesList')!;
        fetch('/api/votes/top_users?limit=10', {
            method: 'GET',
            headers: {
                'Authorization': 'Bearer ' + 'YOUR_BEARER_TOKEN', // Adjust if needed
            },
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            if (data.top_users && data.top_users.length > 0) {
                // Build HTML for the top users table
                let tableHTML = `
                    <h3>Top Users by Votes</h3>
                    <table id="topUsersTable">
                        <thead>
                            <tr>
                                <th>Username</th>
                                <th># Votes</th>
                                <th>Average Score</th>
                                <th>% of 5s</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${data.top_users.map((user:any) => `
                                <tr>
                                    <td>${user.username}</td>
                                    <td>${user.num_votes}</td>
                                    <td>${parseFloat(user.average_score).toFixed(2)}</td>
                                    <td>${parseFloat(user.percent_5s).toFixed(2)}%</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                `;
                userVotesList.innerHTML = tableHTML;
            } else {
                userVotesList.innerHTML = `<p>No user vote data available.</p>`;
            }
        })
        .catch(err => {
            console.error('Error fetching top users:', err);
            userVotesList.innerHTML = `<p>Error loading user vote data.</p>`;
        });

        // Wire up pagination buttons
        const prevBtn = document.getElementById('prevPage')!;
        const nextBtn = document.getElementById('nextPage')!;
        prevBtn.addEventListener('click', () => {
            if (currentPage > 0) {
                currentPage--;
                loadVideoStats();
            }
        });
        nextBtn.addEventListener('click', () => {
            currentPage++;
            loadVideoStats();
        });

        // Add click handlers for video links
        const videoLinks = document.querySelectorAll('.video-link');
        videoLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const videoId = parseInt((e.target as HTMLElement).getAttribute('data-video-id')!);
                if (!isNaN(videoId)) {
                    window.location.href = `/inspect.html?videoId=${videoId}`;
                }
            });
        });

        document.getElementById('selectPage')!.addEventListener('click', function() {
            const checkboxes = document.querySelectorAll<HTMLInputElement>('#topVideosTable tbody .checkbox');
            const allSelected = Array.from(checkboxes).every(cb => cb.checked);
            if (allSelected) {
                // Deselect all checkboxes
                checkboxes.forEach(cb => cb.checked = false);
                this.textContent = "Select All on Page";
            } else {
                // Select all checkboxes
                checkboxes.forEach(cb => cb.checked = true);
                this.textContent = "Deselect All";
            }
        });
        
        function updateVideosWithFilters() {
            const rows = document.querySelectorAll<HTMLTableRowElement>('#topVideosTable tbody tr');
            rows.forEach(row => {
                const scoreText = row.querySelector('.score-cell')?.textContent || "0";
                const votesText = row.querySelector('td:nth-child(5)')?.textContent || "0";
                console.log(scoreText, votesText);
                const score = parseFloat(scoreText);
                const votes = parseInt(votesText, 10);
                let show = true;
                if (scoreFilter && score < scoreFilter) {
                    show = false;
                }
                if (voteFilter && votes < voteFilter) {
                    show = false;
                }
                (row.querySelector('.checkbox') as HTMLInputElement).checked = show;
            });

            const selectPageButton = document.getElementById('selectPage')!;
            const checkboxes = document.querySelectorAll<HTMLInputElement>('#topVideosTable tbody .checkbox');
            const allSelected = Array.from(checkboxes).every(cb => cb.checked);
            if (allSelected) {
                selectPageButton.textContent = "Deselect All";
            } else {
                selectPageButton.textContent = "Select All on Page";
            }
        }

        for (const score of scoreFilters) {
            document.getElementById(`selectGe${score}`)!.addEventListener('click', function() {
                if (scoreFilter === score) {
                    scoreFilter = 0;
                    this.classList.remove('active');
                } else {
                    scoreFilter = score;
                    this.classList.add('active');
                    for (const other of scoreFilters) {
                        if (other !== score) {
                            document.getElementById(`selectGe${other}`)!.classList.remove('active');
                        }
                    }
                }
                updateVideosWithFilters();
            });
        }

        for (const votes of voteFilters) {
            document.getElementById(`selectVotes${votes}`)!.addEventListener('click', function() {
                if (voteFilter === votes) {
                    voteFilter = 0;
                    this.classList.remove('active');
                } else {
                    voteFilter = votes;
                    this.classList.add('active');
                    for (const other of voteFilters) {
                        if (other !== votes) {
                            document.getElementById(`selectVotes${other}`)!.classList.remove('active');
                        }
                    }
                }
                updateVideosWithFilters();
            });
        }

        const pageSizeSelect = document.getElementById('pageSizeSelect');
        if (pageSizeSelect) {
            pageSizeSelect.addEventListener('change', (e) => {
                // Parse the new page size
                const newSize = parseInt((e.target as HTMLSelectElement).value, 10);
                if (!isNaN(newSize)) {
                    pageSize = newSize;
                    currentPage = 0; // Reset to first page when page size changes
                    loadVideoStats();
                }
            });
        }

        document.getElementById('downloadSelected')!.addEventListener('click', downloadSelectedAsZip);
        document.getElementById('downloadAsZip')!.addEventListener('click', downloadSelectedStats);

        // Generate Pie Chart
        const pieCtx = (document.getElementById('pieChart') as HTMLCanvasElement).getContext('2d')!;
        new Chart(pieCtx, {
            type: 'pie',
            data: {
                labels: ['0 Votes', '1-2 Votes', '3+ Votes'],
                datasets: [{
                    data: [
                        data.videos_with_0_votes,
                        data.videos_with_1_or_more_votes - data.videos_with_3_or_more_votes, // 1-2 votes
                        data.videos_with_3_or_more_votes
                    ],
                    backgroundColor: [
                        '#FF6384',
                        '#36A2EB',
                        '#FFCE56'
                    ],
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'Video Votes Distribution'
                    }
                }
            }
        });

        // Generate Bar Chart (Histogram of Vote Scores)
        const barCtx = (document.getElementById('barChart') as HTMLCanvasElement).getContext('2d')!;
        new Chart(barCtx, {
            type: 'bar',
            data: {
                labels: data.vote_scores_histogram.scores.map(score => `Score ${score}`),
                datasets: [{
                    label: '# of Votes',
                    data: data.vote_scores_histogram.counts,
                    backgroundColor: '#36A2EB',
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'Vote Scores Histogram'
                    },
                    legend: {
                        display: false
                    }
                }
            }
        });
    })
    .catch(err => {
        console.error('Error fetching video stats:', err);
    });
}

async function downloadSelectedStats() {
    // Get all table rows
    const rows = document.querySelectorAll<HTMLTableRowElement>('#topVideosTable tbody tr');
    for (const row of Array.from(rows)) {
        const checkbox = row.querySelector<HTMLInputElement>('.checkbox');
        if (checkbox && checkbox.checked) {
            const videoLink = row.getAttribute('data-video-link');
            const videoIdText = row.querySelector<HTMLAnchorElement>('.video-link')?.textContent;
            const videoId = videoIdText ? parseInt(videoIdText, 10) : NaN;
            if (videoLink && !isNaN(videoId)) {
                await downloadVideoStats(videoLink, videoId);
            }
        }
    }
}

async function downloadSelectedAsZip() {
    const videoSourceUrls = [];

    const rows = document.querySelectorAll<HTMLTableRowElement>('#topVideosTable tbody tr');
    for (const row of Array.from(rows)) {
        const checkbox = row.querySelector<HTMLInputElement>('.checkbox');
        if (checkbox && checkbox.checked) {
            const videoLink: string | null = row.getAttribute('data-video-link');
            const videoIdText = row.querySelector<HTMLAnchorElement>('.video-link')?.textContent;
            const videoId = videoIdText ? parseInt(videoIdText, 10) : NaN;
            if (videoLink && !isNaN(videoId)) {
                videoSourceUrls.push(getVideoSourceUrl(videoLink as string));
            }
        }
    }

    const zip = new JSZip();

    // Map each video URL to a promise that fetches the file and adds it to the zip.
    const downloadPromises = videoSourceUrls.map(async (videoUrl, index) => {
        try {
            const response = await fetch(await videoUrl);
        if (!response.ok) {
            throw new Error(`Failed to fetch ${videoUrl}: ${response.statusText}`);
        }
        // Get the video file as a blob (you can also use arrayBuffer() if needed)
        const blob = await response.blob();
        // Optionally, derive a file name. Here we simply name them sequentially.
        const fileName = `video-${index + 1}.mp4`;
        zip.file(fileName, blob);
        } catch (error) {
        console.error(`Error downloading ${videoUrl}:`, error);
        }
    });

    // Wait for all the downloads to finish
    await Promise.all(downloadPromises);

    // Generate the zip file as a blob.
    const zipBlob = await zip.generateAsync({ type: 'blob' });

    // Trigger the download. You can use FileSaver.js if included:
    // saveAs(zipBlob, 'videos.zip');

    // Or do it manually:
    const downloadLink = document.createElement('a');
    downloadLink.href = URL.createObjectURL(zipBlob);
    downloadLink.download = 'videos.zip';
    document.body.appendChild(downloadLink);
    downloadLink.click();
    // Clean up
    URL.revokeObjectURL(downloadLink.href);
    downloadLink.remove();
}

async function getVideoSourceUrl(videoLink: string): Promise<string> {
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
        return videoSourceUrl;
    } catch (error) {
        console.error(`Error fetching video source URL:`, error);
        return '';
    }
}

async function downloadVideoStats(videoLink: string, videoId: number): Promise<void> {
    try {
        // Fetch the video source URL
        const videoSourceUrl = await getVideoSourceUrl(videoLink);
    
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


// Initial setup: Load stats on page load
window.addEventListener('DOMContentLoaded', () => {
    const username = localStorage.getItem('username');
    if (!username) {
        window.location.href = `/login.html`;
        return;
    }

    document.getElementById('usernameDisplay')!.innerText = username;
    loadVideoStats();
});
