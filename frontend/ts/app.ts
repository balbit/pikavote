// let currentVideoId: number | null = null; // Global variable to store the current video ID
// let currentStar: boolean = false; // Flag for star button

// // Add these at the top of your file
// interface VideoData {
//     video: {
//         id: number;
//         video_link: string;
//         submission_time: string;
//         comments: string;
//     };
//     user: {
//         email: string;
//         name: string;
//         following: string;
//         instagram: string;
//         tiktok: string;
//         youtube: string;
//     };
// }

// // Video buffer to store upcoming videos
// let videoBuffer: VideoData[] = [];
// const BUFFER_SIZE = 3;
// const BUFFER_THRESHOLD = 1; // Refill when buffer reaches this size

// // Handle user login
// document.getElementById('loginButton')?.addEventListener('click', async () => {
//     const usernameInput = document.getElementById('username') as HTMLInputElement;
//     const username = usernameInput.value.trim();
//     if (!username) {
//         alert('Please enter a username.');
//         return;
//     }

//     localStorage.setItem('username', username);
//     document.getElementById('usernameDisplay')!.innerText = username;
//     document.getElementById('login')!.classList.add('hidden');
//     document.getElementById('voting')!.classList.remove('hidden');
//     showSection('voting');
    
//     // Initialize the video buffer
//     await fillVideoBuffer();
//     loadNextVideo();
// });

// // Function to load videos into buffer
// async function fillVideoBuffer() {
//     const username = localStorage.getItem('username');
//     if (!username) {
//         console.error('Username not found in localStorage.');
//         return;
//     }

//     const videosNeeded = BUFFER_SIZE - videoBuffer.length;
//     if (videosNeeded <= 0) return;

//     try {
//         const response = await fetch(`/api/videos/unseen_videos/${username}?n=${videosNeeded}`, {
//             method: 'GET',
//             headers: {
//                 'Authorization': 'Bearer ' + '2sEvnYV5es20IM1hrlUNX8S598D_bdwzSW2QGBxBSGoqxe3o',
//             },
//         });
        
//         if (!response.ok) {
//             throw new Error(`HTTP error! Status: ${response.status}`);
//         }
        
//         const newVideos = await response.json();
//         videoBuffer.push(...newVideos);
        
//     } catch (err) {
//         console.error('Error fetching videos for buffer:', err);
//     }
// }

// // Add this function to load a specific video
// async function loadSpecificVideo(videoId: number) {
//     try {
//         const response = await fetch(`/api/videos/video/${videoId}`, {
//             method: 'GET',
//             headers: {
//                 'Authorization': 'Bearer ' + '2sEvnYV5es20IM1hrlUNX8S598D_bdwzSW2QGBxBSGoqxe3o',
//             },
//         });
        
//         if (!response.ok) {
//             throw new Error(`HTTP error! Status: ${response.status}`);
//         }
        
//         const videoData = await response.json();
        
//         // Switch to voting section and display the video
//         showSection('voting');
//         await displayVideo(videoData);
        
//     } catch (err) {
//         console.error('Error loading specific video:', err);
//         alert('Failed to load video');
//     }
// }

// // Refactor the video display logic into a separate function
// async function displayVideo(videoData: VideoData) {
//     const videoContainer = document.getElementById('videoContainer')!;
//     const video = videoData.video;
//     const videoLink = video.video_link;

//     // Store the current video ID
//     currentVideoId = video.id;

//     try {
//         // Use the proxy endpoint to fetch the video page
//         const response = await fetch(`/api/videos/proxy?url=${encodeURIComponent(videoLink)}`);
//         const html = await response.text();
//         const parser = new DOMParser();
//         const doc = parser.parseFromString(html, 'text/html');

//         // Find video element and its source
//         const videoElement = doc.querySelector('video');
//         const videoSource = doc.querySelector('video source, video[src]');
        
//         if (videoElement || videoSource) {
//             // Clear previous contents
//             videoContainer.innerHTML = '';

//             // Create a new video element
//             const newVideo = document.createElement('video');
//             newVideo.controls = true;
//             newVideo.autoplay = true;
//             newVideo.style.maxWidth = '50%';
//             newVideo.style.maxHeight = '50vh';
//             newVideo.style.borderRadius = '8px';
//             newVideo.style.border = '2px solid #444';

//             let videoUrl = '';
//             if (videoSource?.getAttribute('src')) {
//                 videoUrl = videoSource.getAttribute('src')!;
//             } else if (videoElement?.getAttribute('src')) {
//                 videoUrl = videoElement.getAttribute('src')!;
//             }

//             // Clean URL
//             videoUrl = videoUrl.replace(/['"\\]/g, '').replace(/\n/g, '');

