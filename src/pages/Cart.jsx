import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Image } from '@/components/ui/image';
import { useCart } from '@/lib/CartContext';
import { Plus, Minus, Trash2, ShoppingBag, ArrowRight, Check } from 'lucide-react';

const FONT_LABELS = {
  block: 'BLOCK',
  condensed: 'CONDENSED',
  athletic: 'ATHLETIC',
};

export default function Cart() {
  const { items, updateQuantity, removeItem, total, clearCart } = useCart();
  const [ordered, setOrdered] = useState(false);

  if (ordered) {
    return (
      <div className="bg-void min-h-[70vh] flex flex-col items-center justify-center px-5 text-center">
        <div className="w-14 h-14 border-2 border-kinetic flex items-center justify-center mb-6">
          <Check size={28} className="text-kinetic" />
        </div>
        <h1 className="font-heading text-3xl sm:text-4xl uppercase text-fog">Order received</h1>
        <p className="mt-3 text-fog/60 max-w-md">
          Your kit is locked in. A Nemesis rep will confirm production and shipping details
          shortly. Go again — the rally never stops.
        </p>
        <Link
          to="/arsenal"
          className="mt-8 inline-flex items-center gap-2 bg-kinetic px-6 py-3 font-heading uppercase text-void hover:bg-fog transition-colors"
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
        <p className="mt-3 text-fog/60">No kits queued. Hit the arsenal and build your identity.</p>
        <Link
          to="/arsenal"
          className="mt-8 inline-flex items-center gap-2 bg-kinetic px-6 py-3 font-heading uppercase text-void hover:bg-fog transition-colors"
        >
          Enter arsenal <ArrowRight size={16} />
        </Link>
      </div>
    );
  }

  const checkout = () => {
    clearCart();
    setOrdered(true);
  };

  return (
    <div className="bg-void min-h-screen">
      <div className="border-b border-steel">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 py-10">
          <div className="mono-label text-kinetic mb-3">// THE CART</div>
          <h1 className="font-heading text-4xl sm:text-5xl uppercase text-fog leading-[0.9]">
            Your kits
          </h1>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-5 sm:px-8 py-8 grid gap-10 lg:grid-cols-12">
        {/* Items */}
        <div className="lg:col-span-8 flex flex-col gap-4">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex gap-4 sm:gap-6 border border-steel p-4"
            >
              <Link to={`/lab/${item.jerseyId}`} className="shrink-0">
                <div className="relative w-24 h-32 sm:w-28 sm:h-36 bg-steel overflow-hidden">
                  <Image
                    src={item.back_image}
                    alt={item.name}
                    fittingType="fill"
                    className="w-full h-full"
                  />
                  {item.customName && (
                    <div className="absolute inset-0 flex items-start justify-center pt-3 pointer-events-none">
                      <span
                        className="font-heading text-[0.6rem] text-fog uppercase text-center px-2 leading-tight"
                        style={{
                          transform: item.curve ? `rotate(${(item.curve - 50) / 50 * 3}deg)` : 'none',
                        }}
                      >
                        {item.customName}
                      </span>
                    </div>
                  )}
                </div>
              </Link>

              <div className="flex-1 min-w-0 flex flex-col">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="font-heading text-lg uppercase text-fog truncate">{item.name}</h2>
                    <p className="mono-label text-fog/40 mt-1">{item.team}</p>
                  </div>
                  <button
                    onClick={() => removeItem(item.id)}
                    className="text-fog/40 hover:text-kinetic transition-colors p-1"
                    aria-label={`Remove ${item.name}`}
                  >
                    <Trash2 size={18} />
                  </button>
                </div>

                {item.customName ? (
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 mono-label text-fog/50">
                    <span>NAME: <span className="text-fog">{item.customName}</span></span>
                    <span>FONT: <span className="text-fog">{FONT_LABELS[item.font] || item.font}</span></span>
                    <span>SIZE: <span className="text-fog">{item.size}%</span></span>
                    <span>ARCH: <span className="text-fog">{item.curve}%</span></span>
                  </div>
                ) : (
                  <p className="mt-2 mono-label text-fog/40">PLAIN — NO CUSTOMIZATION</p>
                )}

                <div className="mt-auto pt-3 flex items-center justify-between">
                  <div className="flex items-center border border-steel">
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
                  <div className="font-heading text-fog">${(item.price * item.quantity).toFixed(0)}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Summary */}
        <div className="lg:col-span-4">
          <div className="border border-steel p-6 lg:sticky lg:top-24">
            <h2 className="font-heading text-xl uppercase text-fog mb-5">Summary</h2>
            <div className="flex items-center justify-between text-fog/70 mb-3">
              <span className="mono-label">SUBTOTAL</span>
              <span className="font-heading">${total.toFixed(0)}</span>
            </div>
            <div className="flex items-center justify-between text-fog/50 mb-4">
              <span className="mono-label">SHIPPING</span>
              <span className="mono-label text-kinetic">CALCULATED AT NEXT STEP</span>
            </div>
            <div className="h-px bg-steel mb-4" />
            <div className="flex items-center justify-between mb-6">
              <span className="font-heading text-fog">TOTAL</span>
              <span className="font-heading text-2xl text-kinetic">${total.toFixed(0)}</span>
            </div>
            <button
              onClick={checkout}
              className="w-full inline-flex items-center justify-center gap-2 bg-kinetic px-6 py-4 font-heading uppercase text-void hover:bg-fog transition-colors"
            >
              Place order <ArrowRight size={18} />
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