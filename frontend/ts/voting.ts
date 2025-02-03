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

// Video buffer to store upcoming videos
let videoBuffer: VideoData[] = [];
const BUFFER_SIZE = 4;
const BUFFER_THRESHOLD = 3; // Refill when buffer reaches this size

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

window.addEventListener('DOMContentLoaded', async () => {
    const username = localStorage.getItem('username');
    if (!username) {
        window.location.href = `/login.html`;
        return;
    }
    document.getElementById('usernameDisplay')!.innerText = username;
    
    const urlParams = new URLSearchParams(window.location.search);
    const videoId = urlParams.get('videoId');
    
    if (videoId) {
        // Single video mode: load only one video
        try {
            const response = await fetch(`/api/videos/video/${videoId}`, {
                method: 'GET',
            });
            if (!response.ok) {
                throw new Error('Failed to load video');
            }
            const videoData = await response.json();
            currentVideoCards = [];
            const card = await createVideoCard(videoData);
            currentVideoCards.push(card);
            const container = document.getElementById('videoContainer')!;
            container.innerHTML = '';
            container.appendChild(card.cardElement);
        } catch (error) {
            console.error('Error loading video', error);
        }
    } else {
        // Grid mode with four videos
        await fillVideoBuffer();
        currentVideoCards = [];
        for (let i = 0; i < NUM_VIDEOS_PER_PAGE; i++) {
            const videoData = videoBuffer.shift();
            console.log('Video data:', videoData);
            if (videoData) {
                const card = await createVideoCard(videoData);
                currentVideoCards.push(card);
            } else {
                console.error('No more videos to show!');
            }
        }
        renderVideoGrid();
    }
});

// New interface for a video card (each card representing a video in the grid)
interface VideoCard {
    videoData: VideoData;
    vote: number | null;
    star: boolean;
    cardElement: HTMLElement;
}

const NUM_VIDEOS_PER_PAGE = 4;
let currentVideoCards: VideoCard[] = [];
let selectedIndex: number = 0;


