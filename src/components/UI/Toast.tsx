import { useProjectStore } from '../../store/useProjectStore';
import { CheckCircle } from 'lucide-react';

export const Toast = () => {
    const toastMessage = useProjectStore((s) => s.toastMessage);

    if (!toastMessage) return null;

    return (
        <div className="fixed bottom-32 left-1/2 -translate-x-1/2 z-50 animate-toast-in">
            <div className="flex items-center gap-2 bg-emerald-500 text-emerald-950 px-4 py-2 rounded-full font-semibold text-sm shadow-lg shadow-emerald-500/30">
                <CheckCircle size={16} />
                {toastMessage}
            </div>
        </div>
    );
};
// 