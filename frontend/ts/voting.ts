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
        instagram: string;
        tiktok: string;
        youtube: string;
    };
}

// Video buffer to store upcoming videos
let videoBuffer: VideoData[] = [];
const BUFFER_SIZE = 3;
const BUFFER_THRESHOLD = 1; // Refill when buffer reaches this size

let currentVideoId: number | null = null; // Global variable to store the current video ID
let currentStar: boolean = false; // Flag for star button

// Function to load videos into buffer
async function fillVideoBuffer() {
    const username = localStorage.getItem('username');
    if (!username) {
        console.error('Username not found in localStorage.');
        return;
    }

    const videosNeeded = BUFFER_SIZE - videoBuffer.length;
    if (videosNeeded <= 0) return;

    try {
        const response = await fetch(`/api/videos/unseen_videos/${username}?n=${videosNeeded}`, {
            method: 'GET',
            headers: {
                'Authorization': 'Bearer ' + 'YOUR_BEARER_TOKEN', // Replace with dynamic token if available
            },
        });

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const newVideos: VideoData[] = await response.json();
        videoBuffer.push(...newVideos);
    } catch (err) {
        console.error('Error fetching videos for buffer:', err);
    }
}

// Function to display the next video
async function loadNextVideo() {
    // Check if buffer needs refilling
    if (videoBuffer.length <= BUFFER_THRESHOLD) {
        await fillVideoBuffer();
    }

    // Get next video from buffer
    const nextVideoData = videoBuffer.shift();
    if (!nextVideoData) {
        const videoContainer = document.getElementById('videoContainer')!;
        videoContainer.innerHTML = 'No more videos to watch!';
        return;
    }

    // Update URL without reloading page
    const newUrl = new URL(window.location.href);
    newUrl.searchParams.set('videoId', nextVideoData.video.id.toString());
    window.history.pushState({}, '', newUrl.toString());

    await displayVideo(nextVideoData);

    // Start loading more videos in the background
    fillVideoBuffer();
}

