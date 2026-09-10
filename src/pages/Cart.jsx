import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import IdentityNameOverlay from '@/components/IdentityNameOverlay';
import StaticNameOverlay from '@/components/StaticNameOverlay';
import { useCart } from '@/lib/CartContext';
import { Plus, Minus, Trash2, ShoppingBag, ArrowRight, Check } from 'lucide-react';

const FONT_LABELS = {
  block: 'BLOCK',
  condensed: 'CONDENSED',
  athletic: 'ATHLETIC',
};

const VERT_LABELS = { 10: 'HIGH', 25: 'NORMAL', 50: 'LOW' };

const CAD_RATE = 1.36;

const SHIPPING_RATES = {
  USA: 0,
  Canada: 5,
  World: 8,
};

function formatPrice(priceUsd, currency) {
  const value = currency === 'CAD' ? Math.round(priceUsd * CAD_RATE) : priceUsd;
  return currency === 'CAD' ? `CA$${value}` : `$${value}`;
}

export default function Cart() {
  const { items, updateQuantity, removeItem, total, clearCart } = useCart();
  const [ordered, setOrdered] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [shipRegion, setShipRegion] = useState('USA');
  const [currency, setCurrency] = useState(
    () => (typeof window !== 'undefined' && localStorage.getItem('nemesis-currency')) || 'USD'
  );

  useEffect(() => {
    localStorage.setItem('nemesis-currency', currency);
  }, [currency]);

  const jerseyCount = items.reduce((s, i) => s + i.quantity, 0);
  const shippingUsd = SHIPPING_RATES[shipRegion] * jerseyCount;
  const grandTotalUsd = total + shippingUsd;

  if (ordered) {
    return (
      <div className="bg-void min-h-[70vh] flex flex-col items-center justify-center px-5 text-center">
        <div className="w-14 h-14 border-2 border-kinetic rounded-[6px] flex items-center justify-center mb-6">
          <Check size={28} className="text-kinetic" />
        </div>
        <h1 className="font-heading text-3xl sm:text-4xl uppercase text-fog">Order received</h1>
        <p className="mt-3 text-fog/60 max-w-md">
          Your jersey is locked in. A Nemesis rep will confirm production and shipping details
          shortly. Go again — the rally never stops.
        </p>
        <Link
          to="/arsenal"
          className="btn-solid mt-8 gap-2 px-6 py-3 font-heading uppercase"
        >
          Back to arsenal <ArrowRight size={16} />
        </Link>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="bg-void min-h-[70vh] flex flex-col items-center justify-center px-5 text-center">
        <ShoppingBag size={40} className="text-steel mb-5" />
        <h1 className="font-heading text-3xl uppercase text-fog">Your cart is empty</h1>
        <p className="mt-3 text-fog/60">No jerseys queued. Hit the arsenal and build your identity.</p>
        <Link
          to="/arsenal"
          className="btn-solid mt-8 gap-2 px-6 py-3 font-heading uppercase"
        >
          Enter arsenal <ArrowRight size={16} />
        </Link>
      </div>
    );
  }

  const checkout = async () => {
    if (!customerName.trim() || !customerEmail.trim()) {
      setFormError('Name and email are required to place your order.');
      return;
    }
    setFormError('');
    setSubmitting(true);
    try {
      const hasCustom = items.some((i) => i.customName || i.isCustomDesign);
      await base44.entities.Order.create({
        items_json: JSON.stringify(items),
        customer_name: customerName.trim(),
        customer_email: customerEmail.trim(),
        status: 'pending',
        total: grandTotalUsd,
        item_count: items.reduce((s, i) => s + i.quantity, 0),
        has_custom_names: hasCustom,
      });
      clearCart();
      setOrdered(true);
    } catch (err) {
      alert('Order submission failed: ' + (err?.message || 'unknown error'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-void min-h-screen">
      <div className="border-b border-steel">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 py-10">
          <div className="mono-label text-kinetic mb-3">THE CART</div>
          <h1 className="font-heading text-4xl sm:text-5xl uppercase text-fog leading-[0.9]">
            Your jerseys
          </h1>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-5 sm:px-8 py-8 grid gap-10 lg:grid-cols-12">
        {/* Items */}
        <div className="lg:col-span-8 flex flex-col gap-4">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex gap-4 sm:gap-6 border border-steel rounded-[6px] p-4"
            >
              {item.isCustomDesign ? (
                <div className="shrink-0 w-24 h-32 sm:w-28 sm:h-36 bg-steel border border-steel flex items-center justify-center rounded-[12px]">
                  <span className="mono-label text-fog/40 text-center px-1 leading-tight">
                    CUSTOM<br />DESIGN
                  </span>
                </div>
              ) : item.static_display ? (
                <Link to={`/lab/${item.jerseyId}`} className="shrink-0">
                  <StaticNameOverlay
                    image={item.front_image}
                    customName={item.customName}
                    customNumber={item.customNumber}
                    nameStyle={item.nameStyle || {}}
                    numberStyle={item.numberStyle || {}}
                    customFontUrl={item.customFontUrl || ''}
                    customFontName={item.customFontName || ''}
                    letterSpacing={item.letterSpacing || 0}
                    className="w-24 h-32 sm:w-28 sm:h-36 rounded-[12px] overflow-hidden"
                  />
                </Link>
              ) : (
                <Link to={`/lab/${item.jerseyId}`} className="shrink-0">
                  <IdentityNameOverlay
                    back_image={item.back_image}
                    customName={item.customName}
                    customNumber={item.customNumber}
                    fontId={item.fontId || item.font || 'block'}
                    nameStyle={item.nameStyle || {}}
                    numberStyle={item.numberStyle || {}}
                    customFontUrl={item.customFontUrl || ''}
                    customFontName={item.customFontName || ''}
                    letterSpacing={item.letterSpacing || 0}
                    className="w-24 h-32 sm:w-28 sm:h-36 bg-steel rounded-[12px] overflow-hidden"
                  />
                </Link>
              )}

              <div className="flex-1 min-w-0 flex flex-col">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="font-heading text-lg uppercase text-fog truncate">{item.name}</h2>
                    <p className="mono-label text-fog/40 mt-1">{item.team} · SIZE {item.shirtSize || 'M'}</p>
                  </div>
                  <button
                    onClick={() => removeItem(item.id)}
                    className="text-fog/40 hover:text-kinetic transition-colors p-1"
                    aria-label={`Remove ${item.name}`}
                  >
                    <Trash2 size={18} />
                  </button>
                </div>

                {item.isCustomDesign ? (
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 mono-label text-fog/50">
                    <span>PATTERN: <span className="text-fog">{item.designSpec?.pattern}</span></span>
                    <span>MATERIAL: <span className="text-fog">{item.designSpec?.material}</span></span>
                    <span>BASE: <span className="text-fog">{item.designSpec?.primary}</span></span>
                    <span>ACCENT: <span className="text-fog">{item.designSpec?.secondary}</span></span>
                    <span>ACCENT 2: <span className="text-fog">{item.designSpec?.tertiary}</span></span>
                    <span>GRAPHICS: <span className="text-fog">{item.designSpec?.placements}</span></span>
                  </div>
                ) : item.customName ? (
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 mono-label text-fog/50">
                    <span>NAME: <span className="text-fog">{item.customName}</span></span>
                    {item.customNumber && <span>NUMBER: <span className="text-fog">{item.customNumber}</span></span>}
                    <span>FONT: <span className="text-fog">{FONT_LABELS[item.fontId || item.font] || (item.fontId || item.font || 'BLOCK')}</span></span>
                  </div>
                ) : (
                  <p className="mt-2 mono-label text-fog/40">PLAIN — NO CUSTOMIZATION</p>
                )}

                <div className="mt-auto pt-3 flex items-center justify-between">
                  <div className="flex items-center border border-steel rounded-[6px]">
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      className="p-2 text-fog hover:text-kinetic transition-colors"
                      aria-label="Decrease quantity"
                    >
                      <Minus size={14} />
                    </button>
                    <span className="w-9 text-center font-heading text-fog text-sm">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      className="p-2 text-fog hover:text-kinetic transition-colors"
                      aria-label="Increase quantity"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                  <div className="font-heading text-fog">{formatPrice(item.price * item.quantity, currency)}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Summary */}
        <div className="lg:col-span-4">
          <div className="border border-steel rounded-[6px] p-6 lg:sticky lg:top-24">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-heading text-xl uppercase text-fog">Summary</h2>
              <div className="flex items-center gap-1 bg-steel/40 border border-steel rounded-[6px] p-1">
                <button
                  onClick={() => setCurrency('USD')}
                  className={`mono-label px-2.5 py-1 rounded-[4px] transition-colors ${currency === 'USD' ? 'bg-white text-black' : 'text-fog/60 hover:text-fog'}`}
                >
                  USD
                </button>
                <button
                  onClick={() => setCurrency('CAD')}
                  className={`mono-label px-2.5 py-1 rounded-[4px] transition-colors ${currency === 'CAD' ? 'bg-white text-black' : 'text-fog/60 hover:text-fog'}`}
                >
                  CAD
                </button>
              </div>
            </div>
            <div className="flex items-center justify-between text-fog/70 mb-3">
              <span className="mono-label">SUBTOTAL</span>
              <span className="font-heading">{formatPrice(total, currency)}</span>
            </div>

            {/* Shipping region selector */}
            <div className="mb-3">
              <div className="mono-label text-fog/50 mb-1.5">SHIPPING REGION</div>
              <div className="grid grid-cols-3 gap-1">
                {[
                  { key: 'USA', label: 'USA' },
                  { key: 'Canada', label: 'CANADA' },
                  { key: 'World', label: 'WORLDWIDE' },
                ].map((r) => (
                  <button
                    key={r.key}
                    onClick={() => setShipRegion(r.key)}
                    className={`mono-label px-1 py-1.5 border rounded-[4px] text-[0.6rem] transition-colors ${
                      shipRegion === r.key
                        ? 'bg-kinetic text-void border-kinetic'
                        : 'border-steel text-fog/60 hover:text-fog'
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between text-fog/50 mb-4">
              <span className="mono-label">SHIPPING</span>
              <span className="font-heading">
                {shippingUsd === 0 ? (
                  <span className="text-kinetic">FREE</span>
                ) : (
                  formatPrice(shippingUsd, currency)
                )}
              </span>
            </div>
            <div className="h-px bg-steel mb-4" />
            <div className="flex items-center justify-between mb-6">
              <span className="font-heading text-fog">TOTAL</span>
              <span className="font-heading text-2xl text-kinetic">{formatPrice(grandTotalUsd, currency)}</span>
            </div>

            {/* Customer info for order submission */}
            <div className="space-y-3 mb-4">
              <div>
                <label className="mono-label text-fog/50 block mb-1.5">YOUR NAME</label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="First & last name"
                  className="w-full bg-white text-black border border-steel rounded-[6px] px-4 py-3 text-sm placeholder:text-black/40 focus:border-kinetic outline-none"
                />
              </div>
              <div>
                <label className="mono-label text-fog/50 block mb-1.5">EMAIL</label>
                <input
                  type="email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  placeholder="you@email.com"
                  className="w-full bg-white text-black border border-steel rounded-[6px] px-4 py-3 text-sm placeholder:text-black/40 focus:border-kinetic outline-none"
                />
              </div>
            </div>
            {formError && <p className="mono-label text-kinetic mb-3">{formError}</p>}
            <p className="mono-label text-fog/30 mb-4">Custom name orders are reviewed by our team before production.</p>

            <button
              onClick={checkout}
              disabled={submitting}
              className="btn-solid w-full gap-2 px-6 py-4 font-heading uppercase disabled:opacity-60"
            >
              {submitting ? 'Submitting…' : 'Place order'} <ArrowRight size={18} />
            </button>
            <Link
              to="/arsenal"
              className="mt-3 block text-center mono-label text-fog/50 hover:text-kinetic transition-colors"
            >
              ← KEEP BROWSING
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}