import React, { useState } from 'react';
import axios from 'axios';

const RESOLUTIONS = ['480p', '720p', '1080p'];
const FORMATS = ['MP4', 'WebM', 'MOV'];

const UploadVideo: React.FC<{ onUploadSuccess: () => void }> = ({ onUploadSuccess }) => {
    const [file, setFile] = useState<File | null>(null);
    const [selectedResolutions, setSelectedResolutions] = useState<string[]>([]);
    const [selectedFormats, setSelectedFormats] = useState<string[]>([]);
    const [uploading, setUploading] = useState(false);

    const toggleResolution = (res: string) => {
        setSelectedResolutions(prev =>
            prev.includes(res) ? prev.filter(r => r !== res) : [...prev, res]
        );
    };

    const toggleFormat = (fmt: string) => {
        setSelectedFormats(prev =>
            prev.includes(fmt) ? prev.filter(f => f !== fmt) : [...prev, fmt]
        );
    };

    const handleUpload = async () => {
        if (!file || selectedResolutions.length === 0 || selectedFormats.length === 0) return;

        setUploading(true);
        try {
            // Generate variants
            const variants: string[] = [];
            selectedFormats.forEach(fmt => {
                selectedResolutions.forEach(res => {
                    variants.push(`${fmt}-${res}`);
                });
            });

            // 1. Upload Video
            const formData = new FormData();
            formData.append('video', file);
            const res = await axios.post('http://localhost:3000/upload', formData);
            const videoId = res.data.id;

            // 2. Create Tasks
            await axios.post('http://localhost:3000/process', {
                videoId,
                variants
            });

            setFile(null);
            setSelectedResolutions([]);
            setSelectedFormats([]);
            onUploadSuccess();
        } catch (err) {
            console.error(err);
            alert('Upload failed');
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="bg-slate-50 p-6 border-b border-gray-100">
                <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                    <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path></svg>
                    Upload New Video
                </h2>
                <p className="text-gray-500 mt-1 text-sm">Select your file and desired output formats.</p>
            </div>

            <div className="p-8 space-y-8">
                {/* File Drop Area */}
                <div className="relative border-2 border-dashed border-gray-300 rounded-lg p-10 text-center hover:border-emerald-500 transition-colors bg-gray-50 group">
                    <input
                        type="file"
                        accept="video/mp4,video/x-m4v,video/*"
                        onChange={(e) => setFile(e.target.files?.[0] || null)}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <div className="space-y-3">
                        <div className="mx-auto w-12 h-12 text-gray-400 group-hover:text-emerald-600 transition-colors">
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                        </div>
                        <div>
                            <p className="text-base font-medium text-gray-700">
                                {file ? file.name : "Drag and drop video here"}
                            </p>
                            <p className="text-sm text-gray-500 mt-1">
                                {file ? `${(file.size / 1024 / 1024).toFixed(2)} MB` : "or click to browse (max 200MB)"}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="grid md:grid-cols-2 gap-8">
                    {/* Resolutions */}
                    <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Target Resolutions</label>
                        <div className="flex flex-wrap gap-2">
                            {RESOLUTIONS.map(res => (
                                <button
                                    key={res}
                                    onClick={() => toggleResolution(res)}
                                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors border ${selectedResolutions.includes(res)
                                            ? 'bg-emerald-600 text-white border-emerald-600'
                                            : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                                        }`}
                                >
                                    {res}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Formats */}
                    <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Output Containers</label>
                        <div className="flex flex-wrap gap-2">
                            {FORMATS.map(fmt => (
                                <button
                                    key={fmt}
                                    onClick={() => toggleFormat(fmt)}
                                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors border ${selectedFormats.includes(fmt)
                                            ? 'bg-emerald-600 text-white border-emerald-600'
                                            : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                                        }`}
                                >
                                    {fmt}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <button
                    onClick={handleUpload}
                    disabled={!file || selectedResolutions.length === 0 || selectedFormats.length === 0 || uploading}
                    className="w-full py-3 bg-emerald-600 text-white rounded-md font-medium shadow-sm hover:bg-emerald-700 focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {uploading ? 'Processing Request...' : 'Start Processing'}
                </button>
            </div>
        </div>
    );
};

export default UploadVideo;
