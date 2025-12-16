import { PrismaClient } from '@prisma/client';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegPath from 'ffmpeg-static';
import path from 'path';
import fs from 'fs';

// Set ffmpeg path
if (ffmpegPath) {
    ffmpeg.setFfmpegPath(ffmpegPath);
} else {
    console.error('FFmpeg binary not found!');
    process.exit(1);
}

const prisma = new PrismaClient();
const POLL_INTERVAL = 2000; // 2 seconds

// Ensure processed directory exists
const processedDir = path.join(__dirname, '../storage/processed');
if (!fs.existsSync(processedDir)) fs.mkdirSync(processedDir, { recursive: true });

async function processTask(taskId: string) {
    const task = await prisma.task.findUnique({
        where: { id: taskId },
        include: { video: true },
    });

    if (!task) return;

    console.log(`Starting task ${task.id} (${task.variant}) for video ${task.video.originalName}`);

    // Update status to PROCESSING
    await prisma.task.update({
        where: { id: taskId },
        data: { status: 'PROCESSING', startedAt: new Date() },
    });

    try {
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
                    // Log raw progress for debugging
                    console.log(`[Task ${taskId}] Progress: ${p.percent}% | ${p.currentKbps} kbps`);

                    // Throttle updates to DB (max once per second)
                    if (now - lastUpdate > 1000) {
                        lastUpdate = now;
                        try {
                            const progressData: any = {};
                            if (p.percent && !isNaN(p.percent)) {
                                progressData.progress = Math.ceil(p.percent);
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

        // Update status to COMPLETED
        await prisma.task.update({
            where: { id: taskId },
            data: {
                status: 'COMPLETED',
                finishedAt: new Date(),
                outputPath,
            },
        });

    } catch (err: any) {
        // Retry Logic
        if (task.retries < 3) {
            console.log(`Task ${task.id} failed, retrying (${task.retries + 1}/3)...`);
            await prisma.task.update({
                where: { id: taskId },
                data: {
                    status: 'QUEUED',
                    retries: { increment: 1 },
                    error: `Retrying... Last error: ${err.message}`,
                    progress: 0, // Reset progress
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
                    error: err.message || 'Unknown error',
                },
            });
        }
    }
}

async function workerLoop() {
    while (true) {
        try {
            // Find oldest QUEUED task
            const task = await prisma.task.findFirst({
                where: { status: 'QUEUED' },
                orderBy: { createdAt: 'asc' },
            });

            if (task) {
                await processTask(task.id);
            } else {
                // Wait before next poll
                await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL));
            }
        } catch (error) {
            console.error('Worker loop error:', error);
            await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL));
        }
    }
}

// Start Worker
console.log('Worker started, waiting for tasks...');
workerLoop();
