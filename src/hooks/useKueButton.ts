import { useRef, useState, useCallback, useEffect } from 'react';
import { useProjectStore } from '../store/useProjectStore';

/**
 * Custom hook for KUE button behavior:
 * - Tap/Click: Cut at current position
 * - Long-press (1.5s): Show close-to-end confirmation
 */
export function useKueButton() {
  const [isLongPressing, setIsLongPressing] = useState(false);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentTime = useProjectStore(state => state.currentTime);
  const isPlaying = useProjectStore(state => state.isPlaying);
  const setIsPlaying = useProjectStore(state => state.setIsPlaying);
  const cutAtPosition = useProjectStore(state => state.cutAtPosition);
  const closeToEnd = useProjectStore(state => state.closeToEnd);
  const getSegmentNumber = useProjectStore(state => state.getSegmentNumber);
  const showToast = useProjectStore(state => state.showToast);

  const handlePress = useCallback(() => {
    setIsLongPressing(false);
    longPressTimerRef.current = setTimeout(() => {
      setIsLongPressing(true);
      if (navigator.vibrate) navigator.vibrate(100);
      setShowCloseConfirm(true);
    }, 1500);
  }, []);

  const handleRelease = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }

    if (isLongPressing) {
      setIsLongPressing(false);
      return;
    }

    // Short tap = cut at current position
    const newSeg = cutAtPosition(currentTime);
    if (newSeg) {
      const segNum = getSegmentNumber(newSeg.id);
      showToast(`Kue #${segNum} creado`);
      if (!isPlaying) setIsPlaying(true);
    }
  }, [isLongPressing, currentTime, cutAtPosition, getSegmentNumber, showToast, isPlaying, setIsPlaying]);

  const handleCancel = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    setIsLongPressing(false);
  }, []);

  const handleCloseConfirm = useCallback((confirmed: boolean) => {
    setShowCloseConfirm(false);
    if (confirmed) {
      const newSeg = closeToEnd();
      if (newSeg) {
        const segNum = getSegmentNumber(newSeg.id);
        showToast(`Kue #${segNum} cerrado hasta el final`);
      } else {
        showToast('Ya está cerrado hasta el final');
      }
    }
  }, [closeToEnd, getSegmentNumber, showToast]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
      }
    };
  }, []);

  return {
    isLongPressing,
    showCloseConfirm,
    handlePress,
    handleRelease,
    handleCancel,
    handleCloseConfirm,
  };
}
