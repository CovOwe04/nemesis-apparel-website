import { Link, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { ShoppingBag, Menu, X } from 'lucide-react';
import { useCart } from '@/lib/CartContext';

function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2.5 group" aria-label="Nemesis Apparel home">
      <svg width="26" height="26" viewBox="0 0 28 28" className="shrink-0">
        <path d="M14 1 L27 14 L14 27 L1 14 Z" fill="#FF1F3D" />
        <path d="M14 8 L20 14 L14 20 L8 14 Z" fill="#0A0A0A" />
      </svg>
      <div className="leading-none">
        <div className="font-heading text-lg tracking-tight text-fog">NEMESIS</div>
        <div className="mono-label text-kinetic" style={{ fontSize: '0.55rem' }}>APPAREL</div>
      </div>
    </Link>
  );
}

export default function Header() {
  const { count } = useCart();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  const navItems = [
    { label: 'Home', path: '/' },
    { label: 'Arsenal', path: '/arsenal' },
    { label: 'Design', path: '/design-lab' },
  ];

  const isActive = (path) =>
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);

  return (
    <header
      className={`sticky top-0 z-50 bg-void/95 backdrop-blur-sm transition-shadow ${
        scrolled ? 'shadow-[0_1px_0_0_#2D2D2D]' : 'border-b border-steel/60'
      }`}
    >
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="flex h-16 items-center justify-between">
          <Logo />

          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`px-4 py-2 font-display text-sm font-semibold uppercase tracking-wider transition-colors ${
                  isActive(item.path)
                    ? 'text-kinetic'
                    : 'text-fog/70 hover:text-fog'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <Link
              to="/cart"
              className="relative flex items-center gap-2 border border-steel px-3 py-2 hover:border-kinetic transition-colors"
              aria-label={`Cart, ${count} items`}
            >
              <ShoppingBag size={18} className="text-fog" />
              <span className="hidden sm:inline mono-label text-fog/80">CART</span>
              {count > 0 && (
                <span className="absolute -top-2 -right-2 bg-kinetic text-void font-heading text-[0.65rem] leading-none w-5 h-5 flex items-center justify-center">
                  {count}
                </span>
              )}
            </Link>
            <button
              className="md:hidden p-2 text-fog hover:text-kinetic transition-colors"
              onClick={() => setOpen((o) => !o)}
              aria-label="Toggle menu"
            >
              {open ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

        {/* Velocity line */}
        <div className="velocity-line h-px w-full opacity-60" />
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden border-t border-steel bg-void">
          <nav className="px-5 py-3 flex flex-col">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`py-3 font-display text-sm font-semibold uppercase tracking-wider border-b border-steel/50 ${
                  isActive(item.path) ? 'text-kinetic' : 'text-fog/80'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}