//             if (!videoUrl.startsWith('http://') && !videoUrl.startsWith('https://')) {
//                 console.error('Invalid or relative video URL:', videoUrl);
//                 videoContainer.innerHTML = 'Invalid video URL';
//                 return;
//             }

//             newVideo.src = videoUrl;

//             // Append video to container
//             videoContainer.appendChild(newVideo);

//             // Display video and user information
//             const infoContainer = document.createElement('div');
//             infoContainer.id = 'infoContainer';
//             infoContainer.innerHTML = `
//                 <h3>Video Information</h3>
//                 <p><strong>Submission Time:</strong> ${new Date(video.submission_time).toLocaleString()}</p>
//                 <p><strong>Comments:</strong> ${video.comments}</p>
//                 <h3>User Information</h3>
//                 <p><strong>Name:</strong> ${videoData.user.name}</p>
//                 <p><strong>Email:</strong> ${videoData.user.email}</p>
//                 <p><strong>Instagram:</strong> ${videoData.user.instagram}</p>
//                 <p><strong>TikTok:</strong> ${videoData.user.tiktok}</p>
//                 <p><strong>YouTube:</strong> ${videoData.user.youtube}</p>
//             `;
//             infoContainer.style.maxWidth = '50%';
//             infoContainer.style.padding = '10px';
//             infoContainer.style.background = '#222';
//             infoContainer.style.borderRadius = '8px';
//             infoContainer.style.color = '#f5e8d6';

//             videoContainer.appendChild(infoContainer);
//         } else {
//             videoContainer.innerHTML = 'No video found on the page!';
//         }
//     } catch (err) {
//         console.error('Error loading video:', err);
//         videoContainer.innerHTML = 'Failed to load video.';
//     }
// }

// // Modify loadNextVideo to use the new displayVideo function
// async function loadNextVideo() {
//     // Check if buffer needs refilling
//     if (videoBuffer.length <= BUFFER_THRESHOLD) {
//         await fillVideoBuffer();
//     }

//     // Get next video from buffer
//     const nextVideoData = videoBuffer.shift();
//     if (!nextVideoData) {
//         const videoContainer = document.getElementById('videoContainer')!;
//         videoContainer.innerHTML = 'No more videos to watch!';
//         return;
//     }

//     await displayVideo(nextVideoData);
//     // Start loading more videos in the background
//     fillVideoBuffer();
// }

// // Handle voting and submission via "Next Video" button
// document.getElementById('nextVideo')?.addEventListener('click', () => {
//     const ratingSlider = document.getElementById('ratingSlider') as HTMLInputElement;
//     const score = parseInt(ratingSlider.value);
//     submitVote(score, currentStar);
//     currentStar = false; // Reset star after submission
//     loadNextVideo();
// });

// // Handle star button click
// document.getElementById('starButton')?.addEventListener('click', () => {
//     submitVote(0, true);
//     currentStar = false; // Reset star after submission
//     loadNextVideo();
// });

// // Add keyboard shortcuts for rating (1-5)
// document.addEventListener('keydown', (event) => {
//     const key = event.key;
//     if (['1', '2', '3', '4', '5'].includes(key)) {
//         const score = parseInt(key);
//         submitVote(score, false);
//         loadNextVideo();
//     }
// });

// // Function to submit a vote
// function submitVote(score: number, star: boolean) {
//     const username = localStorage.getItem('username');
//     if (!currentVideoId) {
//         console.error('No video ID found');
//         return;
//     }

//     console.log('Submitting vote:', { username, video_id: currentVideoId, score, star });

//     fetch('/api/votes/', { // Use relative path
//         method: 'POST',
//         headers: {
//             'Content-Type': 'application/json',
//             'Authorization': 'Bearer ' + '2sEvnYV5es20IM1hrlUNX8S598D_bdwzSW2QGBxBSGoqxe3o',
//         },
//         body: JSON.stringify({
//             username: username,
//             video_id: currentVideoId,
//             time: new Date().toISOString(),
//             score: score,
//             star: star ? 1 : 0,
//         }),
//     })
//     .then(response => {
//         if (!response.ok) {
//             throw new Error(`HTTP error! Status: ${response.status}`);
//         }
//         return response.json();
//     })
//     .then(data => {
//         console.log('Vote submitted:', data);
//     })
//     .catch(err => {
//         console.error('Error submitting vote:', err);
//     });
// }

// // Handle navigation
// document.getElementById('navVoting')?.addEventListener('click', (e) => {
//     e.preventDefault();
//     showSection('voting');
//     loadNextVideo();
// });

// document.getElementById('navMyVotes')?.addEventListener('click', (e) => {
//     e.preventDefault();
//     showSection('myVotes');
//     loadMyVotes();
// });

