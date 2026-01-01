import { useEffect, useState } from 'react';
import { useProjectStore } from '../../store/useProjectStore';
import { Image as ImageIcon } from 'lucide-react';

/**
 * StoryboardPlayer - Displays images synchronized with audio playback
 * Shows the thumbnail of the current active segment
 */
export const StoryboardPlayer = () => {
    const { segments, currentTime, isPlaying } = useProjectStore();
    const [currentImage, setCurrentImage] = useState<string | null>(null);
    const [currentSegmentIndex, setCurrentSegmentIndex] = useState<number>(-1);

    // Find the current segment based on playback time
    useEffect(() => {
        const activeIndex = segments.findIndex(s =>
            currentTime >= s.start && currentTime < s.end
        );

        if (activeIndex !== currentSegmentIndex) {
            setCurrentSegmentIndex(activeIndex);
            if (activeIndex >= 0 && segments[activeIndex]?.thumbnail) {
                setCurrentImage(segments[activeIndex].thumbnail!);
            } else {
                setCurrentImage(null);
            }
        }
    }, [currentTime, segments, currentSegmentIndex]);

    // Reset when segments change (prevent stale references)
    useEffect(() => {
        if (currentSegmentIndex >= segments.length) {
            setCurrentSegmentIndex(-1);
            setCurrentImage(null);
        }
    }, [segments.length, currentSegmentIndex]);

    // Check if any segment has a thumbnail
    const hasAnyThumbnail = segments.some(s => s.thumbnail);

    // Safe access to current segment
    const currentSegment = currentSegmentIndex >= 0 && currentSegmentIndex < segments.length
        ? segments[currentSegmentIndex]
        : null;

    return (
        <div className="w-full h-full bg-black flex items-center justify-center relative overflow-hidden">
            {currentImage ? (
                <img
                    src={currentImage}
                    alt={`Storyboard frame ${currentSegmentIndex + 1}`}
                    className="w-full h-full object-contain animate-fade-in"
                    key={currentImage}
                />
            ) : (
                <div className="flex flex-col items-center justify-center text-white/30 gap-4">
                    <ImageIcon size={48} strokeWidth={1} />
                    {hasAnyThumbnail ? (
                        <p className="text-sm font-mono">
                            {isPlaying ? 'Sin imagen en este segmento' : 'Presiona play'}
                        </p>
                    ) : (
                        <div className="text-center">
                            <p className="text-sm">STORYBOARD</p>
                            <p className="text-xs text-white/20 mt-1">
                                Sube imágenes a los Kues para verlas aquí
                            </p>
                        </div>
                    )}
                </div>
            )}

            {/* Segment indicator */}
            {currentSegment && (
                <div className="absolute bottom-4 left-4 font-mono text-xs bg-black/70 text-neon-purple px-3 py-1 rounded-full backdrop-blur-sm flex items-center gap-2">
                    <span
                        className="w-2 h-2 rounded-full animate-pulse"
                        style={{ backgroundColor: currentSegment.color || '#8b5cf6' }}
                    />
                    KUE #{currentSegmentIndex + 1}
                </div>
            )}

            {/* Progress within segment */}
            {currentSegment && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/10">
                    <div
                        className="h-full transition-all duration-100"
                        style={{
                            width: `${Math.min(100, Math.max(0,
                                ((currentTime - currentSegment.start) /
                                    (currentSegment.end - currentSegment.start)) * 100
                            ))}%`,
                            backgroundColor: currentSegment.color || '#8b5cf6'
                        }}
                    />
                </div>
            )}
        </div>
    );
};
