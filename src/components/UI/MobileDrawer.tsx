import { useRef, useEffect, useState } from 'react';
import { X, ChevronUp } from 'lucide-react';

interface MobileDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    children: React.ReactNode;
    title?: string;
}

/**
 * MobileDrawer - Bottom sheet that slides up from bottom
 * Perfect for mobile UX without splitting screen
 */
export const MobileDrawer = ({ isOpen, onClose, children, title }: MobileDrawerProps) => {
    const drawerRef = useRef<HTMLDivElement>(null);
    const [dragY, setDragY] = useState(0);
    const [isDragging, setIsDragging] = useState(false);
    const startY = useRef(0);

    // Handle touch drag to close
    const handleTouchStart = (e: React.TouchEvent) => {
        startY.current = e.touches[0].clientY;
        setIsDragging(true);
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (!isDragging) return;
        const currentY = e.touches[0].clientY;
        const diff = currentY - startY.current;
        if (diff > 0) {
            setDragY(diff);
        }
    };

    const handleTouchEnd = () => {
        setIsDragging(false);
        if (dragY > 100) {
            onClose();
        }
        setDragY(0);
    };

    // Close on escape
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleEscape);
        return () => window.removeEventListener('keydown', handleEscape);
    }, [onClose]);

    if (!isOpen) return null;

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
                onClick={onClose}
            />

            {/* Drawer */}
            <div
                ref={drawerRef}
                className="fixed bottom-0 left-0 right-0 z-50 md:hidden transition-transform duration-300 ease-out"
                style={{
                    transform: `translateY(${dragY}px)`,
                    maxHeight: '85vh'
                }}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
            >
                <div className="bg-cyber-gray rounded-t-3xl border-t border-x border-neon-purple/30 shadow-2xl shadow-black/50 overflow-hidden flex flex-col max-h-[85vh]">
                    {/* Handle */}
                    <div className="flex justify-center pt-3 pb-2">
                        <div className="w-12 h-1.5 bg-white/20 rounded-full" />
                    </div>

                    {/* Header */}
                    <div className="flex items-center justify-between px-4 pb-3 border-b border-white/10">
                        <h3 className="text-lg font-bold text-neon-purple">{title || 'Panel'}</h3>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-white/10 rounded-full transition-colors"
                        >
                            <X size={20} className="text-white/60" />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-auto">
                        {children}
                    </div>
                </div>
            </div>
        </>
    );
};

/**
 * Floating button to open drawer on mobile
 */
interface MobileDrawerButtonProps {
    onClick: () => void;
    label: string;
    count?: number;
}

export const MobileDrawerButton = ({ onClick, label, count }: MobileDrawerButtonProps) => {
    return (
        <button
            onClick={onClick}
            className="fixed bottom-24 right-4 z-30 md:hidden flex items-center gap-2 px-4 py-3 bg-neon-purple text-black font-bold rounded-full shadow-lg shadow-neon-purple/40 active:scale-95 transition-transform"
        >
            <ChevronUp size={18} />
            {label}
            {count !== undefined && count > 0 && (
                <span className="bg-black/20 px-2 py-0.5 rounded-full text-sm">
                    {count}
                </span>
            )}
        </button>
    );
};
