import React, { useEffect, useState } from 'react';
import axios from 'axios';
import type { Video, Task } from '../types';

const VideoList: React.FC<{ refreshTrigger: number }> = ({ refreshTrigger }) => {
    const [videos, setVideos] = useState<Video[]>([]);

    const fetchVideos = async () => {
        try {
            const res = await axios.get('http://localhost:3000/videos');
            if (Array.isArray(res.data)) {
                setVideos(res.data);
            } else {
                setVideos([]);
            }
        } catch (err) {
            console.error('Failed to fetch videos', err);
        }
    };

    useEffect(() => {
        fetchVideos();
        const interval = setInterval(fetchVideos, 3000); // Poll every 3 seconds
        return () => clearInterval(interval);
    }, [refreshTrigger]);

    // Filter out videos with no tasks (effectively hidden)
    const activeVideos = videos.filter((video) => video.tasks.length > 0);

    const handleClearAll = async () => {
        if (!confirm('Are you sure? This will delete ALL videos and tasks perfectly.')) return;
        try {
            await axios.delete('http://localhost:3000/clear');
            fetchVideos();
        } catch (err) {
            alert('Failed to clear system');
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-end">
                <button
                    onClick={handleClearAll}
                    disabled={videos.length === 0}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                    Clear All History
                </button>
            </div>
            {activeVideos.map((video) => (
                <div key={video.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                    <div className="bg-slate-50 px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <div className="text-gray-400">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>
                            </div>
                            <div>
                                <h3 className="font-semibold text-gray-900 text-base">{video.originalName}</h3>
                                <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                                    <span>{(video.size / 1024 / 1024).toFixed(2)} MB</span>
                                    <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                                    <span>{new Date(video.createdAt).toLocaleString()}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="p-6">
                        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Processing Tasks</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {video.tasks.map((task) => <TaskCard key={task.id} task={task} />)}
                        </div>
                    </div>
                </div>
            ))}
            {activeVideos.length === 0 && (
                <div className="text-center py-16 bg-white rounded-lg border border-dashed border-gray-300">
                    <div className="mx-auto w-12 h-12 text-gray-300 mb-3">
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"></path></svg>
                    </div>
                    <p className="text-gray-500 font-medium">No videos found</p>
                    <p className="text-sm text-gray-400 mt-1">Uploaded videos will appear here.</p>
                </div>
            )}
        </div>
    );
};

const TaskCard: React.FC<{ task: Task }> = ({ task }) => {
    const getStatusConfig = (status: string) => {
        switch (status) {
            case 'QUEUED': return {
                bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', label: 'Queued',
                icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            };
            case 'PROCESSING': return {
                bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', label: 'Processing',
                icon: <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
            };
            case 'COMPLETED': return {
                bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', label: 'Completed',
                icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
            };
            case 'FAILED': return {
                bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', label: 'Failed',
                icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
            };
            default: return {
                bg: 'bg-gray-50', border: 'border-gray-200', text: 'text-gray-600', label: status,
                icon: <span className="w-4 h-4 block bg-gray-300 rounded-full"></span>
            };
        }
    };

    const config = getStatusConfig(task.status);
    const [fmt, res] = task.variant.split('-');

    return (
        <div className={`p-4 rounded-md border flex items-center justify-between transition-colors ${config.bg} ${config.border}`}>
            <div className="flex items-center gap-3">
                <div className={`${config.text}`}>
                    {config.icon}
                </div>
                <div>
                    <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-900 text-sm">{fmt}</span>
                        {res && <span className="text-xs text-gray-500 bg-white px-1.5 py-0.5 rounded border border-gray-100">{res}</span>}
                    </div>
                    {task.status === 'PROCESSING' ? (
                        <div className="mt-1.5 w-full min-w-[120px]">
                            <div className="flex justify-between items-center gap-2 text-[10px] text-blue-600 mb-0.5 font-medium uppercase tracking-wider">
                                <span>Processing</span>
                                <span>{task.progress || 0}% &bull; {task.currentBitrate || 'waiting...'}</span>
                            </div>
                            <div className="h-1.5 w-full bg-blue-100 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-blue-500 rounded-full transition-all duration-300 ease-out"
                                    style={{ width: `${task.progress || 0}%` }}
                                ></div>
                            </div>
                        </div>
                    ) : (
                        <span className={`text-xs font-medium uppercase tracking-wide mt-0.5 block ${config.text}`}>
                            {config.label}
                        </span>
                    )}
                </div>
            </div>

            <div className="flex items-center gap-2">
                {task.status === 'COMPLETED' && (
                    <a
                        href={`http://localhost:3000/download/${task.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 bg-white rounded-md shadow-sm border border-gray-200 text-gray-500 hover:text-emerald-600 hover:border-emerald-200 transition-colors"
                        title="Download File"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                    </a>
                )}
                <button
                    onClick={async () => {
                        const action = task.status === 'PROCESSING' ? 'Stop processing & delete' : 'Delete';
                        if (!confirm(`${action} this task?`)) return;
                        try {
                            await axios.delete(`http://localhost:3000/tasks/${task.id}`);
                        } catch (e) {
                            alert('Failed to delete task');
                        }
                    }}
                    className="p-2 bg-white rounded-md shadow-sm border border-gray-200 text-gray-500 hover:text-red-500 hover:border-red-200 transition-colors"
                    title={task.status === 'PROCESSING' ? "Stop Processing" : "Delete Task"}
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                </button>
            </div>
        </div>
    );
};

export default VideoList;
