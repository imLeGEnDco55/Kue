import { memo } from 'react';

interface CloseConfirmModalProps {
  isOpen: boolean;
  onConfirm: (confirmed: boolean) => void;
}

export const CloseConfirmModal = memo(({ isOpen, onConfirm }: CloseConfirmModalProps) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-cyber-gray border border-neon-purple/30 rounded-xl p-6 max-w-sm mx-4">
        <h3 className="text-white font-bold text-lg mb-2">¿Cerrar hasta el final?</h3>
        <p className="text-white/60 text-sm mb-6">
          Esto creará el último Kue desde la posición actual hasta el final de la pista.
        </p>
        <div className="flex gap-3">
          <button
            onClick={() => onConfirm(false)}
            className="flex-1 px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={() => onConfirm(true)}
            className="flex-1 px-4 py-2 bg-neon-purple text-black font-bold rounded-lg hover:bg-neon-purple/80 transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
});

CloseConfirmModal.displayName = 'CloseConfirmModal';