// -----------------------------------------------------------------------------
// NEW FUNCTION: Create a video card with video, vote overlay, metadata & star icons
// -----------------------------------------------------------------------------
async function createVideoCard(videoData: VideoData): Promise<VideoCard> {
    const cardDiv = document.createElement('div');
    cardDiv.classList.add('video-card');
    cardDiv.style.width = '100%';  // Ensure card takes full width in grid

    const wrapper = document.createElement('div');
    wrapper.classList.add('video-wrapper');
    cardDiv.appendChild(wrapper);

    // URL button (get URL icon) placed at the top-left corner
    const urlButton = document.createElement('button');
    urlButton.classList.add('url-button');
    urlButton.innerText = 'u';
    // Style the URL button directly
    urlButton.style.position = 'absolute';
    urlButton.style.top = '5px';
    urlButton.style.left = '5px';
    urlButton.style.background = 'transparent';
    urlButton.style.border = 'none';
    urlButton.style.color = '#f5e8d6';
    urlButton.style.fontSize = '1.2em';
    urlButton.style.cursor = 'pointer';
    wrapper.appendChild(urlButton);

    urlButton.addEventListener('click', (event) => {
        event.stopPropagation();
        const url = `${window.location.origin}/voting.html?videoId=${videoData.video.id}`;
        navigator.clipboard.writeText(url)
            .then(() => updateHint('Video URL copied to clipboard!'))
            .catch(() => updateHint('Failed to copy URL.'));
    });

    try {
        const response = await fetch(`/api/videos/proxy?url=${encodeURIComponent(videoData.video.video_link)}`);
        if (!response.ok) throw new Error("Failed to fetch video.");
        const html = await response.text();
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
        const videoElem = document.createElement('video');
        videoElem.src = videoSourceUrl;
        videoElem.controls = true;
        videoElem.autoplay = true;
        videoElem.loop = true;
        videoElem.muted = true;
        videoElem.style.borderRadius = '8px';
        videoElem.style.border = '2px solid #444';
        
        // Add click handler to toggle mute
        videoElem.addEventListener('click', (e) => {
            e.stopPropagation();  // Don't trigger card selection
            videoElem.muted = !videoElem.muted;
        });
        
        wrapper.appendChild(videoElem);
    } catch (err) {
        console.error('Error loading video:', err);
        wrapper.innerHTML = 'Failed to load video.';
    }

    // Vote overlay to display the temporary vote score
    const overlay = document.createElement('div');
    overlay.classList.add('vote-overlay');
    overlay.innerText = ''; // updated once a vote is entered
    wrapper.appendChild(overlay);

    // Metadata button (info icon)
    const metaButton = document.createElement('button');
    metaButton.classList.add('meta-button');
    metaButton.innerText = 'ℹ';
    wrapper.appendChild(metaButton);

    // Metadata popup (hidden by default)
    const metaPopup = document.createElement('div');
    metaPopup.classList.add('metadata-popup');
    metaPopup.innerHTML = `
        <h3>Video Information</h3>
        <p><strong>Submission Time:</strong> ${new Date(videoData.video.submission_time).toLocaleString()}</p>
        <p><strong>Comments:</strong> ${videoData.video.comments}</p>
        <h3>User Information</h3>
        <p><strong>Name:</strong> ${videoData.user.name}</p>
        <p><strong>Email:</strong> ${videoData.user.email}</p>
        <h3>Following</h3>
        <p><strong>Following:</strong> ${videoData.user.following}</p>
        <p><strong>Social:</strong> ${videoData.user.social}</p>
    `;
    wrapper.appendChild(metaPopup);
    metaPopup.style.display = 'none';
    metaPopup.style.position = 'absolute';
    metaPopup.style.top = '30px';
    metaPopup.style.right = '5px';
    metaPopup.style.background = '#222';
    metaPopup.style.padding = '10px';
    metaPopup.style.borderRadius = '8px';
    metaPopup.style.color = '#f5e8d6';
    metaPopup.style.zIndex = '10';

    // Show/hide metadata popup on hover over the meta button
    metaButton.addEventListener('mouseenter', () => {
        metaPopup.style.display = 'block';
    });
    metaButton.addEventListener('mouseleave', () => {
        metaPopup.style.display = 'none';
    });
    
    // Star button (for toggling favorite state)
    const starButton = document.createElement('button');
    starButton.classList.add('star-button');
    starButton.innerText = '☆';
    wrapper.appendChild(starButton);

    // Create the video card object
    const card: VideoCard = {
        videoData,
        vote: null,
        star: false,
        cardElement: cardDiv,
    };

    // Toggle star state on click
    starButton.addEventListener('click', (e) => {
        e.stopPropagation();
        card.star = !card.star;
        starButton.innerText = card.star ? '★' : '☆';
    });

    // Clicking on the card sets this card as selected
    cardDiv.addEventListener('click', () => {
        selectedIndex = currentVideoCards.findIndex(c => c.cardElement === cardDiv);
        updateSelection();
        updateHint(`Selected video ${selectedIndex + 1}. Use arrow keys to navigate, number keys (1-5) to vote, and Enter to submit.`);
    });

    return card;
}

// -----------------------------------------------------------------------------
// NEW FUNCTION: Render the video grid by appending each card element
// -----------------------------------------------------------------------------
function renderVideoGrid() {
    const topRow = document.getElementById('topRow')!;
    const bottomRow = document.getElementById('bottomRow')!;
    topRow.innerHTML = '';
    bottomRow.innerHTML = '';
    
    currentVideoCards.forEach((card, index) => {
        card.cardElement.setAttribute('data-index', index.toString());
        // First two cards go to left column, last two to right column
        if (index < 2) {
            topRow.appendChild(card.cardElement);
        } else {
            bottomRow.appendChild(card.cardElement);
        }
        // Update vote overlay if a vote exists
        const overlay = card.cardElement.querySelector('.vote-overlay') as HTMLElement;
        overlay.innerText = card.vote ? card.vote.toString() : '';
    });
    updateSelection();
}

