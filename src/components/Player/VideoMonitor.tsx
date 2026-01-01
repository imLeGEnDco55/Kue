import { useEffect, useRef } from 'react';
import { useProjectStore } from '../../store/useProjectStore';

export const VideoMonitor = () => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const { videoUrl, isPlaying, setIsPlaying, setCurrentTime, currentTime, setDuration } = useProjectStore();

    // Sync play/pause
    useEffect(() => {
        if (!videoRef.current) return;
        if (isPlaying) {
            videoRef.current.play().catch(() => setIsPlaying(false));
        } else {
            videoRef.current.pause();
        }
    }, [isPlaying, setIsPlaying]);

    // Sync seek (only if difference is significant to avoid fighting)
    useEffect(() => {
        if (!videoRef.current) return;
        if (Math.abs(videoRef.current.currentTime - currentTime) > 0.5) {
            videoRef.current.currentTime = currentTime;
        }
    }, [currentTime]);

    const handleTimeUpdate = () => {
        if (videoRef.current) {
            // Throttle or just set. Zustand is fast.
            setCurrentTime(videoRef.current.currentTime);
        }
    };

    const handleLoadedMetadata = () => {
        if (videoRef.current) {
            setDuration(videoRef.current.duration);
        }
    };

    if (!videoUrl) {
        return (
            <div className="w-full aspect-video bg-black flex items-center justify-center border border-neon-purple/30 rounded-lg shadow-[0_0_15px_rgba(139,92,246,0.1)]">
                <p className="text-sm font-bold tracking-widest text-white/40 uppercase">SIN SEÑAL</p>
            </div>
        );
    }

    return (
        <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden border border-neon-purple shadow-[0_0_20px_rgba(139,92,246,0.2)]">
            <video
                ref={videoRef}
                src={videoUrl}
                className="w-full h-full object-contain"
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                onEnded={() => setIsPlaying(false)}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
            />

            {/* Overlay UI (Timecode, etc) could go here */}
            <div className="absolute top-2 right-2 font-mono text-xs text-neon-purple bg-black/50 px-2 py-1 rounded">
                REC
            </div>
        </div>
    );
};
