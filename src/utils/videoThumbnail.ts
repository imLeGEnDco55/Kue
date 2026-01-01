/**
 * Video Thumbnail Utilities
 * Captures frames from video for storyboard feature
 */

/**
 * Capture a frame from a video at a specific time
 * Returns a data URL of the captured frame
 */
export async function captureVideoFrame(
    videoUrl: string,
    time: number,
    width: number = 160,
    height: number = 90
): Promise<string> {
    return new Promise((resolve, reject) => {
        const video = document.createElement('video');
        video.crossOrigin = 'anonymous';
        video.muted = true;
        video.preload = 'metadata';

        video.onloadedmetadata = () => {
            video.currentTime = Math.min(time, video.duration - 0.1);
        };

        video.onseeked = () => {
            try {
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    reject(new Error('Could not get canvas context'));
                    return;
                }

                ctx.drawImage(video, 0, 0, width, height);
                const dataUrl = canvas.toDataURL('image/jpeg', 0.7);

                // Cleanup
                video.src = '';
                video.load();

                resolve(dataUrl);
            } catch (err) {
                reject(err);
            }
        };

        video.onerror = () => {
            reject(new Error('Failed to load video'));
        };

        video.src = videoUrl;
    });
}

/**
 * Capture multiple frames at once (for batch processing)
 */
export async function captureMultipleFrames(
    videoUrl: string,
    times: number[],
    width: number = 160,
    height: number = 90
): Promise<Map<number, string>> {
    const results = new Map<number, string>();

    for (const time of times) {
        try {
            const frame = await captureVideoFrame(videoUrl, time, width, height);
            results.set(time, frame);
        } catch (err) {
            console.warn(`Failed to capture frame at ${time}s:`, err);
        }
    }

    return results;
}

/**
 * Check if URL is a video (vs audio)
 */
export function isVideoUrl(url: string): boolean {
    // Check by trying to load as video and checking dimensions
    return new Promise<boolean>((resolve) => {
        const video = document.createElement('video');
        video.muted = true;
        video.preload = 'metadata';

        video.onloadedmetadata = () => {
            const isVideo = video.videoWidth > 0 && video.videoHeight > 0;
            video.src = '';
            resolve(isVideo);
        };

        video.onerror = () => {
            resolve(false);
        };

        video.src = url;
    }) as unknown as boolean; // Type hack, actually returns Promise
}
