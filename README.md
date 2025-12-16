AlgoHire – Asynchronous Video Processing System
Overview

This repository contains a full-stack asynchronous video processing system built for the AlgoHire (Video Forge) Hackathon.

The application allows users to upload videos, generate multiple output variants asynchronously, track task progress in real time, and download processed files once completed.

The project focuses on system design, asynchronous job handling, persistent state management, and explainability, rather than only media encoding.

Features

Asynchronous video processing using a background worker

Supports MP4, MOV, and WebM input formats (up to 200 MB)

Multiple output variants per video:

MP4 (H.264 + AAC)

WebM (VP9 + Opus)

Resolution profiles:

480p

720p

1080p

Persistent task lifecycle tracking:

Queued

Processing

Completed

Failed

Real-time progress and bitrate updates

Independent task execution with failure isolation

Admin option to clear all stored videos and tasks

Responsive frontend reflecting accurate backend state

Tech Stack

Frontend

React

Vite

Tailwind CSS

Backend

Node.js

Express

TypeScript

Database

PostgreSQL (Prisma ORM)

Video Processing

FFmpeg (via fluent-ffmpeg)

Prerequisites

Ensure the following are installed:

Node.js (v18 or higher)

PostgreSQL (running on port 5432)

FFmpeg (available in system PATH)

Setup Instructions
1. Clone the Repository
git clone https://github.com/Saishivanraj/Video_processing_Algohire.git
cd Video_processing_Algohire

2. Backend Setup
cd backend
npm install


Create a .env file inside the backend directory:

DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/videoforge?schema=public"
PORT=3000


Initialize Prisma:

npx prisma db push
npx prisma generate

3. Frontend Setup
cd ../frontend
npm install

Running the Application

The system requires three separate processes.

Terminal 1: Backend API
cd backend
npm run dev


Runs on:
http://localhost:3000

Terminal 2: Background Worker
cd backend
npm run worker


Processes queued video tasks asynchronously.

Terminal 3: Frontend
cd frontend
npm run dev


Runs on:
http://localhost:5173 (or next available port)

Usage Flow

Open the frontend in the browser.

Upload a video file (MP4, MOV, or WebM).

Select one or more output variants and resolutions.

Each variant is created as an independent task.

Track task progress and status updates in real time.

Download completed outputs.

Failed tasks display error information without affecting others.

Design Notes

Upload and processing are strictly separated.

HTTP requests return immediately after task creation.

Long-running FFmpeg jobs run only in the worker process.

Task states are persisted in PostgreSQL and survive restarts.

The frontend reflects real backend state and is reload-safe.
