#!/bin/bash

# Navigate to the backend directory
cd backend

# Set the PYTHONPATH to the backend directory
export PYTHONPATH=$(pwd)

# Restart or start the FastAPI server using pm2
pm2 restart pikavote-backend || pm2 start start_server.py --name pikavote-backend --interpreter python3 