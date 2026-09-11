import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Loader2, Zap, AlertTriangle } from 'lucide-react';

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
  if (combos.length > 0) {
    for (const color of colorList) {
      for (const combo of combos) {
        variants.push({
          color_name: color.name || 'Default',
          combo_name: combo.name || '',
          combo_number: combo.number || '',
        });
      }
    }
  } else {
    for (const color of colorList) {
      variants.push({ color_name: color.name || 'Default', combo_name: '', combo_number: '' });
    }
  }
  return variants;
}

export default function VariantMerchizeIdsEditor({ colors, combos, variantMerchizeIds, onChange, jerseyId, onPrimaryGenerated, merchizeProductId, merchizeVariants, colorArtwork }) {
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);

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
      const res = await base44.functions.invoke('create-merchize-products', {
        jerseyId,
        variants: missing.map((v) => ({ color_name: v.color_name, combo_name: v.combo_name, combo_number: v.combo_number })),
        merchize_product_id: merchizeProductId,
        merchize_variants: merchizeVariants,
        colorArtwork,
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
      {allVariants.length === 0 ? (
        <p className="mono-label text-fog/30 text-[0.65rem]">Add colors or presets to generate variants.</p>
      ) : (
        <div className="space-y-2">
          {allVariants.map((v, i) => {
            const vmi = syncedIds[i];
            const label = [v.color_name, v.combo_name, v.combo_number].filter(Boolean).join(' · ');
            return (
              <div key={i} className="border border-steel rounded-[4px] p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="mono-label text-fog/40 text-[0.6rem]">{label}</span>
                  {vmi.manually_set && <span className="mono-label text-[0.55rem] text-kinetic">MANUAL</span>}
                </div>
                <div>
                  <span className="mono-label text-fog/30 text-[0.55rem] block mb-1">TITLE</span>
                  <input
                    type="text"
                    value={vmi.title || ''}
                    onChange={(e) => updateTitle(i, e.target.value)}
                    placeholder="Auto-filled on generate"
                    className="w-full bg-white text-black border border-steel rounded-[4px] px-2 py-1.5 text-xs placeholder:text-black/30 focus:border-kinetic outline-none"
                  />
                </div>
                {vmi.skus && Object.keys(vmi.skus).length > 0 && (
                  <div>
                    <span className="mono-label text-fog/30 text-[0.55rem] block mb-1">SKUs</span>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {sortSizes(Object.entries(vmi.skus)).map(([size, sku]) => (
                        <div key={size}>
                          <span className="mono-label text-fog/40 text-[0.55rem] block mb-0.5">{size}</span>
                          <input
                            type="text"
                            value={sku || ''}
                            onChange={(e) => updateSku(i, size, e.target.value)}
                            className="w-full bg-white text-black border border-steel rounded-[4px] px-2 py-1 text-xs focus:border-kinetic outline-none"
                          />
                        </div>
                      ))}
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