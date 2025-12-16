import { PrismaClient } from '@prisma/client';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegPath from 'ffmpeg-static';
const ffprobePath = require('ffprobe-static');
import path from 'path';
import fs from 'fs';

// Set ffmpeg path
if (ffmpegPath) {
    ffmpeg.setFfmpegPath(ffmpegPath);
} else {
    console.error('FFmpeg binary not found!');
    process.exit(1);
}

// Set ffprobe path
if (ffprobePath && ffprobePath.path) {
    ffmpeg.setFfprobePath(ffprobePath.path);
} else {
    console.error('FFprobe binary not found!');
    process.exit(1);
}

const prisma = new PrismaClient();
const POLL_INTERVAL = 2000; // 2 seconds

const CONCURRENCY_LIMIT = 3; // Process 3 videos simultaneously
let activeTasks = 0;

// Ensure processed directory exists
const processedDir = path.join(__dirname, '../storage/processed');
if (!fs.existsSync(processedDir)) fs.mkdirSync(processedDir, { recursive: true });

async function processTask(taskId: string) {
    activeTasks++;
    try {
        const task = await prisma.task.findUnique({
            where: { id: taskId },
            include: { video: true },
        });

        if (!task) return;

        console.log(`[Slot ${activeTasks}/${CONCURRENCY_LIMIT}] Starting task ${task.id} (${task.variant}) for video ${task.video.originalName}`);

        // Update status to PROCESSING
        // This update is already done in the workerLoop to prevent re-fetching,
        // but we keep it here for consistency and to ensure startedAt is set correctly
        await prisma.task.update({
            where: { id: taskId },
            data: { status: 'PROCESSING', startedAt: new Date() },
        });

        const outputFilename = `task-${task.id}-${task.variant}.${task.variant.includes('webm') ? 'webm' : 'mp4'
            }`;
        // Parse variant (e.g., "480p_mp4", "720p_webm")
        console.log(`Processing task ${task.id}: ${task.variant}`);

        const [formatKey, resolutionKey] = task.variant.split('-');

        const width = resolutionKey === '1080p' ? 1920 : resolutionKey === '720p' ? 1280 : 854;
        const height = resolutionKey === '1080p' ? 1080 : resolutionKey === '720p' ? 720 : 480;
        const bitrate = resolutionKey === '1080p' ? '5000k' : resolutionKey === '720p' ? '2500k' : '1000k';

        const isWebM = formatKey === 'WebM';
        const isMov = formatKey === 'MOV';

        let outputExt = 'mp4';
        let videoCodec = 'libx264';
        let audioCodec = 'aac';

        if (isWebM) {
            outputExt = 'webm';
            videoCodec = 'libvpx-vp9';
            audioCodec = 'libopus';
        } else if (isMov) {
            outputExt = 'mov';
            videoCodec = 'libx264';
            audioCodec = 'aac';
        }

        const outputPath = path.join(processedDir, `${task.id}.${outputExt}`);

        // Get video metadata to ensure we have duration for progress calculation
        let durationInSeconds = 0;
        await new Promise<void>((resolve) => {
            ffmpeg.ffprobe(task.video.path, (err, metadata) => {
                if (!err && metadata && metadata.format && metadata.format.duration) {
                    durationInSeconds = Number(metadata.format.duration);
                    console.log(`[Task ${taskId}] Duration: ${durationInSeconds}s`);
                }
                resolve();
            });
        });

        // Build FFmpeg command
        await new Promise<void>((resolve, reject) => {
            let lastUpdate = Date.now();

            let command = ffmpeg(task.video.path)
                .size(`${width}x${height}`)
                .videoBitrate(bitrate)
                .videoCodec(videoCodec)
                .audioCodec(audioCodec)
                .output(outputPath)
                // Speed optimizations
                .outputOptions(
                    isWebM
                        ? ['-deadline realtime', '-cpu-used 4'] // Speed up VP9
                        : ['-preset fast']                      // Speed up H.264
                );

            command
                .on('progress', async (p) => {
                    const now = Date.now();

                    // Calculate progress manually if percent is missing or invalid
                    let percent = p.percent;
                    if ((!percent || percent < 0) && durationInSeconds > 0 && p.timemark) {
                        const [hours, minutes, seconds] = p.timemark.split(':').map(Number);
                        const currentSeconds = (hours * 3600) + (minutes * 60) + seconds;
                        percent = (currentSeconds / durationInSeconds) * 100;
                    }

                    // Log raw progress for debugging
                    console.log(`[Task ${taskId}] Progress: ${Math.round(percent || 0)}% | ${p.currentKbps} kbps`);

                    // Throttle updates to DB (max once per second)
                    if (now - lastUpdate > 1000) {
                        lastUpdate = now;
                        try {
                            const progressData: any = {};
                            // Use strict check to allow 0% update
                            if (typeof percent === 'number' && !isNaN(percent)) {
                                progressData.progress = Math.min(Math.ceil(percent), 100);
                            }
                            if (p.currentKbps) {
                                progressData.currentBitrate = `${Math.round(p.currentKbps)} kbps`;
                            }

                            if (Object.keys(progressData).length > 0) {
                                await prisma.task.update({
                                    where: { id: taskId },
                                    data: progressData
                                });
                            }
                        } catch (e) {
                            console.error('Failed to update progress', e);
                        }
                    }
                })
                .on('end', () => {
                    resolve();
                })
                // ... error handling continues
                .on('error', (err) => {
                    console.error(`Task ${task.id} failed:`, err);
                    reject(err);
                })
                .run();
        });

        // Get Output Size
        const stats = fs.statSync(outputPath);

        // Update status to COMPLETED
        await prisma.task.update({
            where: { id: taskId },
            data: {
                status: 'COMPLETED',
                progress: 100, // Explicitly set to 100% on completion
                finishedAt: new Date(),
                outputPath,
                outputSize: stats.size
            },
        });
        console.log(`Task ${task.id} COMPLETED. Size: ${(stats.size / 1024 / 1024).toFixed(2)}MB`);

    } catch (err: any) {
        // Retry Logic
        try {
            const currentTask = await prisma.task.findUnique({ where: { id: taskId } });
            if (currentTask && currentTask.retries < 3) {
                console.log(`Task ${taskId} failed, retrying (${currentTask.retries + 1}/3)...`);
                await prisma.task.update({
                    where: { id: taskId },
                    data: {
                        status: 'QUEUED',
                        retries: { increment: 1 },
                        error: `Retrying... Last error: ${err.message}`,
                        progress: 0,
                        currentBitrate: null
                    }
                });
            } else {
                // Update status to FAILED
                await prisma.task.update({
                    where: { id: taskId },
                    data: {
                        status: 'FAILED',
                        finishedAt: new Date(),
                        error: `[PROCESSING_FAILED] ${err.message || 'Unknown error'}`,
                    },
                });
            }
        } catch (dbErr) {
            console.error('Failed to update error status', dbErr);
        }
    } finally {
        activeTasks--;
    }
}

