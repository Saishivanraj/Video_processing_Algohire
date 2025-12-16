# 🎥 Algo Hire - Video Processing System

A powerful, full-stack asynchronous video processing application built for high performance and reliability. Upload videos, transcode them into multiple formats (MP4, WebM) with optimized speed, and track progress in real-time.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Status](https://img.shields.io/badge/status-Hackathon_Ready-green.svg)

## ✨ Key Features

-   **🚀 High-Performance Transcoding**: Optimized FFmpeg settings for 3-5x faster processing (VP9 Realtime & H.264 Fast).
-   **🛡️ Robust Error Handling**: Automatic retry mechanism (up to 3 attempts) for failed tasks using a database-backed queue.
-   **📊 Real-time Progress Tracking**: Live updates showing both percentage and bitrate (e.g., `45% • 2500 kbps`).
-   **🔄 Multi-Format Support**: Generate 1080p, 720p, 480p variants in both MP4 and WebM containers.
-   **🧹 Admin Controls**: "Clear All History" feature to instantly reset the environment.
-   **🎨 Modern UI**: Sleek, responsive interface with a professional green theme and SVG icons.

## 🛠️ Tech Stack

-   **Frontend**: React, Vite, TailwindCSS
-   **Backend**: Node.js, Express, TypeScript
-   **Database**: PostgreSQL (via Prisma ORM)
-   **Processing**: FFmpeg (fluent-ffmpeg)

## ⚙️ Prerequisites

ensure you have the following installed:
1.  **Node.js** (v18+)
2.  **PostgreSQL** (Running on default port 5432)
3.  **FFmpeg** (Added to system PATH)

## 🏗️ System Architecture & Reliability

### 🔄 Concurrency & Parallelization
- **Multi-threaded Worker**: The system processes **3 videos simultaneously** (`CONCURRENCY_LIMIT = 3`).
- **Non-blocking**: The Node.js event loop ensures that I/O operations (uploading) do not block video processing.

### 🛡️ Failure Handling & Recovery
This system is designed to be **Resilient**:
1.  **Automatic Retries**: If `ffmpeg` fails (e.g., sporadic glitch), the worker automatically retries the task up to **3 times**.
2.  **Crash Recovery**: If the entire worker process crashes (power loss, OOM), the system detects "stale" tasks stuck in `PROCESSING` upon restart and automatically moves them back to `QUEUED`.
3.  **Detailed Error Tracking**: Errors are captured with context (`[PROCESSING_FAILED]`) and displayed in the UI.
4.  **State Timestamps**: Every transition is audit-logged with `startedAt` and `finishedAt` timestamps in the database.

## 🚀 Getting Started

### 1. Clone the Repository
```bash
git clone https://github.com/Saishivanraj/Video_processing_Algohire.git
cd Video_processing_Algohire
```

### 2. Backend Setup
```bash
cd backend
npm install

# Setup Environment Variables
# Create a .env file in /backend with:
# DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/videoforge?schema=public"

# Initialize Database
npx prisma db push
npx prisma generate
```

### 3. Frontend Setup
```bash
cd ../frontend
npm install
```

## 🏃‍♂️ Running the Application

You need to run 3 separate terminals:

**Terminal 1: Backend API**
```bash
cd backend
npm run dev
# runs on http://localhost:3000
```

**Terminal 2: Processing Worker**
```bash
cd backend
npm run worker
# polls for tasks
```

**Terminal 3: Frontend**
```bash
cd frontend
npm run dev
# runs on http://localhost:5173 (or 5174)
```

## 🧪 Usage

1.  Open the frontend URL.
2.  Click **"Upload Video"** and select a file.
3.  Choose your desired variants (e.g., `MP4 480p`, `WebM 720p`).
4.  Watch the cards appear! The worker will pick them up.
5.  See the **real-time progress bar** and bitrate.
6.  Once completed, click the **Download icon** to get your file.
7.  Use the **Trash icon** to delete tasks/videos or stop a running process.

## 🤝 Contributing

Feel free to fork this repo and submit Pull Requests!

---
*Built for the AlgoHire Hackathon 2025.*
