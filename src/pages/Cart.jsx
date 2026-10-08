import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import IdentityNameOverlay from '@/components/IdentityNameOverlay';
import StaticNameOverlay from '@/components/StaticNameOverlay';
import { renderJerseyDisplayToBlob } from '@/components/admin/canvasOverlayRenderer';
import { useCart } from '@/lib/CartContext';
import { formatPrice, getCurrency } from '@/lib/currency';
import { Plus, Minus, Trash2, Pencil, ShoppingBag, ArrowRight, Check } from 'lucide-react';
import ConfirmDialog from '@/components/admin/ConfirmDialog';

const FONT_LABELS = {
  block: 'BLOCK',
  condensed: 'CONDENSED',
  athletic: 'ATHLETIC'
};

const VERT_LABELS = { 10: 'HIGH', 25: 'NORMAL', 50: 'LOW' };

const SHIPPING_RATES = {
  USA: 0,
  Canada: 5,
  World: 8
};

const COUNTRIES = [
{ code: 'US', name: 'United States' },
{ code: 'CA', name: 'Canada' },
{ code: 'GB', name: 'United Kingdom' },
{ code: 'AU', name: 'Australia' },
{ code: 'DE', name: 'Germany' },
{ code: 'FR', name: 'France' },
{ code: 'MX', name: 'Mexico' },
{ code: 'ES', name: 'Spain' },
{ code: 'IT', name: 'Italy' },
{ code: 'NL', name: 'Netherlands' },
{ code: 'IE', name: 'Ireland' },
{ code: 'NZ', name: 'New Zealand' },
{ code: 'JP', name: 'Japan' },
{ code: 'OTHER', name: 'Other / International' }];


function getShipRegion(country) {
  const c = (country || '').toUpperCase().trim();
  if (c === 'US' || c === 'USA') return 'USA';
  if (c === 'CA' || c === 'CANADA') return 'Canada';
  return 'World';
}

// Auto-detect country from postal code format so users can't pick a cheaper
// shipping region manually. US = 5-digit zip, CA = A1A 1A1, else World.
function detectCountryCode(postalCode) {
  const pc = (postalCode || '').trim().toUpperCase();
  if (!pc) return 'CA';
  if (/^\d{5}(-\d{4})?$/.test(pc)) return 'US';
  if (/^[ABCEGHJKLMNPRSTVXY]\d[ABCEGHJKLMNPRSTVWXYZ]\s?\d[ABCEGHJKLMNPRSTVWXYZ]\d$/.test(pc)) return 'CA';
  return 'OTHER';
}

