import requests
from fastapi import APIRouter, HTTPException

proxy_router = APIRouter(
    prefix="/proxy",
    tags=["proxy"],
)

@proxy_router.get("/")
def proxy_video(url: str):
    try:
        # Make the request to the target URL
        response = requests.get(url, timeout=10)
        response.raise_for_status()  # Raise exception for HTTP errors
        # Return the response content to the frontend
        return response.text
    except requests.exceptions.RequestException as e:
        raise HTTPException(status_code=500, detail=f"Error fetching URL: {e}")