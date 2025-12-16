export interface Task {
    id: string;
    status: 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
    progress?: number;
    currentBitrate?: string;
    outputSize?: number;
    variant: string; // "MP4-480p", "WebM-720p", etc.
    outputPath: string | null;
    error: string | null;
    createdAt: string;
}

export interface Video {
    id: string;
    originalName: string;
    size: number;
    path: string;
    createdAt: string;
    tasks: Task[];
}
