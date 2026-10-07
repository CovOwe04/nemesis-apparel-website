// Reusable modal matching the Merchize generate pop-up aesthetic.
// Supports two modes:
//   confirm (default) — two buttons: confirm + cancel
//   alertMode         — single OK button (for informational/error alerts)
import { Check } from 'lucide-react';

export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  loading = false,
  error = '',
  alertMode = false,
  success = false,
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-steel rounded-[6px] p-6 max-w-sm space-y-4">
        {success && (
          <div className="w-10 h-10 border-2 border-kinetic rounded-[6px] flex items-center justify-center">
            <Check size={20} className="text-kinetic" />
          </div>
        )}
        {title && <div className="font-heading text-fog text-sm uppercase">{title}</div>}
        {description && (
          <p className="mono-label text-fog/50 text-[0.65rem] leading-relaxed normal-case tracking-normal">
            {description}
          </p>
        )}
        {error && <p className="mono-label text-kinetic text-[0.65rem]">{error}</p>}
        <div className="flex gap-2 pt-2">
          {alertMode ? (
            <button type="button" onClick={onConfirm || onCancel} disabled={loading}
              className="inline-flex items-center gap-1.5 bg-kinetic px-4 py-2 font-heading uppercase text-void text-xs hover:bg-fog transition-colors rounded-[4px] disabled:opacity-60">
              {loading ? 'Processing…' : 'OK'}
            </button>
          ) : (
            <>
              <button type="button" onClick={onConfirm} disabled={loading}
                className="inline-flex items-center gap-1.5 bg-kinetic px-4 py-2 font-heading uppercase text-void text-xs hover:bg-fog transition-colors rounded-[4px] disabled:opacity-60">
                {loading ? 'Processing…' : confirmLabel}
              </button>
              <button type="button" onClick={onCancel} disabled={loading}
                className="mono-label text-fog/50 hover:text-fog transition-colors px-4 py-2 border border-steel rounded-[4px] text-xs">
                {cancelLabel}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}