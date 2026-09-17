import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Loader2, Zap, AlertTriangle, ChevronDown, ChevronRight } from 'lucide-react';
import { renderOverlayToBlob } from '@/components/admin/canvasOverlayRenderer';
import { FONTS } from '@/lib/fonts';

const SIZE_ORDER = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL'];

function sortSizes(entries) {
  return [...entries].sort(([a], [b]) => {
    const ai = SIZE_ORDER.indexOf(a);
    const bi = SIZE_ORDER.indexOf(b);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });
}

function generateVariants(colors, combos) {
  const variants = [];
  const colorList = colors.length > 0 ? colors : [{ name: 'Default' }];
  for (const color of colorList) {
    variants.push({ color_name: color.name || 'Default', combo_name: '', combo_number: '' });
  }
  for (const color of colorList) {
    for (const combo of combos) {
      if (!combo.name && !combo.number) continue;
      variants.push({
        color_name: color.name || 'Default',
        combo_name: combo.name || '',
        combo_number: combo.number || '',
      });
    }
  }
  return variants;
}

export default function VariantMerchizeIdsEditor({ colors, combos, variantMerchizeIds, onChange, jerseyId, onPrimaryGenerated, merchizeProductId, merchizeVariants, colorArtwork, nameStyle, numberStyle, customFontUrl, customFontName, fontId, enableName, enableNumber, artworkPosition }) {
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  const [renderProgress, setRenderProgress] = useState('');
  const [expanded, setExpanded] = useState(null);

  const allVariants = generateVariants(colors, combos);

  const syncedIds = allVariants.map((v) => {
    const existing = (variantMerchizeIds || []).find(
      (vmi) => vmi.color_name === v.color_name && vmi.combo_name === v.combo_name && vmi.combo_number === v.combo_number
    );
    return {
      color_name: v.color_name,
      combo_name: v.combo_name,
      combo_number: v.combo_number,
      merchize_product_id: existing?.merchize_product_id || '',
      title: existing?.title || '',
      manually_set: existing?.manually_set || false,
      variant_ids: existing?.variant_ids || {},
      skus: existing?.skus || {},
    };
  });

  const updateTitle = (index, value) => {
    const updated = syncedIds.map((v, i) =>
      i === index ? { ...v, title: value } : v
    );
    onChange(updated);
  };

  const updateSku = (index, size, value) => {
    const updated = syncedIds.map((v, i) =>
      i === index ? { ...v, skus: { ...v.skus, [size]: value } } : v
    );
    onChange(updated);
  };

  const generate = async () => {
    setShowConfirm(false);
    if (!jerseyId) {
      setError('Save the jersey first, then generate.');
      return;
    }
    const missing = syncedIds.filter((v) => !v.merchize_product_id || !v.manually_set);
    if (missing.length === 0) {
      setError('All variants already have product IDs.');
      return;
    }
    setGenerating(true);
    setError('');
    try {
      const displayFontFam = customFontName ? `'${customFontName}', 'Archivo Black', sans-serif` : (FONTS.find((f) => f.id === fontId) || FONTS[0]).family;

      // Step 1: Render display images for variants with name/number combos.
      // Uses direct Canvas 2D rendering (not html2canvas / SVG-to-image) so
      // text, arch/flag curves, outlines, and fonts match the designer exactly.
      const renderedImages = {};
      const needsRender = missing.filter((v) => v.combo_name || v.combo_number);
      for (let i = 0; i < needsRender.length; i++) {
        const v = needsRender[i];
        setRenderProgress(`Rendering ${i + 1}/${needsRender.length}…`);
        const colorObj = (colors || []).find((c) => c.name === v.color_name);
        const images = colorObj?.images || [];
        if (images.length === 0) continue;
        const isStatic = images.length <= 1;
        const imageUrl = isStatic ? images[0].url : images[images.length - 1].url;

        // Render dimensions match SVG viewBox aspect ratio for perfect overlay alignment
        // IdentityNameOverlay viewBox is 300×400 (3:4); StaticNameOverlay is 400×400 (1:1)
        const renderW = isStatic ? 1200 : 900;
        const renderH = isStatic ? 1200 : 1200;

        try {
          const blob = await renderOverlayToBlob({
            imageUrl,
            imageFit: 'cover',
            customName: v.combo_name,
            customNumber: v.combo_number,
            nameStyle,
            numberStyle,
            fontFam: displayFontFam,
            customFontUrl,
            customFontName,
            enableName,
            enableNumber,
            staticDisplay: isStatic,
            isArtwork: false,
            renderW,
            renderH,
          });
          if (blob) {
            const file = new File([blob], `combo-${v.color_name}-${v.combo_name}-${v.combo_number}.png`, { type: 'image/png' });
            const { file_url } = await base44.integrations.Core.UploadPublicFile({ file });
            const key = `${v.color_name}|${v.combo_name}|${v.combo_number}`;
            renderedImages[key] = file_url;
          }
        } catch (err) {
          console.error('Display render failed:', err);
        }
      }

      // Step 1b: Render name/number onto front artwork via direct Canvas 2D
      const renderedArtwork = {};
      for (let i = 0; i < needsRender.length; i++) {
        const v = needsRender[i];
        setRenderProgress(`Compositing artwork ${i + 1}/${needsRender.length}…`);
        const colorObj = (colors || []).find((c) => c.name === v.color_name);
        const artworkFront = colorObj?.artwork_front || '';
        if (!artworkFront) continue;

        // Load artwork to get natural dimensions
        const artworkImg = new Image();
        artworkImg.crossOrigin = 'anonymous';
        artworkImg.src = artworkFront;
        await new Promise((resolve) => {
          artworkImg.onload = resolve;
          artworkImg.onerror = resolve;
          setTimeout(resolve, 5000);
        });
        const naturalW = artworkImg.naturalWidth || 1200;
        const naturalH = artworkImg.naturalHeight || 1200;
        const maxDim = 1200;
        const sz = Math.min(1, maxDim / Math.max(naturalW, naturalH));
        const renderW = Math.round(naturalW * sz);
        const renderH = Math.round(naturalH * sz);

        const isStaticArtwork = (colorObj?.images?.length || 0) <= 1;
        const artworkFontFam = customFontName ? `'${customFontName}', 'Archivo Black', sans-serif` : "'Archivo Black', sans-serif";

        try {
          const blob = await renderOverlayToBlob({
            imageUrl: artworkFront,
            imageFit: 'contain',
            customName: v.combo_name,
            customNumber: v.combo_number,
            nameStyle,
            numberStyle,
            fontFam: artworkFontFam,
            customFontUrl,
            customFontName,
            enableName,
            enableNumber,
            staticDisplay: isStaticArtwork,
            isArtwork: true,
            artworkPosition,
            aspectRatio: naturalW / naturalH,
            renderW,
            renderH,
          });
          if (blob) {
            const file = new File([blob], `artwork-front-${v.color_name}-${v.combo_name}-${v.combo_number}.png`, { type: 'image/png' });
            const { file_url } = await base44.integrations.Core.UploadPublicFile({ file });
            const key = `${v.color_name}|${v.combo_name}|${v.combo_number}`;
            renderedArtwork[key] = file_url;
          }
        } catch (err) {
          console.error('Artwork render failed:', err);
          setError(`Artwork render failed for ${v.color_name}: ${err.message}`);
        }
      }
      setRenderProgress('');

      // Step 2: Call create-merchize-products with rendered images and artwork
      const passcode = sessionStorage.getItem('nemesis-admin-passcode') || '';
      const res = await base44.functions.invoke('create-merchize-products', {
        jerseyId,
        variants: missing.map((v) => ({ color_name: v.color_name, combo_name: v.combo_name, combo_number: v.combo_number })),
        merchize_product_id: merchizeProductId,
        merchize_variants: merchizeVariants,
        colorArtwork,
        renderedImages,
        renderedArtwork,
        passcode,
      });
      if (res.data?.error) {
        setError(res.data.error);
        return;
      }
      const results = res.data?.results || [];
      const updated = syncedIds.map((v) => {
        const r = results.find((rr) => rr.color_name === v.color_name && rr.combo_name === v.combo_name && rr.combo_number === v.combo_number);
        if (r && r.success) return { ...v, merchize_product_id: r.merchize_product_id, title: r.title || '', manually_set: false, variant_ids: r.variant_ids || {}, skus: r.skus || {} };
        return v;
      });
      onChange(updated);
      const firstSuccess = results.find((r) => r.success);
      if (firstSuccess && onPrimaryGenerated) {
        onPrimaryGenerated({
          merchize_product_id: firstSuccess.merchize_product_id,
          merchize_product_title: firstSuccess.title || '',
          merchize_variants: firstSuccess.skus || {},
        });
      }
      const failed = results.filter((r) => !r.success);
      if (failed.length > 0) setError(`${failed.length} failed: ${failed[0].error}`);
    } catch (err) {
      setError(err?.message || 'Generation failed');
    } finally {
      setGenerating(false);
      setRenderProgress('');
    }
  };

  return (
    <div className="space-y-3 pt-3 border-t border-steel">
      <div className="flex items-center justify-between">
        <div className="mono-label text-fog/50">PER-VARIANT MERCHIZE IDs ({allVariants.length})</div>
        <button
          type="button"
          onClick={() => setShowConfirm(true)}
          disabled={generating}
          className="inline-flex items-center gap-1.5 bg-kinetic px-3 py-1.5 font-heading uppercase text-void text-xs hover:bg-fog transition-colors rounded-[4px] disabled:opacity-60"
        >
          {generating ? <Loader2 size={12} className="animate-spin" /> : <Zap size={12} />}
          {generating ? 'Generating…' : 'Generate in Merchize'}
        </button>
      </div>
      {error && <p className="mono-label text-kinetic text-[0.65rem]">{error}</p>}
      {renderProgress && <p className="mono-label text-fog/50 text-[0.65rem]">{renderProgress}</p>}
      {allVariants.length === 0 ? (
        <p className="mono-label text-fog/30 text-[0.65rem]">Add colors or presets to generate variants.</p>
      ) : (
        <div className="space-y-2">
          {allVariants.map((v, i) => {
            const vmi = syncedIds[i];
            const label = [v.color_name, v.combo_name, v.combo_number].filter(Boolean).join(' · ');
            return (
              <div key={i} className="border border-steel rounded-[4px]">
                <button
                  type="button"
                  onClick={() => setExpanded(expanded === i ? null : i)}
                  className="w-full flex items-center justify-between px-3 py-2.5 text-left"
                >
                  <span className="flex items-center gap-2">
                    {expanded === i ? <ChevronDown size={12} className="text-fog/50" /> : <ChevronRight size={12} className="text-fog/50" />}
                    <span className="mono-label text-fog/40 text-[0.6rem]">{label}</span>
                  </span>
                  <span className="flex items-center gap-2">
                    {vmi.merchize_product_id
                      ? <span className="mono-label text-[0.55rem] text-kinetic">{vmi.manually_set ? 'MANUAL' : 'READY'}</span>
                      : <span className="mono-label text-[0.55rem] text-fog/30">PENDING</span>}
                  </span>
                </button>
                {expanded === i && (
                  <div className="px-3 pb-3 space-y-2 border-t border-steel pt-2">
                    <div>
                      <span className="mono-label text-fog/30 text-[0.55rem] block mb-1">TITLE</span>
                      <input
                        type="text"
                        value={vmi.title || ''}
                        onChange={(e) => updateTitle(i, e.target.value)}
                        disabled={generating}
                        placeholder="Auto-filled on generate"
                        className="w-full bg-white text-black border border-steel rounded-[4px] px-2 py-1.5 text-xs placeholder:text-black/30 focus:border-kinetic outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                      />
                    </div>
                    <div>
                      <span className="mono-label text-fog/30 text-[0.55rem] block mb-1">SKUs</span>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {SIZE_ORDER.map((size) => (
                          <div key={size}>
                            <span className="mono-label text-fog/40 text-[0.55rem] block mb-0.5">{size}</span>
                            <input
                              type="text"
                              value={vmi.skus?.[size] || ''}
                              onChange={(e) => updateSku(i, size, e.target.value)}
                              disabled={generating}
                              className="w-full bg-white text-black border border-steel rounded-[4px] px-2 py-1 text-xs focus:border-kinetic outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      {showConfirm && (
        <div className="fixed inset-0 bg-void/80 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-steel rounded-[6px] p-6 max-w-sm space-y-4">
            <div className="flex items-start gap-3">
              <AlertTriangle size={20} className="text-kinetic shrink-0 mt-0.5" />
              <div>
                <p className="font-heading text-fog text-sm uppercase mb-2">Clear old products?</p>
                <p className="mono-label text-fog/50 text-[0.65rem] leading-relaxed normal-case tracking-normal">
                  Before generating new products, make sure you've deleted any old or unused products in Merchize that are no longer needed. This prevents duplicate or orphaned products.
                </p>
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={generate}
                className="inline-flex items-center gap-1.5 bg-kinetic px-4 py-2 font-heading uppercase text-void text-xs hover:bg-fog transition-colors rounded-[4px]"
              >
                <Zap size={12} /> Continue & Generate
              </button>
              <button
                type="button"
                onClick={() => setShowConfirm(false)}
                className="mono-label text-fog/50 hover:text-fog transition-colors px-4 py-2 border border-steel rounded-[4px] text-xs"
              >
                CANCEL
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}