async function workerLoop() {
    console.log(`Worker started with CONCURRENCY_LIMIT = ${CONCURRENCY_LIMIT}`);
    while (true) {
        try {
            if (activeTasks < CONCURRENCY_LIMIT) {
                // Find oldest QUEUED task
                const task = await prisma.task.findFirst({
                    where: { status: 'QUEUED' },
                    orderBy: { createdAt: 'asc' },
                });

                if (task) {
                    // Mark as processing immediately to prevent re-fetching by other workers/loops
                    // We need to do this sequentially before starting the async process
                    await prisma.task.update({
                        where: { id: task.id },
                        data: { status: 'PROCESSING', startedAt: new Date() }
                    });

                    // Start processing properly without awaiting it (Fire and forget from loop perspective)
                    processTask(task.id);
                } else {
                    // No tasks, wait a bit
                    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL));
                }
            } else {
                // Max concurrency reached, wait a bit
                await new Promise((resolve) => setTimeout(resolve, 1000));
            }
        } catch (error) {
            console.error('Worker loop error:', error);
            await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL));
        }
    }
}

// Handle stuck tasks from previous crashes
async function recoverStaleTasks() {
    try {
        console.log('Checking for stale tasks...');
        const { count } = await prisma.task.updateMany({
            where: { status: 'PROCESSING' },
            data: {
                status: 'QUEUED',
                progress: 0,
                currentBitrate: null,
                error: 'Recovered from worker crash',
                retries: { increment: 1 } // Count the crash as a retry attempt
            }
        });
        if (count > 0) {
            console.log(`Recovered ${count} stale tasks. They have been re-queued.`);
        } else {
            console.log('No stale tasks found. System is clean.');
        }
    } catch (e) {
        console.error('Failed to recover stale tasks:', e);
    }
}

// Start Worker
// Main entry point
(async () => {
    console.log('Worker initializing...');
    await recoverStaleTasks();
    console.log(`Worker started with CONCURRENCY_LIMIT = ${CONCURRENCY_LIMIT}`);
    workerLoop();
})();
