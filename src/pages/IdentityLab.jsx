import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import IdentityNameOverlay, { FONTS } from '@/components/IdentityNameOverlay';
import StaticNameOverlay from '@/components/StaticNameOverlay';
import { useCart } from '@/lib/CartContext';
import { ArrowLeft, Plus, Minus, Check } from 'lucide-react';

function getColors(jersey) {
  if (jersey.colors && jersey.colors.length > 0) return jersey.colors;
  if (jersey.images && jersey.images.length > 0)
    return [{ name: 'Default', hex: '#000000', images: jersey.images.map((img) => ({ url: img.url })) }];
  return [{ name: 'Default', hex: '#000000', images: [{ url: jersey.front_image }] }];
}

function getCombos(jersey) {
  if (jersey.name_number_combos && jersey.name_number_combos.length > 0) return jersey.name_number_combos;
  if (jersey.images) {
    return jersey.images
      .filter((img) => img.name || img.number)
      .map((img) => ({ name: img.name || '', number: img.number || '' }));
  }
  return [];
}

export default function IdentityLab() {
  const { jerseyId } = useParams();
  const navigate = useNavigate();
  const { addItem } = useCart();

  const [jersey, setJersey] = useState(null);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [number, setNumber] = useState('');
  const [fontId, setFontId] = useState('block');
  const [letterSpacing, setLetterSpacing] = useState(0);
  const [qty, setQty] = useState(1);
  const [shirtSize, setShirtSize] = useState('M');
  const [added, setAdded] = useState(false);
  const [selectedColor, setSelectedColor] = useState(0);
  const [selectedImageIdx, setSelectedImageIdx] = useState(0);
  const [nameOn, setNameOn] = useState(true);
  const [numberOn, setNumberOn] = useState(true);

  useEffect(() => {
    base44.entities.Jersey.get(jerseyId)
      .then((j) => { setJersey(j); })
      .catch(() => setJersey(null))
      .finally(() => setLoading(false));
  }, [jerseyId]);

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center bg-void">
        <div className="w-8 h-8 border-2 border-steel border-t-kinetic rounded-full animate-spin" />
      </div>
    );
  }
  if (!jersey) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 bg-void px-5 text-center">
        <p className="font-heading text-2xl uppercase text-fog">Jersey not found</p>
        <Link to="/arsenal" className="mono-label text-kinetic">← BACK TO ARSENAL</Link>
      </div>
    );
  }

  const canCustomize = !!jersey.enable_customization;
  const canCustomizeName = canCustomize && jersey.enable_name !== false;
  const canCustomizeNumber = canCustomize && jersey.enable_number !== false;
  const colors = getColors(jersey);
  const combos = getCombos(jersey);
  const currentColor = colors[Math.min(selectedColor, colors.length - 1)];
  const currentImages = currentColor?.images || [];
  const selectedImage = currentImages[Math.min(selectedImageIdx, currentImages.length - 1)]?.url || jersey.front_image;

  const selectColor = (idx) => {
    setSelectedColor(idx);
    setSelectedImageIdx(0);
  };

  const selectCombo = (combo) => {
    if (canCustomizeName && nameOn) setName(combo.name || '');
    if (canCustomizeNumber && numberOn) setNumber(combo.number || '');
  };

  const handleAdd = () => {
    addItem({
      jerseyId: jersey.id,
      name: jersey.name,
      team: jersey.team,
      price: jersey.price,
      front_image: selectedImage,
      back_image: selectedImage,
      static_display: jersey.static_display,
      customName: canCustomizeName && nameOn ? name.toUpperCase() : '',
      customNumber: canCustomizeNumber && numberOn ? number : '',
      fontId: canCustomize ? fontId : '',
      nameStyle: canCustomize ? (jersey.name_style || null) : null,
      numberStyle: canCustomize ? (jersey.number_style || null) : null,
      customFontUrl: canCustomize ? (jersey.custom_font_url || '') : '',
      customFontName: canCustomize ? (jersey.custom_font_name || '') : '',
      letterSpacing: canCustomize ? letterSpacing : 0,
      shirtSize,
      quantity: qty,
    });
    setAdded(true);
    setTimeout(() => navigate('/cart'), 700);
  };

  return (
    <div className="bg-void min-h-screen">
      {/* Top bar */}
      <div className="border-b border-steel">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 py-3 flex items-center justify-between">
          <Link to="/arsenal" className="mono-label text-fog/60 hover:text-kinetic inline-flex items-center gap-2 transition-colors">
            <ArrowLeft size={14} /> ARSENAL
          </Link>
          <div className="mono-label text-kinetic">IDENTITY LAB</div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-5 sm:px-8 py-4 grid gap-6 lg:grid-cols-2 lg:gap-10">
        {/* CANVAS */}
        <div className="lg:sticky lg:top-24 lg:self-start">
          <div className="relative mx-auto max-w-md">
            <div className={`relative overflow-hidden rounded-[12px] ${jersey.static_display ? 'aspect-square bg-black' : 'aspect-[3/4] bg-steel'}`}>
              {jersey.static_display ? (
                <StaticNameOverlay
                  image={selectedImage}
                  customName={canCustomizeName && nameOn ? name.toUpperCase() : ''}
                  customNumber={canCustomizeNumber && numberOn ? number : ''}
                  nameStyle={jersey.name_style || {}}
                  numberStyle={jersey.number_style || {}}
                  customFontUrl={jersey.custom_font_url || ''}
                  customFontName={jersey.custom_font_name || ''}
                  letterSpacing={letterSpacing}
                  showNamePlaceholder={canCustomize && canCustomizeName && nameOn}
                  showNumberPlaceholder={canCustomize && canCustomizeNumber && numberOn}
                  className="w-full h-full"
                />
              ) : (
                <IdentityNameOverlay
                  back_image={selectedImage}
                  customName={canCustomizeName && nameOn ? name.toUpperCase() : ''}
                  customNumber={canCustomizeNumber && numberOn ? number : ''}
                  fontId={fontId}
                  nameStyle={jersey.name_style || {}}
                  numberStyle={jersey.number_style || {}}
                  customFontUrl={jersey.custom_font_url || ''}
                  customFontName={jersey.custom_font_name || ''}
                  letterSpacing={letterSpacing}
                  showNamePlaceholder={canCustomize && canCustomizeName && nameOn}
                  showNumberPlaceholder={canCustomize && canCustomizeNumber && numberOn}
                  className="w-full h-full"
                />
              )}
            </div>
          </div>
          <div className="mt-4 text-center mono-label text-fog/40">
            {canCustomize ? (jersey.static_display ? 'LIVE PREVIEW — LEFT SIDE' : 'LIVE PREVIEW — UPPER BACK') : 'CUSTOMIZATION DISABLED FOR THIS KIT'}
          </div>
        </div>

        {/* CONTROLS */}
        <div className="flex flex-col gap-4">
          <div>
            <div className="mono-label text-fog/40 mb-0">{jersey.team}</div>
            <h1 className="font-heading text-2xl sm:text-3xl uppercase text-fog leading-tight">
              {jersey.name}
            </h1>
            {jersey.description && (
              <p className="mt-1 text-fog/60 leading-snug text-sm">{jersey.description}</p>
            )}
          </div>

          <div className="h-px velocity-line opacity-60" />

          {canCustomize && (
            <div className="border border-steel rounded-[6px] p-3 bg-steel/20">
              <p className="mono-label text-kinetic mb-1">IDENTITY LAB ADVISORY</p>
              <p className="text-fog/60 text-xs leading-snug">
                Use the lab to print your own name on the back of your jersey. Names are applied
                exactly as entered, please ensure spelling is correct before submitting.
              </p>
            </div>
          )}

          {/* COLOR SELECTION */}
          {colors.length > 1 && (
            <div>
              <div className="mono-label text-fog/50 mb-1.5">COLOR</div>
              <div className="flex flex-wrap gap-2">
                {colors.map((c, i) => (
                  <button
                    key={i}
                    onClick={() => selectColor(i)}
                    className={`flex items-center gap-2 px-3 py-1.5 border rounded-[6px] transition-colors ${
                      selectedColor === i ? 'border-kinetic bg-kinetic/10' : 'border-steel hover:border-fog/30'
                    }`}
                  >
                    <span className="w-4 h-4 rounded-full border border-steel" style={{ backgroundColor: c.hex || '#000' }} />
                    <span className={`mono-label text-[0.65rem] ${selectedColor === i ? 'text-kinetic' : 'text-fog/60'}`}>
                      {c.name || 'DEFAULT'}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* PRESETS */}
          {canCustomize && combos.length > 0 && (
            <div>
              <div className="mono-label text-fog/50 mb-1.5">PRESETS</div>
              <div className="flex flex-wrap gap-2">
                {combos.map((combo, i) => (
                  <button
                    key={i}
                    onClick={() => selectCombo(combo)}
                    className="mono-label px-3 py-1.5 border rounded-[6px] text-[0.65rem] border-steel text-fog/60 hover:text-fog hover:border-kinetic transition-colors"
                  >
                    {combo.name || combo.number || `COMBO ${i + 1}`}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* IMAGE THUMBNAILS (if multiple images in current color) */}
          {currentImages.length > 1 && (
            <div>
              <div className="mono-label text-fog/50 mb-1.5">VIEW</div>
              <div className="flex flex-wrap gap-2">
                {currentImages.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedImageIdx(i)}
                    className={`w-16 h-20 overflow-hidden rounded-[4px] border-2 transition-colors ${
                      selectedImageIdx === i ? 'border-kinetic' : 'border-steel hover:border-fog/30'
                    }`}
                  >
                    <img src={img.url} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* SHIRT SIZE */}
          <div>
            <div className="mono-label text-fog/50 mb-1.5">SHIRT SIZE</div>
            <div className="grid grid-cols-4 gap-2">
              {['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL'].map((s) => (
                <button
                  key={s}
                  onClick={() => setShirtSize(s)}
                  className={`btn-solid py-2 font-heading text-sm ${
                    shirtSize === s ? 'bg-kinetic text-white' : ''
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {!canCustomize ? (
            <div className="border border-steel rounded-[6px] p-3">
              <p className="mono-label text-kinetic mb-1">LAB LOCKED</p>
              <p className="text-fog/60 text-sm">
                This kit ships as-is without name customization. Add it to your cart plain,
                or pick a 'Lab-enabled' kit from the arsenal to add your name.
              </p>
            </div>
          ) : (
            <>
              {/* NAME */}
              {canCustomizeName && (
                <div>
                  <label htmlFor="name-input" className="mono-label text-fog/50 block mb-1.5">
                    NAME
                  </label>
                  <div className="flex items-center gap-3">
                    <div className="relative flex-1">
                      <input
                        id="name-input"
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value.slice(0, 20))}
                        placeholder="ENTER NAME"
                        disabled={!nameOn}
                        className={`w-full bg-white text-black border border-steel rounded-[6px] px-4 py-2 pr-12 font-display text-base uppercase tracking-wider placeholder:text-black/40 focus:border-kinetic outline-none transition-all ${!nameOn ? 'opacity-40' : ''}`}
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 mono-label text-black/40 text-[0.6rem] pointer-events-none">
                        {name.length}/20
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setNameOn((v) => !v)}
                      className={`flex items-center gap-2 px-4 py-2 border rounded-[6px] transition-colors shrink-0 ${
                        nameOn ? 'bg-kinetic text-void border-kinetic' : 'border-steel text-fog/60 hover:text-fog'
                      }`}
                    >
                      <span className="mono-label text-[0.65rem]">NAME</span>
                      <span className={`relative w-9 h-5 rounded-[4px] transition-colors ${nameOn ? 'bg-void' : 'bg-steel'}`}>
                        <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-[3px] transition-transform ${nameOn ? 'translate-x-4 bg-kinetic' : 'translate-x-0 bg-fog/60'}`} />
                      </span>
                    </button>
                  </div>
                </div>
              )}

              {/* NUMBER */}
              {canCustomizeNumber && (
                <div>
                  <label htmlFor="number-input" className="mono-label text-fog/50 block mb-1.5">
                    NUMBER
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      id="number-input"
                      type="text"
                      inputMode="numeric"
                      value={number}
                      onChange={(e) => setNumber(e.target.value.replace(/\D/g, '').slice(0, 3))}
                      placeholder="0–999"
                      disabled={!numberOn}
                      className={`flex-1 bg-white text-black border border-steel rounded-[6px] px-4 py-2 font-display text-base tracking-wider placeholder:text-black/40 focus:border-kinetic outline-none transition-all ${!numberOn ? 'opacity-40' : ''}`}
                    />
                    <button
                      type="button"
                      onClick={() => setNumberOn((v) => !v)}
                      className={`flex items-center gap-2 px-4 py-2 border rounded-[6px] transition-colors shrink-0 ${
                        numberOn ? 'bg-kinetic text-void border-kinetic' : 'border-steel text-fog/60 hover:text-fog'
                      }`}
                    >
                      <span className="mono-label text-[0.65rem]">NUMBER</span>
                      <span className={`relative w-9 h-5 rounded-[4px] transition-colors ${numberOn ? 'bg-void' : 'bg-steel'}`}>
                        <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-[3px] transition-transform ${numberOn ? 'translate-x-4 bg-kinetic' : 'translate-x-0 bg-fog/60'}`} />
                      </span>
                    </button>
                  </div>
                </div>
              )}

              {/* LETTER SPACING */}
              {((canCustomizeName && nameOn) || (canCustomizeNumber && numberOn)) && (
                <div>
                  <label className="mono-label text-fog/50 block mb-1.5">LETTER SPACING</label>
                  <div className="grid grid-cols-5 gap-1">
                    {[
                      { label: 'Least', value: -50 },
                      { label: 'Less', value: -25 },
                      { label: 'None', value: 0 },
                      { label: 'More', value: 25 },
                      { label: 'Most', value: 50 },
                    ].map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setLetterSpacing(opt.value)}
                        className={`mono-label px-2 py-1.5 border rounded-[4px] text-[0.65rem] transition-colors ${
                          letterSpacing === opt.value
                            ? 'bg-kinetic text-void border-kinetic'
                            : 'border-steel text-fog/60 hover:text-fog'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* QTY + ADD */}
          <div className="flex items-center gap-4">
            <div className="flex items-center border border-steel rounded-[6px]">
              <button
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                className="p-2 text-fog hover:text-kinetic transition-colors rounded-[6px]"
                aria-label="Decrease quantity"
              >
                <Minus size={16} />
              </button>
              <span className="w-8 text-center font-heading text-fog">{qty}</span>
              <button
                onClick={() => setQty((q) => q + 1)}
                className="p-2 text-fog hover:text-kinetic transition-colors rounded-[6px]"
                aria-label="Increase quantity"
              >
                <Plus size={16} />
              </button>
            </div>
            <button
              onClick={handleAdd}
              disabled={added}
              className="btn-solid flex-1 gap-2 px-6 py-3 font-heading uppercase disabled:opacity-70"
            >
              {added ? (
                <>
                  <Check size={18} /> Added — heading to cart
                </>
              ) : (
                <>Add to cart — ${jersey.price}</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}