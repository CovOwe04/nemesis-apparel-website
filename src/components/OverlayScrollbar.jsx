import { useEffect, useRef, useState } from 'react';

export default function OverlayScrollbar() {
  const [m, setM] = useState({ top: 0, height: 0, scrollable: false });
  const [hovered, setHovered] = useState(false);
  const [dragging, setDragging] = useState(false);
  const drag = useRef(null);

  useEffect(() => {
    const update = () => {
      const vh = window.innerHeight;
      const sh = document.documentElement.scrollHeight;
      const height = Math.max(40, (vh * vh) / sh);
      const top = ((window.scrollY) / Math.max(1, sh - vh)) * (vh - height);
      setM({ top, height, scrollable: sh > vh + 1 });
    };
    const enter = () => setHovered(true);
    const leave = () => setHovered(false);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(document.body);
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    document.documentElement.addEventListener('mouseenter', enter);
    document.documentElement.addEventListener('mouseleave', leave);
    document.addEventListener('mousemove', enter, { once: true });
    return () => {
      ro.disconnect();
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
      document.documentElement.removeEventListener('mouseenter', enter);
      document.documentElement.removeEventListener('mouseleave', leave);
    };
  }, []);

  const onPointerDown = (e) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { y: e.clientY, scroll: window.scrollY };
    setDragging(true);
  };
  const onPointerMove = (e) => {
    if (!drag.current) return;
    const vh = window.innerHeight;
    const sh = document.documentElement.scrollHeight;
    const ratio = (sh - vh) / Math.max(1, vh - m.height);
    window.scrollTo(0, drag.current.scroll + (e.clientY - drag.current.y) * ratio);
  };
  const onPointerUp = () => { drag.current = null; setDragging(false); };

  if (!m.scrollable) return null;
  const visible = hovered || dragging;

  return (
    <div className={`fixed top-0 right-0 h-screen w-3 z-[9999] transition-opacity duration-200 ${visible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        className={`absolute right-0.5 w-2 cursor-grab active:cursor-grabbing transition-colors ${dragging ? 'bg-kinetic' : 'bg-muted-foreground/50 hover:bg-kinetic'}`}
        style={{ top: m.top, height: m.height }}
      />
    </div>
  );
}