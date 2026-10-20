import { Loader2 } from 'lucide-react';

// Full-screen blocker shown while a jersey is being rendered, so the page never
// looks idle (or clickable) during the work.
export default function RenderOverlay({ title, message }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
      <div className="bg-card border border-steel rounded-[6px] px-6 py-7 max-w-sm w-full text-center space-y-3">
        <Loader2 size={24} className="animate-spin text-kinetic mx-auto" />
        <div className="font-heading text-fog text-sm uppercase">{title}</div>
        {message && (
          <p className="mono-label text-fog/50 text-[0.65rem] leading-relaxed normal-case tracking-normal">{message}</p>
        )}
      </div>
    </div>
  );
}