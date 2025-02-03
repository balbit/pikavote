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

let inspectCurrentVideoId: number | null = null;
let inspectCurrentStar: boolean = false;
let inspectVideoBuffer: VideoData[] = [];

// In inspect mode we only need one video at a time.
async function inspectFillVideoBuffer(): Promise<void> {
    const username = localStorage.getItem("username");
    if (!username) {
        console.error('Username not found');
        return;
    }
    const videosNeeded = 1;
    try {
        const response = await fetch(`/api/videos/unseen_videos/${username}?n=${videosNeeded}`, {
            method: 'GET',
        });
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        const newVideos: VideoData[] = await response.json();
        inspectVideoBuffer.push(...newVideos);
    } catch (err) {
        console.error('Error fetching video for inspect mode:', err);
    }
}

async function displayVideoInspect(videoData: VideoData): Promise<void> {
    const container = document.getElementById("videoContainer");
    if (!container) return;
    container.innerHTML = "";
    inspectCurrentVideoId = videoData.video.id;

    try {
        // Use the proxy endpoint to fetch the video page
        const response = await fetch(`/api/videos/proxy?url=${encodeURIComponent(videoData.video.video_link)}`);
        const html = await response.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, "text/html");

        // Find video element and its source
        const videoElement = doc.querySelector("video");
        const sourceElement = doc.querySelector("video source, video[src]");
        let videoUrl = "";
        if (sourceElement && sourceElement.getAttribute("src")) {
            videoUrl = sourceElement.getAttribute("src")!;
        } else if (videoElement && videoElement.getAttribute("src")) {
            videoUrl = videoElement.getAttribute("src")!;
        }
        videoUrl = videoUrl.replace(/['"\\]/g, "").replace(/\n/g, "");
        if (!videoUrl.startsWith("http://") && !videoUrl.startsWith("https://")) {
            console.error("Invalid video URL:", videoUrl);
            container.innerHTML = "Invalid video URL";
            return;
        }

        // Create a new video element
        const newVideo = document.createElement("video");
        newVideo.controls = true;
        newVideo.autoplay = true;
        newVideo.style.maxWidth = "50%";
        newVideo.style.maxHeight = "50vh";
        newVideo.style.borderRadius = "8px";
        newVideo.style.border = "2px solid #444";
        newVideo.src = videoUrl;

        container.appendChild(newVideo);

        // Display metadata (visible by default)
        const infoContainer = document.createElement("div");
        infoContainer.id = "infoContainerInspect";
        infoContainer.innerHTML = `
            <h3>Video Information</h3>
            <p><strong>Submission Time:</strong> ${new Date(videoData.video.submission_time).toLocaleString()}</p>
            <p><strong>Comments:</strong> ${videoData.video.comments}</p>
            <h3>User Information</h3>
            <p><strong>Name:</strong> ${videoData.user.name}</p>
            <p><strong>Email:</strong> ${videoData.user.email}</p>
            <p><strong>Following:</strong> ${videoData.user.following}</p>
            <p><strong>Social:</strong> ${videoData.user.social}</p>
        `;
        infoContainer.style.maxWidth = "50%";
        infoContainer.style.padding = "10px";
        infoContainer.style.background = "#222";
        infoContainer.style.borderRadius = "8px";
        infoContainer.style.color = "#f5e8d6";

        container.appendChild(infoContainer);

    } catch (err) {
        console.error("Error loading video:", err);
        container.innerHTML = "Failed to load video.";
    }
}

function submitVoteInspect(score: number, star: boolean) {
    const username = localStorage.getItem("username");
    if (!inspectCurrentVideoId) {
        console.error("No video ID found");
        return;
    }
    fetch("/api/votes/", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": "Bearer " + "YOUR_BEARER_TOKEN",
        },
        body: JSON.stringify({
            username: username,
            video_id: inspectCurrentVideoId,
            time: new Date().toISOString(),
            score: score,
            star: star ? 1 : 0,
        }),
    })
    .then(response => {
        if (!response.ok) {
            throw new Error("HTTP error! Status: " + response.status);
        }
        return response.json();
    })
    .then(data => {
        console.log("Vote submitted:", data);
    })
    .catch(err => {
        console.error("Error submitting vote:", err);
    });
}

window.addEventListener("DOMContentLoaded", async () => {
    const username = localStorage.getItem("username");
    if (!username) {
        window.location.href = "/login.html";
        return;
    }
    document.getElementById("usernameDisplay")!.innerText = username;
    
    // If a videoId is provided in the query, load that video.
    // Otherwise, fetch a random unseen video.
    const urlParams = new URLSearchParams(window.location.search);
    const videoId = urlParams.get("videoId");
    if (videoId) {
        try {
            const response = await fetch(`/api/videos/video/${videoId}`, {
                method: "GET",
                headers: {
                    "Authorization": "Bearer " + "YOUR_BEARER_TOKEN"
                },
            });
            if (!response.ok) {
                throw new Error("Failed to load video");
            }
            const videoData = await response.json();
            displayVideoInspect(videoData);
        } catch (error) {
            console.error("Error loading video:", error);
        }
    } else {
        await inspectFillVideoBuffer();
        if (inspectVideoBuffer.length > 0) {
            const videoData = inspectVideoBuffer.shift()!;
            displayVideoInspect(videoData);
        } else {
            document.getElementById("videoContainer")!.innerText = "No videos available.";
        }
    }

    // Controls:
    document.getElementById("nextVideo")?.addEventListener("click", async () => {
        await inspectFillVideoBuffer();
        if (inspectVideoBuffer.length > 0) {
            const videoData = inspectVideoBuffer.shift()!;
            displayVideoInspect(videoData);
        }
    });

    document.getElementById("starButton")?.addEventListener("click", () => {
        inspectCurrentStar = !inspectCurrentStar;
        document.getElementById("starButton")!.innerText = inspectCurrentStar ? "★" : "☆";
    });

    document.getElementById("ratingSlider")?.addEventListener("change", (event) => {
        // Optionally, show preview of the selected vote.
    });

    // Keyboard shortcuts: numbers (1-5) to vote; Enter to trigger next video.
    document.addEventListener("keydown", (event) => {
        const key = event.key;
        if (["1", "2", "3", "4", "5"].includes(key)) {
            submitVoteInspect(parseInt(key), inspectCurrentStar);
        } else if (key === "Enter") {
            document.getElementById("nextVideo")?.click();
        }
    });
}); 