import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { PrismaClient } from '@prisma/client';
import path from 'path';
import fs from 'fs';

// Handle BigInt serialization
(BigInt.prototype as any).toJSON = function () {
    return this.toString();
};

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Ensure storage directories exist
const storageBase = path.join(__dirname, '../storage');
const uploadsDir = path.join(storageBase, 'uploads');
const processedDir = path.join(storageBase, 'processed');

if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
if (!fs.existsSync(processedDir)) fs.mkdirSync(processedDir, { recursive: true });

// Multer setup
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadsDir),
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    },
});
const upload = multer({
    storage,
    limits: { fileSize: 200 * 1024 * 1024 } // 200MB limit
});

// API Endpoints

app.get('/', (req, res) => {
    res.send('Video Forge Backend is Running!');
});

// 1. Upload Video
app.post('/upload', upload.single('video'), async (req, res) => {
    try {
        if (!req.file) {
            res.status(400).json({ error: 'No video file provided' });
            return;
        }

        const video = await prisma.video.create({
            data: {
                originalName: req.file.originalname,
                size: BigInt(req.file.size),
                path: req.file.path,
            },
        });

        res.json(video);
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ error: 'Failed to upload video' });
    }
});

// 2. Create Processing Tasks
app.post('/process', async (req, res) => {
    try {
        const { videoId, variants } = req.body; // variants: string[]

        if (!videoId || !Array.isArray(variants)) {
            res.status(400).json({ error: 'Invalid request body' });
            return;
        }

        const tasks = await Promise.all(
            variants.map((variant: string) =>
                prisma.task.create({
                    data: {
                        videoId,
                        variant,
                        status: 'QUEUED',
                    },
                })
            )
        );

        res.json(tasks);
    } catch (error) {
        console.error('Process error:', error);
        res.status(500).json({ error: 'Failed to create tasks' });
    }
});

// 3. List Videos
app.get('/videos', async (req, res) => {
    try {
        const videos = await prisma.video.findMany({
            orderBy: { createdAt: 'desc' },
            include: { tasks: true },
        });
        res.json(videos);
    } catch (error) {
        console.error('List videos error:', error);
        res.status(500).json({ error: 'Failed to list videos' });
    }
});

// 4. Get Video Details
app.get('/videos/:id', async (req, res) => {
    const video = await prisma.video.findUnique({
        where: { id: req.params.id },
        include: { tasks: true },
    });
    if (!video) {
        res.status(404).json({ error: 'Video not found' });
        return;
    }
    res.json(video);
});

// 5. Download Processed File
app.get('/download/:taskId', async (req, res) => {
    const task = await prisma.task.findUnique({ where: { id: req.params.taskId } });

    if (!task || !task.outputPath || !fs.existsSync(task.outputPath)) {
        res.status(404).json({ error: 'File not found or task not completed' });
        return;
    }

    res.download(task.outputPath);
});

// 6. Delete Task
app.delete('/tasks/:taskId', async (req, res) => {
    try {
        const { taskId } = req.params;
        const task = await prisma.task.findUnique({ where: { id: taskId } });

        if (!task) {
            res.status(404).json({ error: 'Task not found' });
            return;
        }

        // Delete file if exists
        if (task.outputPath && fs.existsSync(task.outputPath)) {
            try {
                fs.unlinkSync(task.outputPath);
            } catch (err) {
                console.error('Failed to delete file', err);
            }
        }

        // Delete from DB
        await prisma.task.delete({ where: { id: taskId } });

        res.json({ message: 'Task deleted successfully' });
    } catch (error) {
        console.error('Delete task error:', error);
        res.status(500).json({ error: 'Failed to delete task' });
    }
});

// 7. Clear All Data (Videos & Tasks)
app.delete('/clear', async (req, res) => {
    try {
        // Delete all files in storage
        if (fs.existsSync(processedDir)) {
            fs.rmSync(processedDir, { recursive: true, force: true });
            fs.mkdirSync(processedDir);
        }
        if (fs.existsSync(uploadsDir)) {
            fs.rmSync(uploadsDir, { recursive: true, force: true });
            fs.mkdirSync(uploadsDir);
        }

        // Clear DB
        await prisma.task.deleteMany({});
        await prisma.video.deleteMany({});

        res.json({ message: 'System cleared successfully' });
    } catch (error) {
        console.error('Clear system error:', error);
        res.status(500).json({ error: 'Failed to clear system' });
    }
});

// Start Server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