export default function Cart() {
  const { items, updateQuantity, removeItem, updateItems, total, clearCart } = useCart();
  const [ordered, setOrdered] = useState(() => {
    if (typeof window !== 'undefined') {
      return new URLSearchParams(window.location.search).get('status') === 'success';
    }
    return false;
  });
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [renderRefreshError, setRenderRefreshError] = useState('');
  const [promoCode, setPromoCode] = useState('');
  const [appliedPromo, setAppliedPromo] = useState(null);
  const [promoApplying, setPromoApplying] = useState(false);
  const [promoError, setPromoError] = useState('');
  const [shippingAddress, setShippingAddress] = useState({
    line1: '', line2: '', city: '', state: '', postalCode: '', country: 'CA'
  });
  const [removeTarget, setRemoveTarget] = useState(null);

  useEffect(() => {
    const detected = detectCountryCode(shippingAddress.postalCode);
    if (detected !== shippingAddress.country) {
      setShippingAddress((a) => ({ ...a, country: detected }));
    }
  }, [shippingAddress.postalCode]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('status') === 'success') {
      clearCart();
      window.history.replaceState({}, '', '/cart');
    }
  }, [clearCart]);

  const stalePersonalizedItems = items.filter((item) =>
    (item.customName || item.customNumber) && item.rendered_image_version !== 'canvas-v1'
  );

  useEffect(() => {
    if (stalePersonalizedItems.length === 0) return;
    let active = true;
    setRenderRefreshError('');

    Promise.all(stalePersonalizedItems.map(async (item) => {
      const blob = await renderJerseyDisplayToBlob({
        imageUrl: item.front_image || item.back_image,
        jersey: {
          static_display: item.static_display,
          name_style: item.nameStyle || {},
          number_style: item.numberStyle || {},
          custom_font_url: item.customFontUrl || '',
          custom_font_name: item.customFontName || '',
        },
        customName: item.customName || '',
        customNumber: item.customNumber || '',
        fontId: item.fontId || item.font || 'block',
        letterSpacing: item.letterSpacing || 0,
      });
      if (!blob) throw new Error(`Could not refresh the preview for ${item.name || 'a customized jersey'}.`);
      const file = new File([blob], 'custom-jersey.png', { type: 'image/png' });
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      if (!file_url) throw new Error(`Could not upload the refreshed preview for ${item.name || 'a customized jersey'}.`);
      return { id: item.id, rendered_image: file_url, rendered_image_version: 'canvas-v1' };
    })).then((updates) => {
      if (active) updateItems(updates);
    }).catch((error) => {
      if (active) setRenderRefreshError(error?.message || 'Could not refresh customized cart previews.');
    });

    return () => { active = false; };
  }, [items, updateItems]);

  const hasStalePersonalizedRender = stalePersonalizedItems.length > 0;

  const currency = getCurrency();
  const jerseyCount = items.reduce((s, i) => s + i.quantity, 0);
  const shippingUsd = SHIPPING_RATES[getShipRegion(shippingAddress.country)] * jerseyCount;

  // Recompute the applied promo discount from the live cart so the summary
  // stays in sync as items/quantities change (no extra API call needed).
  const promoDiscountUsd = (() => {
    if (!appliedPromo) return 0;
    const matching = items.filter((i) => i.jerseyId === appliedPromo.jerseyId);
    const matchingSubtotal = matching.reduce((s, i) => s + i.price * i.quantity, 0);
    if (matching.length === 0) return 0;
    if (appliedPromo.minOrderValue > 0 && matchingSubtotal < appliedPromo.minOrderValue) return 0;
    let d = appliedPromo.discountType === 'percentage'
      ? Math.round(matchingSubtotal * (appliedPromo.discountValue / 100) * 100) / 100
      : Math.min(appliedPromo.discountValue, matchingSubtotal);
    if (appliedPromo.maxDiscountValue > 0 && d > appliedPromo.maxDiscountValue) d = appliedPromo.maxDiscountValue;
    return d;
  })();

  const discountedSubtotalUsd = Math.max(0, total - promoDiscountUsd);
  const hstUsd = shippingAddress.country === 'CA' ? Math.round(discountedSubtotalUsd * 0.13 * 100) / 100 : 0;
  const grandTotalUsd = discountedSubtotalUsd + shippingUsd + hstUsd;

  const applyPromo = async () => {
    setPromoError('');
    if (!promoCode.trim()) {
      setPromoError('Enter a promo code.');
      return;
    }
    setPromoApplying(true);
    try {
      const res = await base44.functions.invoke('save-promo-code', {
        action: 'validate',
        code: promoCode.trim(),
        items: items.map((i) => ({ jerseyId: i.jerseyId, price: i.price, quantity: i.quantity })),
      });
      const data = res.data;
      if (data?.valid) {
        setAppliedPromo({
          code: data.code,
          promoId: data.promoId,
          jerseyId: data.jerseyId,
          description: data.description,
          discountType: data.discountType,
          discountValue: data.discountValue,
          minOrderValue: data.minOrderValue,
          maxDiscountValue: data.maxDiscountValue,
        });
      } else {
        setAppliedPromo(null);
        setPromoError(data?.error || 'Invalid promo code');
      }
    } catch (err) {
      setPromoError(err?.response?.data?.error || err?.data?.error || err?.message || 'Could not validate promo code');
      setAppliedPromo(null);
    } finally {
      setPromoApplying(false);
    }
  };

  const removePromo = () => {
    setAppliedPromo(null);
    setPromoCode('');
    setPromoError('');
  };

  if (ordered) {
    return (
      <div className="bg-void min-h-[70vh] flex flex-col items-center justify-center px-5 text-center">
        <div className="w-14 h-14 border-2 border-kinetic rounded-[6px] flex items-center justify-center mb-6">
          <Check size={28} className="text-kinetic" />
        </div>
        <h1 className="font-heading text-3xl sm:text-4xl uppercase text-fog">Order received</h1>
        <p className="mt-3 text-fog/60 max-w-md">
          Payment confirmed — your listings are locked in. You'll receive a confirmation email
          shortly. Go again — the rally never stops.
        </p>
        <Link
          to="/arsenal"
          className="btn-solid mt-8 gap-2 px-6 py-3 font-heading uppercase">
          
          Back to arsenal <ArrowRight size={16} />
        </Link>
      </div>);

  }

  if (items.length === 0) {
    return (
      <div className="bg-void min-h-[70vh] flex flex-col items-center justify-center px-5 text-center">
        <ShoppingBag size={40} className="text-steel mb-5" />
        <h1 className="font-heading text-3xl uppercase text-fog">Your cart is empty</h1>
        <p className="mt-3 text-fog/60">No listings queued. Visit the arsenal and build your identity.</p>
        <Link
          to="/arsenal"
          className="btn-solid mt-8 gap-2 px-6 py-3 font-heading uppercase">
          
          Enter arsenal <ArrowRight size={16} />
        </Link>
      </div>);

  }

  const checkout = async () => {
    if (!customerName.trim() || !customerEmail.trim() || !customerPhone.trim()) {
      setFormError('Name, email, and phone number are required.');
      return;
    }
    if (!shippingAddress.line1.trim() || !shippingAddress.city.trim() || !shippingAddress.postalCode.trim()) {
      setFormError('Shipping address is required to calculate shipping and fulfill your order.');
      return;
    }
    setFormError('');
    setSubmitting(true);
    const isFramed = window.self !== window.top;
    const checkoutTab = isFramed ? window.open('', '_blank') : null;
    if (isFramed && !checkoutTab) {
      setFormError('Allow popups to continue to checkout.');
      setSubmitting(false);
      return;
    }
    if (checkoutTab) checkoutTab.opener = null;
    try {
      const res = await base44.functions.invoke('create-checkout-session', {
        items,
        customerName: customerName.trim(),
        customerEmail: customerEmail.trim(),
        customerPhone: customerPhone.trim(),
        shippingAddress,
        currency,
        promoCode: appliedPromo ? appliedPromo.code : ''
      });
      if (res.data?.url) {
        if (checkoutTab) {
          checkoutTab.location.replace(res.data.url);
        } else {
          window.location.assign(res.data.url);
        }
      } else {
        checkoutTab?.close();
        setFormError(res.data?.error || 'Could not start checkout. Please try again.');
      }
    } catch (err) {
      checkoutTab?.close();
      setFormError(err?.response?.data?.error || err?.message || 'Checkout failed. Please try again.');
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
            Your listings
          </h1>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-5 sm:px-8 py-8 grid gap-10 lg:grid-cols-12">
        {/* Items */}
        <div className="lg:col-span-8 flex flex-col gap-4">
          {items.map((item) =>
          <div
            key={item.id}
            className="flex gap-4 sm:gap-6 border border-steel rounded-[6px] p-4">
            
              {item.rendered_image ?
            <Link to={`/lab/${item.jerseyId}`} className="shrink-0 self-center">
                  <img
                src={item.rendered_image}
                alt={`${item.name} preview`}
                    className="w-24 sm:w-28 h-auto rounded-[12px]"
              />
                </Link> : item.isCustomDesign ?
            <div className="shrink-0 w-24 h-32 sm:w-28 sm:h-36 bg-steel border border-steel flex items-center justify-center rounded-[12px]">
                  <span className="mono-label text-fog/40 text-center px-1 leading-tight">
                    CUSTOM<br />DESIGN
                  </span>
                </div> : (item.customName || item.customNumber) ?
            (item.static_display ?
            <Link to={`/lab/${item.jerseyId}`} className="shrink-0">
                  <StaticNameOverlay
                image={item.front_image}
                customName={item.customName}
                customNumber={item.customNumber}
                fontId={item.fontId || item.font || 'block'}
                nameStyle={item.nameStyle || {}}
                numberStyle={item.numberStyle || {}}
                customFontUrl={item.customFontUrl || ''}
                customFontName={item.customFontName || ''}
                letterSpacing={item.letterSpacing || 0}
                className="w-24 h-32 sm:w-28 sm:h-36 rounded-[12px] overflow-hidden" />
              
                </Link> :

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
                className="w-24 h-32 sm:w-28 sm:h-36 bg-steel rounded-[12px] overflow-hidden" />
              
                </Link>) :
            <Link to={`/lab/${item.jerseyId}`} className="shrink-0 self-center">
                  <img
                src={item.static_display ? item.front_image : item.back_image}
                alt={item.name}
                    className="w-24 sm:w-28 h-auto rounded-[12px]"
              />
                </Link>
            }

              <div className="flex-1 min-w-0 flex flex-col">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="font-heading text-lg uppercase text-fog truncate">{item.name}</h2>
                    <p className="mono-label text-fog/40 mt-1">{item.team} · SIZE {item.shirtSize || 'M'}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    {!item.isCustomDesign && (
                      <Link
                        to={`/lab/${item.jerseyId}?edit=${item.id}`}
                        className="text-fog/40 hover:text-kinetic transition-colors p-1"
                        aria-label={`Edit ${item.name}`}>
                        <Pencil size={16} />
                      </Link>
                    )}
                    <button
                    onClick={() => setRemoveTarget(item)}
                    className="text-fog/40 hover:text-kinetic transition-colors p-1"
                    aria-label={`Remove ${item.name}`}>

                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>

                {item.isCustomDesign ?
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 mono-label text-fog/50">
                    <span>PATTERN: <span className="text-fog">{item.designSpec?.pattern}</span></span>
                    <span>MATERIAL: <span className="text-fog">{item.designSpec?.material}</span></span>
                    <span>BASE: <span className="text-fog">{item.designSpec?.primary}</span></span>
                    <span>ACCENT: <span className="text-fog">{item.designSpec?.secondary}</span></span>
                    <span>ACCENT 2: <span className="text-fog">{item.designSpec?.tertiary}</span></span>
                    <span>GRAPHICS: <span className="text-fog">{item.designSpec?.placements}</span></span>
                  </div> :
              item.customName ?
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 mono-label text-fog/50">
                    <span>NAME: <span className="text-fog">{item.customName}</span></span>
                    {item.customNumber && <span>NUMBER: <span className="text-fog">{item.customNumber}</span></span>}
                    <span>FONT: <span className="text-fog">{FONT_LABELS[item.fontId || item.font] || item.fontId || item.font || 'BLOCK'}</span></span>
                  </div> :

              <p className="mt-2 mono-label text-fog/40">PLAIN — NO CUSTOMIZATION</p>
              }

                <div className="mt-auto pt-3 flex items-center justify-between">
                  <div className="flex items-center border border-steel rounded-[6px]">
                    <button
                    onClick={() => updateQuantity(item.id, item.quantity - 1)}
                    className="p-2 text-fog hover:text-kinetic transition-colors"
                    aria-label="Decrease quantity">
                    
                      <Minus size={14} />
                    </button>
                    <span className="w-9 text-center font-heading text-fog text-sm">{item.quantity}</span>
                    <button
                    onClick={() => updateQuantity(item.id, item.quantity + 1)}
                    className="p-2 text-fog hover:text-kinetic transition-colors"
                    aria-label="Increase quantity">
                    
                      <Plus size={14} />
                    </button>
                  </div>
                  <div className="font-heading text-fog">{formatPrice(item.price * item.quantity, currency)}</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Summary */}
        <div className="lg:col-span-4">
          <div className="border border-steel rounded-[6px] p-6 lg:sticky lg:top-24">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-heading text-xl uppercase text-fog">Summary</h2>
              <span className="mono-label text-fog/50 border border-steel rounded-[4px] px-2.5 py-1">
                {currency}
              </span>
            </div>
            <div className="flex items-center justify-between text-fog/70 mb-3">
              <span className="mono-label">SUBTOTAL</span>
              <span className="font-heading">{formatPrice(total, currency)}</span>
            </div>

            {promoDiscountUsd > 0 && (
              <div className="flex items-center justify-between text-kinetic mb-3">
                <span className="mono-label">PROMO DISCOUNT</span>
                <span className="font-heading">−{formatPrice(promoDiscountUsd, currency)}</span>
              </div>
            )}

            <div className="flex items-center justify-between text-fog/50 mb-4">
              <span className="mono-label">SHIPPING</span>
              <span className="font-heading">
                {shippingUsd === 0 ?
                <span className="text-kinetic">FREE</span> :

                formatPrice(shippingUsd, currency)
                }
              </span>
            </div>
            {hstUsd > 0 && (
              <div className="flex items-center justify-between text-fog/50 mb-4">
                <span className="mono-label">HST (13%)</span>
                <span className="font-heading">{formatPrice(hstUsd, currency)}</span>
              </div>
            )}
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
                  className="w-full bg-white text-black border border-steel rounded-[6px] px-4 py-3 text-sm placeholder:text-black/40 focus:border-kinetic outline-none" />
                
              </div>
              <div>
                <label className="mono-label text-fog/50 block mb-1.5">EMAIL</label>
                <input
                  type="email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  placeholder="you@email.com"
                  className="w-full bg-white text-black border border-steel rounded-[6px] px-4 py-3 text-sm placeholder:text-black/40 focus:border-kinetic outline-none" />
                
              </div>
              <div>
                <label className="mono-label text-fog/50 block mb-1.5">PHONE</label>
                <input
                  type="tel"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="Phone number for fulfillment"
                  className="w-full bg-white text-black border border-steel rounded-[6px] px-4 py-3 text-sm placeholder:text-black/40 focus:border-kinetic outline-none" />
                
              </div>
            </div>

            {/* Shipping address */}
            <div className="space-y-2 mb-4">
              <div className="mono-label text-fog/50">SHIPPING ADDRESS</div>
              <input type="text" value={shippingAddress.line1} onChange={(e) => setShippingAddress((a) => ({ ...a, line1: e.target.value }))} placeholder="Street address" className="w-full bg-white text-black border border-steel rounded-[6px] px-3 py-2 text-sm placeholder:text-black/40 focus:border-kinetic outline-none" />
              <input type="text" value={shippingAddress.line2} onChange={(e) => setShippingAddress((a) => ({ ...a, line2: e.target.value }))} placeholder="Apt, suite (optional)" className="w-full bg-white text-black border border-steel rounded-[6px] px-3 py-2 text-sm placeholder:text-black/40 focus:border-kinetic outline-none" />
              <div className="grid grid-cols-2 gap-2">
                <input type="text" value={shippingAddress.city} onChange={(e) => setShippingAddress((a) => ({ ...a, city: e.target.value }))} placeholder="City" className="w-full bg-white text-black border border-steel rounded-[6px] px-3 py-2 text-sm placeholder:text-black/40 focus:border-kinetic outline-none" />
                <input type="text" value={shippingAddress.state} onChange={(e) => setShippingAddress((a) => ({ ...a, state: e.target.value }))} placeholder="State / Province" className="w-full bg-white text-black border border-steel rounded-[6px] px-3 py-2 text-sm placeholder:text-black/40 focus:border-kinetic outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input type="text" value={shippingAddress.postalCode} onChange={(e) => setShippingAddress((a) => ({ ...a, postalCode: e.target.value }))} placeholder="Postal code" className="w-full bg-white text-black border border-steel rounded-[6px] px-3 py-2 text-sm placeholder:text-black/40 focus:border-kinetic outline-none" />
                <div className="w-full bg-white/60 text-black/70 border border-steel rounded-[6px] px-3 py-2 text-sm flex items-center">
                  {COUNTRIES.find((c) => c.code === shippingAddress.country)?.name || 'Auto-detected'}
                </div>
              </div>
              
            </div>

            {/* Promo code */}
            <div className="mb-4">
              <label className="mono-label text-fog/50 block mb-1.5">PROMO CODE</label>
              {appliedPromo ? (
                <div className="flex items-center justify-between border border-kinetic/50 bg-kinetic/10 rounded-[6px] px-4 py-2.5">
                  <div className="min-w-0">
                    <div className="font-heading text-fog uppercase text-sm truncate">{appliedPromo.code}</div>
                    {appliedPromo.description && (
                      <div className="mono-label text-fog/50 truncate mt-0.5">{appliedPromo.description}</div>
                    )}
                  </div>
                  <button
                    onClick={removePromo}
                    className="mono-label text-fog/50 hover:text-kinetic transition-colors ml-3 shrink-0"
                    aria-label="Remove promo code">
                    REMOVE
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={promoCode}
                    onChange={(e) => { setPromoCode(e.target.value.toUpperCase()); setPromoError(''); }}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); applyPromo(); } }}
                    placeholder="Enter code"
                    className="flex-1 bg-white text-black border border-steel rounded-[6px] px-4 py-2.5 text-sm uppercase placeholder:text-black/40 focus:border-kinetic outline-none"
                  />
                  <button
                    onClick={applyPromo}
                    disabled={promoApplying || !promoCode.trim()}
                    className="mono-label border border-steel text-fog hover:text-kinetic hover:border-kinetic/50 rounded-[6px] px-4 py-2.5 transition-colors disabled:opacity-50">
                    {promoApplying ? '…' : 'APPLY'}
                  </button>
                </div>
              )}
              {promoError && <p className="mono-label text-kinetic mt-1.5">{promoError}</p>}
            </div>

            {formError && <p className="mono-label text-kinetic mb-3">{formError}</p>}
            {renderRefreshError && <p role="alert" className="mono-label text-kinetic mb-3">{renderRefreshError}</p>}
            

            <button
              onClick={checkout}
              disabled={submitting || hasStalePersonalizedRender}
              className="btn-solid w-full gap-2 px-6 py-4 font-heading uppercase disabled:opacity-60">
              
              {submitting ? 'Starting checkout…' : hasStalePersonalizedRender ? 'Refreshing previews…' : 'Checkout'} <ArrowRight size={18} />
            </button>
            <Link
              to="/arsenal"
              className="mt-3 block text-center mono-label text-fog/50 hover:text-kinetic transition-colors">
              
              ← KEEP BROWSING
            </Link>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={!!removeTarget}
        title="Remove this listing?"
        description={`${removeTarget?.name || 'This item'} will be removed from your cart.`}
        confirmLabel="Remove"
        onConfirm={() => { removeItem(removeTarget.id); setRemoveTarget(null); }}
        onCancel={() => setRemoveTarget(null)}
      />
    </div>);

}