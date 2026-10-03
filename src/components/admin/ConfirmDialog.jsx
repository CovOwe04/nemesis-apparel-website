import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog';

export default function ConfirmDialog({
  open,
  title = 'Confirm action',
  description = 'This action cannot be undone.',
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  loading = false,
}) {
  return (
    <AlertDialog open={open} onOpenChange={(v) => { if (!v && !loading) onCancel?.(); }}>
      <AlertDialogContent className="rounded-[6px] border-steel bg-card max-w-md p-6 gap-5">
        <AlertDialogHeader className="space-y-2">
          <AlertDialogTitle className="font-heading uppercase tracking-wide text-fog text-base">
            {title}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-fog/60 text-sm font-body">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="sm:space-x-2">
          <AlertDialogCancel
            disabled={loading}
            className="mono-label border border-steel text-fog/70 hover:text-fog hover:border-fog/50 bg-transparent rounded-[4px] px-5 py-2.5 mt-0"
          >
            {cancelLabel}
          </AlertDialogCancel>
          <AlertDialogAction
            disabled={loading}
            onClick={(e) => { e.preventDefault(); onConfirm?.(); }}
            className="mono-label bg-kinetic text-void hover:bg-fog rounded-[4px] px-5 py-2.5 mt-0"
          >
            {loading ? 'DELETING…' : confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}