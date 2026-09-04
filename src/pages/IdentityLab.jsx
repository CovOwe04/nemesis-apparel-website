import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import IdentityNameOverlay, { FONTS } from '@/components/IdentityNameOverlay';
import StaticNameOverlay from '@/components/StaticNameOverlay';
import { useCart } from '@/lib/CartContext';
import { ArrowLeft, Plus, Minus, Check } from 'lucide-react';

export default function IdentityLab() {
  const { jerseyId } = useParams();
  const navigate = useNavigate();
  const { addItem } = useCart();

  const [jersey, setJersey] = useState(null);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [number, setNumber] = useState('');
  const [fontId, setFontId] = useState('block');
  const [size, setSize] = useState(40);
  const [curve, setCurve] = useState(0);
  const [height, setHeight] = useState(25);
  const [qty, setQty] = useState(1);
  const [shirtSize, setShirtSize] = useState('M');
  const [added, setAdded] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState(0);

  useEffect(() => {
    base44.entities.Jersey.get(jerseyId)
      .then((j) => {
        setJersey(j);
        if (j && !j.enable_customization) {
          // keep defaults but lock controls
        }
      })
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
  const presets = jersey.images && jersey.images.length > 0
    ? jersey.images
    : [{ url: jersey.front_image, name: '', number: '' }];
  const presetLabel = (img, index) => {
    if (img.name) return img.name;
    if (img.number) return img.number;
    return `PRESET ${index + 1}`;
  };
  const selectedImage = presets[selectedPreset]?.url || jersey.front_image;
  const selectPreset = (index) => {
    setSelectedPreset(index);
    if (canCustomize) {
      setName(presets[index].name || '');
      setNumber(presets[index].number || '');
    }
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
      customName: canCustomize ? name.toUpperCase() : '',
      customNumber: canCustomize ? number : '',
      font: canCustomize ? fontId : '',
      size: canCustomize ? size : 0,
      curve: canCustomize ? curve : 0,
      height: canCustomize ? height : 0,
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
        <div className="mx-auto max-w-7xl px-5 sm:px-8 py-5 flex items-center justify-between">
          <Link to="/arsenal" className="mono-label text-fog/60 hover:text-kinetic inline-flex items-center gap-2 transition-colors">
            <ArrowLeft size={14} /> ARSENAL
          </Link>
          <div className="mono-label text-kinetic">IDENTITY LAB</div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-5 sm:px-8 py-8 grid gap-10 lg:grid-cols-2 lg:gap-14">
        {/* CANVAS */}
        <div className="lg:sticky lg:top-24 lg:self-start">
          <div className="relative mx-auto max-w-md">
            <div className={`relative overflow-hidden rounded-[12px] ${jersey.static_display ? 'aspect-square bg-black' : 'aspect-[3/4] bg-steel'}`}>
              {jersey.static_display ? (
                <StaticNameOverlay
                  image={selectedImage}
                  customName={canCustomize ? name.toUpperCase() : ''}
                  customNumber={canCustomize ? number : ''}
                  showPlaceholder={canCustomize}
                  className="w-full h-full"
                />
              ) : (
                <IdentityNameOverlay
                  back_image={selectedImage}
                  customName={canCustomize ? name.toUpperCase() : ''}
                  customNumber={canCustomize ? number : ''}
                  fontId={fontId}
                  size={size}
                  curve={curve}
                  height={height}
                  showPlaceholder={canCustomize}
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
        <div className="flex flex-col gap-7">
          <div>
            <div className="mono-label text-fog/40 mb-1">{jersey.team}</div>
            <h1 className="font-heading text-3xl sm:text-4xl uppercase text-fog leading-tight">
              {jersey.name}
            </h1>
            {jersey.description && (
              <p className="mt-3 text-fog/60 leading-relaxed">{jersey.description}</p>
            )}
          </div>

          <div className="h-px velocity-line opacity-60" />

          {/* SHIRT SIZE */}
          <div>
            <div className="mono-label text-fog/50 mb-2">SHIRT SIZE</div>
            <div className="grid grid-cols-4 gap-2">
              {['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL'].map((s) => (
                <button
                  key={s}
                  onClick={() => setShirtSize(s)}
                  className={`btn-solid py-3 font-heading text-sm ${
                    shirtSize === s ? 'bg-kinetic text-white' : ''
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {canCustomize && presets.length > 1 && (
            <div>
              <div className="mono-label text-fog/50 mb-2">PRESETS</div>
              <div className="flex flex-wrap gap-2">
                {presets.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => selectPreset(i)}
                    className={`mono-label px-3 py-2 border rounded-[6px] transition-colors ${
                      selectedPreset === i ? 'bg-kinetic text-void border-kinetic' : 'border-steel text-fog/60 hover:text-fog'
                    }`}
                  >
                    {presetLabel(img, i)}
                  </button>
                ))}
              </div>
            </div>
          )}

          {!canCustomize ? (
            <div className="border border-steel rounded-[6px] p-5">
              <p className="mono-label text-kinetic mb-2">LAB LOCKED</p>
              <p className="text-fog/60 text-sm">
                This kit ships as-is without name customization. Add it to your cart plain,
                or pick a 'Lab-enabled' kit from the arsenal to add your name.
              </p>
            </div>
          ) : (
            <>
              {/* NAME */}
              <div>
                <label htmlFor="name-input" className="mono-label text-fog/50 block mb-2">
                  NAME
                </label>
                <input
                  id="name-input"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value.slice(0, 20))}
                  placeholder="ENTER NAME"
                  className="w-full bg-white text-black border border-steel rounded-[6px] px-4 py-3 font-display text-lg uppercase tracking-wider placeholder:text-black/40 focus:border-kinetic outline-none transition-colors"
                />
                <div className="mono-label text-fog/30 mt-1 text-right">
                  {name.length}/20
                </div>
              </div>

              {/* NUMBER */}
              <div>
                <label htmlFor="number-input" className="mono-label text-fog/50 block mb-2">
                  NUMBER
                </label>
                <input
                  id="number-input"
                  type="text"
                  inputMode="numeric"
                  value={number}
                  onChange={(e) => setNumber(e.target.value.replace(/\D/g, '').slice(0, 3))}
                  placeholder="0–999"
                  className="w-full bg-white text-black border border-steel rounded-[6px] px-4 py-3 font-display text-lg tracking-wider placeholder:text-black/40 focus:border-kinetic outline-none transition-colors"
                />
              </div>
            </>
          )}

          {canCustomize && (
            <div className="border border-steel rounded-[6px] p-4 bg-steel/20">
              <p className="mono-label text-kinetic mb-2">IDENTITY LAB ADVISORY</p>
              <p className="text-fog/60 text-sm leading-relaxed">
                Use the lab to print your own name on the back of your jersey. Names are applied
                exactly as entered, please ensure spelling is correct before submitting.
              </p>
            </div>
          )}

          {/* QTY + ADD */}
          <div className="flex items-center gap-4">
            <div className="flex items-center border border-steel rounded-[6px]">
              <button
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                className="p-3 text-fog hover:text-kinetic transition-colors rounded-[6px]"
                aria-label="Decrease quantity"
              >
                <Minus size={16} />
              </button>
              <span className="w-10 text-center font-heading text-fog">{qty}</span>
              <button
                onClick={() => setQty((q) => q + 1)}
                className="p-3 text-fog hover:text-kinetic transition-colors rounded-[6px]"
                aria-label="Increase quantity"
              >
                <Plus size={16} />
              </button>
            </div>
            <button
              onClick={handleAdd}
              disabled={added}
              className="btn-solid flex-1 gap-2 px-6 py-4 font-heading uppercase disabled:opacity-70"
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