// document.getElementById('navStats')?.addEventListener('click', (e) => {
//     e.preventDefault();
//     showSection('videoStats');
//     loadVideoStats();
// });

// document.getElementById('logoutButton')?.addEventListener('click', () => {
//     localStorage.removeItem('username');
//     document.getElementById('usernameDisplay')!.innerText = 'Username';
//     document.getElementById('voting')!.classList.add('hidden');
//     document.getElementById('myVotes')!.classList.add('hidden');
//     document.getElementById('videoStats')!.classList.add('hidden');
//     document.getElementById('login')!.classList.remove('hidden');
// });

// // Function to show a specific section
// function showSection(sectionId: string) {
//     const sections = document.querySelectorAll('.section');
//     sections.forEach(section => {
//         if (section.id === sectionId) {
//             section.classList.remove('hidden');
//         } else {
//             section.classList.add('hidden');
//         }
//     });
// }

// // Function to load user's votes
// function loadMyVotes() {
//     const username = localStorage.getItem('username');
//     if (!username) {
//         console.error('Username not found in localStorage.');
//         return;
//     }

//     fetch(`/api/votes/my_votes/${username}`, {
//         method: 'GET',
//         headers: {
//             'Authorization': 'Bearer ' + '2sEvnYV5es20IM1hrlUNX8S598D_bdwzSW2QGBxBSGoqxe3o',
//         },
//     })
//     .then(response => {
//         if (!response.ok) {
//             throw new Error(`HTTP error! Status: ${response.status}`);
//         }
//         return response.json();
//     })
//     .then(data => {
//         const votesTableBody = document.querySelector('#votesTable tbody')!;
//         votesTableBody.innerHTML = ''; // Clear existing rows

//         data.forEach((vote: any) => {
//             const row = document.createElement('tr');
//             row.innerHTML = `
//                 <td>${vote.video_id}</td>
//                 <td>${vote.score}</td>
//                 <td>${vote.star ? '⭐' : ''}</td>
//                 <td>${new Date(vote.time).toLocaleString()}</td>
//             `;
//             votesTableBody.appendChild(row);
//         });
//     })
//     .catch(err => {
//         console.error('Error fetching my votes:', err);
//     });
// }

// // Modify the video statistics display to include more information
// function loadVideoStats() {
//     fetch(`/api/videos/stats`, {
//         method: 'GET',
//         headers: {
//             'Authorization': 'Bearer ' + '2sEvnYV5es20IM1hrlUNX8S598D_bdwzSW2QGBxBSGoqxe3o',
//         },
//     })
//     .then(response => {
//         if (!response.ok) {
//             throw new Error(`HTTP error! Status: ${response.status}`);
//         }
//         return response.json();
//     })
//     .then(data => {
//         const statsContent = document.getElementById('statsContent')!;
//         statsContent.innerHTML = `
//             <h3>Top Videos</h3>
//             <table id="topVideosTable">
//                 <thead>
//                     <tr>
//                         <th>Video ID</th>
//                         <th>Creator</th>
//                         <th>Score</th>
//                         <th>Total Votes</th>
//                         <th>Submission Date</th>
//                         <th>Links</th>
//                     </tr>
//                 </thead>
//                 <tbody>
//                     ${data.top_videos.map((video: any) => `
//                         <tr>
//                             <td><a href="#" class="video-link" data-video-id="${video.id}">${video.id}</a></td>
//                             <td>
//                                 <div class="creator-info">
//                                     <span class="creator-name">${video.creator_name}</span>
//                                     <span class="creator-email">${video.creator_email}</span>
//                                 </div>
//                             </td>
//                             <td>${video.average_score.toFixed(2)}</td>
//                             <td>${video.total_votes}</td>
//                             <td>${new Date(video.submission_time).toLocaleString()}</td>
//                             <td>
//                                 <a href="${video.video_link}" target="_blank" class="external-link">
//                                     Original
//                                 </a>
//                             </td>
//                         </tr>
//                     `).join('')}
//                 </tbody>
//             </table>
//             <h3>Overall Statistics</h3>
//             <p><strong>Total Votes:</strong> ${data.total_votes}</p>
//             <p><strong>Total Videos:</strong> ${data.total_videos}</p>
//         `;

//         // Add click handlers for video links
//         const videoLinks = document.querySelectorAll('.video-link');
//         videoLinks.forEach(link => {
//             link.addEventListener('click', (e) => {
//                 e.preventDefault();
//                 const videoId = parseInt((e.target as HTMLElement).getAttribute('data-video-id')!);
//                 loadSpecificVideo(videoId);
//             });
//         });
//     })
//     .catch(err => {
//         console.error('Error fetching video stats:', err);
//     });
// } 