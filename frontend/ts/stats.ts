// import { Chart } from 'chart.js';
// import { Chart } from 'chart.js';


// // Register the necessary components
// Chart.register(...registerables);

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

// Function to load video statistics
function loadVideoStats() {
    fetch(`/api/videos/stats`, {
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
        statsList.innerHTML = `
            <h3>Top Videos</h3>
            <table id="topVideosTable">
                <thead>
                    <tr>
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
                        <tr>
                            <td><a href="#" class="video-link" data-video-id="${video.id}">${video.id}</a></td>
                            <td>
                                <div class="creator-info">
                                    <span class="creator-name">${video.creator_name}</span>
                                    <span class="creator-email">${video.creator_email}</span>
                                </div>
                            </td>
                            <td>${video.average_score.toFixed(2)}</td>
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
            <h3>Overall Statistics</h3>
            <p><strong>Total Votes:</strong> ${data.total_votes}</p>
            <p><strong>Total Videos:</strong> ${data.total_videos}</p>
        `;

        // Add click handlers for video links
        const videoLinks = document.querySelectorAll('.video-link');
        videoLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const videoId = parseInt((e.target as HTMLElement).getAttribute('data-video-id')!);
                if (!isNaN(videoId)) {
                    window.location.href = `/voting.html?videoId=${videoId}`;
                }
            });
        });

        // Generate Pie Chart
        const pieCtx = (document.getElementById('pieChart') as HTMLCanvasElement).getContext('2d')!;
        new Chart(pieCtx, {
            type: 'pie',
            data: {
                labels: ['0 Votes', '1+ Votes', '3+ Votes'],
                datasets: [{
                    data: [
                        data.videos_with_0_votes,
                        data.videos_with_1_or_more_votes, // 1-2 votes
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
