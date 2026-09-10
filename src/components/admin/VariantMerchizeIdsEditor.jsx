import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Loader2, Zap } from 'lucide-react';

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

export default function VariantMerchizeIdsEditor({ colors, combos, variantMerchizeIds, onChange, jerseyId }) {
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');

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
      manually_set: existing?.manually_set || false,
      variant_ids: existing?.variant_ids || {},
    };
  });

  const updateField = (index, value) => {
    const updated = syncedIds.map((v, i) =>
      i === index ? { ...v, merchize_product_id: value, manually_set: true } : v
    );
    onChange(updated);
  };

  const generate = async () => {
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
      });
      const results = res.data?.results || [];
      const updated = syncedIds.map((v) => {
        const r = results.find((rr) => rr.color_name === v.color_name && rr.combo_name === v.combo_name && rr.combo_number === v.combo_number);
        if (r && r.success) return { ...v, merchize_product_id: r.merchize_product_id, manually_set: false, variant_ids: r.variant_ids || {} };
        return v;
      });
      onChange(updated);
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
          onClick={generate}
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
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {allVariants.map((v, i) => {
            const vmi = syncedIds[i];
            const label = [v.color_name, v.combo_name, v.combo_number].filter(Boolean).join(' · ');
            return (
              <div key={i} className="flex items-center gap-2">
                <span className="mono-label text-fog/40 text-[0.6rem] w-32 shrink-0 truncate">{label}</span>
                <input
                  type="text"
                  value={vmi.merchize_product_id || ''}
                  onChange={(e) => updateField(i, e.target.value)}
                  placeholder="Auto-filled on generate"
                  className="flex-1 bg-white text-black border border-steel rounded-[4px] px-2 py-1.5 text-xs placeholder:text-black/30 focus:border-kinetic outline-none"
                />
                {vmi.manually_set && <span className="mono-label text-[0.55rem] text-kinetic shrink-0">MANUAL</span>}
                {vmi.variant_ids && Object.keys(vmi.variant_ids).length > 0 && (
                  <span className="mono-label text-[0.55rem] text-fog/30 shrink-0">{Object.keys(vmi.variant_ids).length} SZ</span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}