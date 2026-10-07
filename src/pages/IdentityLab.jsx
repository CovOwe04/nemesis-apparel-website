import { useEffect, useState, useRef } from 'react';
import { useParams, Link, useNavigate, useSearchParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { FONTS } from '@/lib/fonts';
import JerseyDisplayPreview from '@/components/JerseyDisplayPreview';
import { renderJerseyDisplayToBlob, renderOverlayToBlob } from '@/components/admin/canvasOverlayRenderer';
import { resolveNameStyle, resolveNumberStyle, resolveArtworkNameStyle, resolveArtworkNumberStyle } from '@/lib/jerseyStyle';
import { useCart } from '@/lib/CartContext';
import { formatPrice, getCurrency } from '@/lib/currency';
import { ArrowLeft, Plus, Minus, Check, Loader2 } from 'lucide-react';

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

const ALL_SIZES = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL'];

function getAvailableSizes(jersey) {
  const skus = jersey?.merchize_variants;
  if (!skus || Object.keys(skus).length === 0) return ALL_SIZES;
  return ALL_SIZES.filter((s) => skus[s]);
}

export default function IdentityLab() {
  const { jerseyId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('edit');
  const { addItem, items, editItem } = useCart();

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
  const [rendering, setRendering] = useState(false);
  const [renderError, setRenderError] = useState('');

  useEffect(() => {
    base44.entities.Jersey.get(jerseyId)
      .then((j) => { setJersey(j); })
      .catch(() => setJersey(null))
      .finally(() => setLoading(false));
  }, [jerseyId]);

  const populatedEdit = useRef(false);
  useEffect(() => {
    if (!jersey || !editId || populatedEdit.current) return;
    const cartLine = items.find((i) => i.id === editId);
    if (!cartLine) return;
    populatedEdit.current = true;
    setName(cartLine.customName || '');
    setNumber(cartLine.customNumber || '');
    setFontId(cartLine.fontId || 'block');
    setLetterSpacing(cartLine.letterSpacing || 0);
    setQty(cartLine.quantity || 1);
    setShirtSize(cartLine.shirtSize || 'M');
    const editColors = getColors(jersey);
    editColors.forEach((c, ci) => {
      (c.images || []).forEach((img, ii) => {
        if (img.url === cartLine.front_image) {
          setSelectedColor(ci);
          setSelectedImageIdx(ii);
        }
      });
    });
  }, [jersey, editId, items]);

  useEffect(() => {
    if (!jersey) return;
    const available = getAvailableSizes(jersey);
    if (available.length > 0 && !available.includes(shirtSize)) {
      setShirtSize(available[0]);
    }
    if (jersey.font_id) setFontId(jersey.font_id);
  }, [jersey]);

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
        <p className="font-heading text-2xl uppercase text-fog">Listing not found</p>
        <Link to="/arsenal" className="mono-label text-kinetic">← BACK TO ARSENAL</Link>
      </div>
    );
  }

  const canCustomize = !!jersey.enable_customization;
  const canCustomizeName = canCustomize && jersey.enable_name !== false;
  const canCustomizeNumber = canCustomize && jersey.enable_number !== false;
  const colors = getColors(jersey);
  const combos = getCombos(jersey);
  const availableSizes = getAvailableSizes(jersey);
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

  const handleAdd = async () => {
    setRendering(true);
    setRenderError('');
    let renderedImage = '';
    let renderedArtworkFront = '';
    const renderedName = canCustomizeName && nameOn ? name.toUpperCase() : '';
    const renderedNumber = canCustomizeNumber && numberOn ? number : '';
    if (renderedName || renderedNumber) {
      try {
        const blob = await renderJerseyDisplayToBlob({
          imageUrl: selectedImage,
          jersey,
          color: currentColor,
          customName: renderedName,
          customNumber: renderedNumber,
          fontId,
          letterSpacing,
          enableName: canCustomizeName && nameOn,
          enableNumber: canCustomizeNumber && numberOn,
        });
        if (!blob) throw new Error('Could not encode the rendered preview.');
        const file = new File([blob], 'custom-jersey.png', { type: 'image/png' });
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        if (!file_url) throw new Error('Could not upload the rendered preview.');
        renderedImage = file_url;
      } catch (err) {
        console.error('Preview render failed:', err);
        setRenderError(err?.message || 'Could not prepare the exact preview for fulfillment. Please try again.');
        setRendering(false);
        return;
      }
    }
    const artworkFront = currentColor?.artwork_front || jersey.artwork_front || '';
    if ((renderedName || renderedNumber) && !artworkFront) {
      setRenderError('This listing has no front print artwork to personalize.');
      setRendering(false);
      return;
    }
    if (artworkFront && (renderedName || renderedNumber)) {
      try {
        const image = new window.Image();
        image.crossOrigin = 'anonymous';
        image.src = artworkFront;
        await new Promise((resolve, reject) => {
          image.onload = resolve;
          image.onerror = () => reject(new Error('Could not load this listing\'s print artwork.'));
        });
        const maxDimension = 1200;
        const factor = Math.min(1, maxDimension / Math.max(image.naturalWidth, image.naturalHeight));
        const font = FONTS.find((entry) => entry.id === fontId) || FONTS[0];
        const fontFam = jersey.custom_font_name ? `'${jersey.custom_font_name}', ${font.family}` : font.family;
        const artworkBlob = await renderOverlayToBlob({
          imageUrl: artworkFront,
          imageFit: 'contain',
          customName: renderedName,
          customNumber: renderedNumber,
          nameStyle: resolveArtworkNameStyle(jersey, currentColor),
          numberStyle: resolveArtworkNumberStyle(jersey, currentColor),
          fontFam,
          customFontUrl: jersey.custom_font_url || '',
          customFontName: jersey.custom_font_name || '',
          enableName: canCustomizeName && nameOn,
          enableNumber: canCustomizeNumber && numberOn,
          staticDisplay: jersey.static_display,
          isArtwork: true,
          aspectRatio: image.naturalWidth / image.naturalHeight,
          renderW: Math.round(image.naturalWidth * factor),
          renderH: Math.round(image.naturalHeight * factor),
        });
        if (!artworkBlob) throw new Error('Could not render print artwork.');
        const file = new File([artworkBlob], 'custom-artwork-front.png', { type: 'image/png' });
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        if (!file_url) throw new Error('Could not upload the personalized print artwork.');
        renderedArtworkFront = file_url;
      } catch (err) {
        console.error('Artwork render failed:', err);
        setRenderError(err?.message || 'Could not prepare the listing artwork for fulfillment.');
        setRendering(false);
        return;
      }
    }
    setRendering(false);

    const payload = {
      jerseyId: jersey.id,
      name: jersey.name,
      team: jersey.team,
      price: jersey.price,
      front_image: selectedImage,
      back_image: selectedImage,
      colorName: currentColor?.name || '',
      static_display: jersey.static_display,
      customName: canCustomizeName && nameOn ? name.toUpperCase() : '',
      customNumber: canCustomizeNumber && numberOn ? number : '',
      fontId: canCustomize ? fontId : '',
      nameStyle: canCustomize ? resolveNameStyle(jersey, currentColor) : null,
      numberStyle: canCustomize ? resolveNumberStyle(jersey, currentColor) : null,
      customFontUrl: canCustomize ? (jersey.custom_font_url || '') : '',
      customFontName: canCustomize ? (jersey.custom_font_name || '') : '',
      letterSpacing: canCustomize ? letterSpacing : 0,
      shirtSize,
      quantity: qty,
      rendered_image: renderedName || renderedNumber ? renderedImage : selectedImage,
      rendered_image_version: renderedName || renderedNumber ? 'canvas-v1' : '',
      rendered_artwork_front: renderedArtworkFront,
      artwork_front: currentColor?.artwork_front || jersey.artwork_front || '',
      artwork_back: currentColor?.artwork_back || jersey.artwork_back || '',
      artwork_sleeve: currentColor?.artwork_sleeve || jersey.artwork_sleeve || '',
      artwork_hood: currentColor?.artwork_hood || jersey.artwork_hood || '',
    };
    if (editId && items.some((i) => i.id === editId)) {
      editItem(editId, payload);
    } else {
      addItem(payload);
    }
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
            <JerseyDisplayPreview
              imageUrl={selectedImage}
              jersey={jersey}
              color={currentColor}
              customName={canCustomizeName && nameOn ? name.toUpperCase() : ''}
              customNumber={canCustomizeNumber && numberOn ? number : ''}
              fontId={fontId}
              letterSpacing={letterSpacing}
              enableName={canCustomizeName && nameOn}
              enableNumber={canCustomizeNumber && numberOn}
              showNamePlaceholder={canCustomize && canCustomizeName && nameOn}
              showNumberPlaceholder={canCustomize && canCustomizeNumber && numberOn}
              className={`rounded-[12px] ${jersey.static_display ? 'aspect-square' : 'aspect-[3/4]'}`}
            />
          </div>
          <div className="mt-4 text-center mono-label text-fog/40">
            {canCustomize ? (jersey.static_display ? 'LIVE PREVIEW — LEFT SIDE' : 'LIVE PREVIEW — UPPER BACK') : 'CUSTOMIZATION DISABLED FOR THIS KIT'}
          </div>
        </div>

        {/* CONTROLS */}
        <div className="flex flex-col gap-4">
          <div>
            <div className="mono-label text-fog/40 mb-0">{jersey.team}</div>
            <h1 className="font-display font-bold text-2xl sm:text-3xl uppercase text-fog leading-tight tracking-wide">
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
                Use the lab to personalize this listing. Names are applied
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

          {/* FONT */}
          {canCustomize && !jersey.static_display && !jersey.custom_font_url && (
            <div>
              <div className="mono-label text-fog/50 mb-1.5">FONT</div>
              <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto scrollbar-hide">
                {FONTS.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setFontId(f.id)}
                    className={`px-3 py-1.5 border rounded-[4px] text-xs transition-colors ${
                      fontId === f.id ? 'border-kinetic bg-kinetic/10 text-fog' : 'border-steel text-fog/60 hover:text-fog hover:border-fog/30'
                    }`}
                    style={{ fontFamily: f.family }}
                  >
                    {f.label}
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
              {availableSizes.map((s) => (
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
                      role="switch"
                      aria-checked={nameOn}
                      aria-label="Toggle name customization"
                      className={`flex items-center gap-2 px-4 py-2 border rounded-[6px] transition-colors shrink-0 ${
                        nameOn ? 'bg-kinetic text-void border-kinetic' : 'border-steel text-fog/60 hover:text-fog'
                      }`}
                    >
                      <span className="mono-label text-[0.65rem]">NAME</span>
                      <span aria-hidden="true" className={`relative w-9 h-5 rounded-full border transition-colors ${nameOn ? 'bg-white border-white' : 'bg-slate-700 border-slate-500'}`}>
                        <span className={`absolute top-0.5 left-0.5 w-3.5 h-3.5 rounded-full transition-transform shadow-sm ${nameOn ? 'translate-x-4 bg-kinetic' : 'translate-x-0 bg-white'}`} />
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
                      role="switch"
                      aria-checked={numberOn}
                      aria-label="Toggle number customization"
                      className={`flex items-center gap-2 px-4 py-2 border rounded-[6px] transition-colors shrink-0 ${
                        numberOn ? 'bg-kinetic text-void border-kinetic' : 'border-steel text-fog/60 hover:text-fog'
                      }`}
                    >
                      <span className="mono-label text-[0.65rem]">NUMBER</span>
                      <span aria-hidden="true" className={`relative w-9 h-5 rounded-full border transition-colors ${numberOn ? 'bg-white border-white' : 'bg-slate-700 border-slate-500'}`}>
                        <span className={`absolute top-0.5 left-0.5 w-3.5 h-3.5 rounded-full transition-transform shadow-sm ${numberOn ? 'translate-x-4 bg-kinetic' : 'translate-x-0 bg-white'}`} />
                      </span>
                    </button>
                  </div>
                </div>
              )}

              {/* LETTER SPACING */}
              {canCustomizeName && nameOn && (
                <div>
                  <label className="mono-label text-fog/50 block mb-1.5">LETTER SPACING</label>
                  <div className="grid grid-cols-5 gap-1">
                    {[
                      { label: 'Least', value: -10 },
                      { label: 'Less', value: -5 },
                      { label: 'None', value: 0 },
                      { label: 'More', value: 5 },
                      { label: 'Most', value: 10 },
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
              disabled={added || rendering}
              className="btn-solid flex-1 gap-2 px-6 py-3 font-heading uppercase disabled:opacity-70"
            >
              {rendering ? (
                <>
                  <Loader2 size={18} className="animate-spin" /> Rendering…
                </>
              ) : added ? (
                <>
                  <Check size={18} /> {editId ? 'Updated — heading to cart' : 'Added — heading to cart'}
                </>
              ) : (
                <>{editId ? 'Update cart' : 'Add to cart'} — {formatPrice(jersey.price, getCurrency())}</>
              )}
            </button>
          </div>
          {renderError && <p role="alert" className="mono-label text-kinetic text-sm">{renderError}</p>}
        </div>
      </div>
    </div>
  );
}