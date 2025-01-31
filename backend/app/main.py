from fastapi import FastAPI
from .routers import videos, votes, proxy, users

app = FastAPI()

# Include routers
app.include_router(videos.router)
app.include_router(votes.router)
app.include_router(proxy.proxy_router)
app.include_router(users.router)

@app.get("/")
async def root():
    return {"message": "Welcome to the Pikavote API!"} 