// Function to display a video
async function displayVideo(videoData: VideoData) {
    const videoContainer = document.getElementById('videoContainer')!;
    const video = videoData.video;
    const videoLink = video.video_link;

    // Store the current video ID
    currentVideoId = video.id;

    try {
        // Use the proxy endpoint to fetch the video page
        const response = await fetch(`/api/videos/proxy?url=${encodeURIComponent(videoLink)}`);
        const html = await response.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');

        // Find video element and its source
        const videoElement = doc.querySelector('video');
        const videoSource = doc.querySelector('video source, video[src]');

        if (videoElement || videoSource) {
            // Clear previous contents
            videoContainer.innerHTML = '';

            // Create a new video element
            const newVideo = document.createElement('video');
            newVideo.controls = true;
            newVideo.autoplay = true;
            newVideo.style.maxWidth = '50%';
            newVideo.style.maxHeight = '50vh';
            newVideo.style.borderRadius = '8px';
            newVideo.style.border = '2px solid #444';

            let videoUrl = '';
            if (videoSource?.getAttribute('src')) {
                videoUrl = videoSource.getAttribute('src')!;
            } else if (videoElement?.getAttribute('src')) {
                videoUrl = videoElement.getAttribute('src')!;
            }

            // Clean URL
            videoUrl = videoUrl.replace(/['"\\]/g, '').replace(/\n/g, '');

            if (!videoUrl.startsWith('http://') && !videoUrl.startsWith('https://')) {
                console.error('Invalid or relative video URL:', videoUrl);
                videoContainer.innerHTML = 'Invalid video URL';
                return;
            }

            newVideo.src = videoUrl;

            // Append video to container
            videoContainer.appendChild(newVideo);

            // Display video and user information
            const infoContainer = document.createElement('div');
            infoContainer.id = 'infoContainer';
            infoContainer.innerHTML = `
                <h3>Video Information</h3>
                <p><strong>Submission Time:</strong> ${new Date(video.submission_time).toLocaleString()}</p>
                <p><strong>Comments:</strong> ${video.comments}</p>
                <h3>User Information</h3>
                <p><strong>Name:</strong> ${videoData.user.name}</p>
                <p><strong>Email:</strong> ${videoData.user.email}</p>
                <p><strong>Instagram:</strong> <a href="${videoData.user.instagram}" target="_blank">${videoData.user.instagram}</a></p>
                <p><strong>TikTok:</strong> <a href="${videoData.user.tiktok}" target="_blank">${videoData.user.tiktok}</a></p>
                <p><strong>YouTube:</strong> <a href="${videoData.user.youtube}" target="_blank">${videoData.user.youtube}</a></p>
            `;
            infoContainer.style.maxWidth = '50%';
            infoContainer.style.padding = '10px';
            infoContainer.style.background = '#222';
            infoContainer.style.borderRadius = '8px';
            infoContainer.style.color = '#f5e8d6';

            videoContainer.appendChild(infoContainer);
        } else {
            videoContainer.innerHTML = 'No video found on the page!';
        }
    } catch (err) {
        console.error('Error loading video:', err);
        videoContainer.innerHTML = 'Failed to load video.';
    }
}

// Function to submit a vote
function submitVote(score: number, star: boolean) {
    const username = localStorage.getItem('username');
    if (!currentVideoId) {
        console.error('No video ID found');
        return;
    }

    console.log('Submitting vote:', { username, video_id: currentVideoId, score, star });

    fetch('/api/votes/', { // Use relative path
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + 'YOUR_BEARER_TOKEN', // Replace with dynamic token if available
        },
        body: JSON.stringify({
            username: username,
            video_id: currentVideoId,
            time: new Date().toISOString(),
            score: score,
            star: star ? 1 : 0,
        }),
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        console.log('Vote submitted:', data);
    })
    .catch(err => {
        console.error('Error submitting vote:', err);
    });
}

// Handle "Next Video" button click
document.getElementById('nextVideo')?.addEventListener('click', () => {
    const ratingSlider = document.getElementById('ratingSlider') as HTMLInputElement;
    const score = parseInt(ratingSlider.value);
    submitVote(score, currentStar);
    currentStar = false; // Reset star after submission
    loadNextVideo();
});

// Handle "Star" button click
document.getElementById('starButton')?.addEventListener('click', () => {
    currentStar = true;
});

// Add keyboard shortcuts for rating (1-5)
document.addEventListener('keydown', (event) => {
    const key = event.key;
    if (['1', '2', '3', '4', '5'].includes(key)) {
        const score = parseInt(key);
        submitVote(score, false);
        loadNextVideo();
    }
});

// Function to load a specific video based on URL parameter
// async function loadVideoFromURLParam() {
//     const params = new URLSearchParams(window.location.search);
//     const videoIdParam = params.get('videoId');
//     if (videoIdParam) {
//         const videoId = parseInt(videoIdParam);
//         if (!isNaN(videoId)) {
//             await loadSpecificVideo(videoId);
//         }
//     }
// }

// // Modify the window load event to handle URL parameters
// window.addEventListener('load', async () => {
//     const username = localStorage.getItem('username');
//     if (!username) {
//         window.location.href = `/login.html`;
//         return;
//     }

//     document.getElementById('usernameDisplay')!.innerText = username;

//     // Check if videoId is present in URL
//     const params = new URLSearchParams(window.location.search);
//     const videoIdParam = params.get('videoId');

//     if (videoIdParam) {
//         const videoId = parseInt(videoIdParam);
//         if (!isNaN(videoId)) {
//             await loadSpecificVideo(videoId);
//             return;
//         }
//     }

//     // Initialize the video buffer and load the next video
//     await fillVideoBuffer();
//     loadNextVideo();
// });

// async function loadSpecificVideo(videoId: number) {
//     try {
//         const response = await fetch(`/api/videos/video/${videoId}`, {
//             method: 'GET',
//             headers: {
//                 'Authorization': 'Bearer ' + 'YOUR_BEARER_TOKEN', // Replace with dynamic token if available
//             },
//         });

//         if (!response.ok) {
//             throw new Error(`HTTP error! Status: ${response.status}`);
//         }

//         const videoData = await response.json();

//         // Redirect to voting page with videoId as a query parameter
//         window.location.href = `/voting.html?videoId=${videoId}`;
//     } catch (err) {
//         console.error('Error loading specific video:', err);
//         alert('Failed to load video');
//     }
// }

window.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const videoId = urlParams.get('videoId');

    if (videoId) {
        console.log(`Loading video with ID: ${videoId}`);
        loadVideo(videoId);
    } else {
        await fillVideoBuffer();
        loadNextVideo();
    }
});

function loadVideo(videoId: string) {
    // Fetch and display the video based on the videoId
    fetch(`/api/videos/video/${videoId}`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`Failed to load video with ID: ${videoId}`);
            }
            return response.json();
        })
        .then(videoData => {
            // Display the video data
            console.log('Video data:', videoData);
            // Update the UI with video data
            displayVideo(videoData);
        })
        .catch(error => {
            console.error('Error loading video:', error);
        });
}
