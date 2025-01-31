#!/bin/bash

# Navigate to the frontend directory
cd frontend

# Transpile TypeScript to JavaScript
npx tsc

# Start or restart the frontend server using pm2
pm2 restart pikavote-frontend || pm2 start npx --name pikavote-frontend -- http-server -p 8081