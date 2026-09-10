import { Link, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { ShoppingBag, Menu, X } from 'lucide-react';
import { useCart } from '@/lib/CartContext';

function Logo() {
  return (
    <Link to="/" className="group" aria-label="Nemesis Apparel home">
      <img
        src="https://media.base44.com/images/public/6a95dbf0d98672e2f49452f4/4872430e2_Asset43x.png"
        alt="Nemesis Apparel"
        className="h-9 w-auto"
      />
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
    // { label: 'Design', path: '/design-lab' }, // hidden — route still active
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
              className="btn-solid relative gap-2 px-3 py-2"
              aria-label={`Cart, ${count} items`}
            >
              <ShoppingBag size={18} />
              <span className="hidden sm:inline mono-label">CART</span>
              {count > 0 && (
                <span className="absolute -top-2 -right-2 bg-kinetic text-void font-heading text-[0.65rem] leading-none w-5 h-5 flex items-center justify-center rounded-[6px]">
                  {count}
                </span>
              )}
            </Link>
            <button
              className="md:hidden p-2 text-fog hover:text-kinetic transition-colors rounded-[6px]"
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