// -----------------------------------------------------------------------------
// NEW FUNCTION: Update the selected card's visual indicator and hint
// -----------------------------------------------------------------------------
function updateSelection() {
    currentVideoCards.forEach((card, index) => {
        if (index === selectedIndex) {
            card.cardElement.classList.add('selected');
        } else {
            card.cardElement.classList.remove('selected');
        }
    });
    updateHint(`Selected video ${selectedIndex + 1}. Use arrow keys to navigate, number keys (1-5) to vote, and Enter to submit.`);
}

// -----------------------------------------------------------------------------
// NEW FUNCTION: Update the hint element with a given message.
// -----------------------------------------------------------------------------
function updateHint(message: string) {
    const hintElem = document.getElementById('hint');
    if (hintElem) {
        hintElem.innerText = message;
    }
}

// -----------------------------------------------------------------------------
// NEW FUNCTION: Handle arrow key navigation within the 2-column grid.
// -----------------------------------------------------------------------------
function handleArrowNavigation(event: KeyboardEvent, key: string) {
    // Prevent default scrolling
    
    if (window.location.pathname === '/voting.html') {
        // event.preventDefault();
    }
    
    if (key === 'ArrowRight') {
        selectedIndex ++;
    } else if (key === 'ArrowLeft') {
        selectedIndex --;
    } else if (key === 'ArrowDown') {
        selectedIndex += 2;
    } else if (key === 'ArrowUp') {
        selectedIndex -= 2;
    }
    selectedIndex = (selectedIndex + currentVideoCards.length) % currentVideoCards.length;
    updateSelection();
}

// -----------------------------------------------------------------------------
// NEW FUNCTION: When a number key is pressed, assign that vote to the current card.
// -----------------------------------------------------------------------------
function handleNumberVote(vote: number) {
    const card = currentVideoCards[selectedIndex];
    card.vote = vote;
    // Update overlay display for vote
    const overlay = card.cardElement.querySelector('.vote-overlay') as HTMLElement;
    overlay.innerText = vote.toString();
    // Mark card as voted (darker appearance)
    card.cardElement.classList.add('voted');
    updateSelection();
}

// -----------------------------------------------------------------------------
// NEW FUNCTION: Submit votes on all cards that have a vote set (on Enter).
// After submission, replace voted cards with new videos.
// -----------------------------------------------------------------------------
async function handleSubmitVotes() {
    const username = localStorage.getItem('username');
    if (!username) {
        console.error('Username not found in localStorage.');
        return;
    }
    const votePromises = currentVideoCards.map(async (card, index) => {
        if (card.vote !== null) {
            try {
                const response = await fetch('/api/votes/', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + 'YOUR_BEARER_TOKEN',
                    },
                    body: JSON.stringify({
                        username: username,
                        video_id: card.videoData.video.id,
                        time: new Date().toISOString(),
                        score: card.vote,
                        star: card.star ? 1 : 0,
                    }),
                });
                if (!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status}`);
                }
                const data = await response.json();
                console.log('Vote submitted for video', card.videoData.video.id, data);
                // Replace this card with a new one from the video buffer
                if (videoBuffer.length <= BUFFER_THRESHOLD) {
                    await fillVideoBuffer();
                }
                const newVideoData = videoBuffer.shift();
                if (newVideoData) {
                    const newCard = await createVideoCard(newVideoData);
                    currentVideoCards[index] = newCard;
                }
            } catch (err) {
                console.error('Error submitting vote for video', card.videoData.video.id, err);
            }
        }
    });
    await Promise.all(votePromises);
    renderVideoGrid();
}

// -----------------------------------------------------------------------------
// NEW GLOBAL KEYDOWN listener for grid navigation and voting
// -----------------------------------------------------------------------------
document.addEventListener('keydown', (event) => {
    const key = event.key;
    if (['ArrowRight', 'ArrowLeft', 'ArrowUp', 'ArrowDown'].includes(key)) {
        // event.preventDefault();  // Prevent scrolling
        handleArrowNavigation(event, key);
    } else if (key === 'Enter') {
        handleSubmitVotes();
    } else if (['1', '2', '3', '4', '5'].includes(key)) {
        handleNumberVote(parseInt(key));
    }
});
