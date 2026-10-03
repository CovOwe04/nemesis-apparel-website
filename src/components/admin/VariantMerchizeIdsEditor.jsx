import { useState } from 'react';
import { Loader2, Zap, AlertTriangle, ChevronDown, ChevronRight } from 'lucide-react';
import { generateVariants, buildSyncedIds, generateMerchizeVariants } from '@/lib/generateMerchizeVariants';

const SIZE_ORDER = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL'];

function sortSizes(entries) {
  return [...entries].sort(([a], [b]) => {
    const ai = SIZE_ORDER.indexOf(a);
    const bi = SIZE_ORDER.indexOf(b);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });
}

export default function VariantMerchizeIdsEditor({ colors, combos, variantMerchizeIds, onChange, jerseyId, merchizeProductId, merchizeVariants, colorArtwork, nameStyle, numberStyle, customFontUrl, customFontName, fontId, enableName, enableNumber }) {
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  const [renderProgress, setRenderProgress] = useState('');
  const [expanded, setExpanded] = useState(null);

  const allVariants = generateVariants(colors, combos);

  const syncedIds = buildSyncedIds(colors, combos, variantMerchizeIds);

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

  const resetVariant = (index) => {
    const updated = syncedIds.map((v, i) =>
      i === index
        ? { ...v, merchize_product_id: '', external_product_id: '', variant_ids: {}, skus: {}, title: '', manually_set: false }
        : v
    );
    onChange(updated);
  };

  const generate = async () => {
    setShowConfirm(false);
    if (!jerseyId) {
      setError('Save the jersey first, then generate.');
      return;
    }
    const missing = syncedIds.filter((v) => !v.merchize_product_id);
    if (missing.length === 0) {
      setError('All variants already have product IDs.');
      return;
    }
    setGenerating(true);
    setError('');
    try {
      const { updatedIds, results, error } = await generateMerchizeVariants({
        jerseyId, colors, combos, variantMerchizeIds,
        merchizeProductId, merchizeVariants, colorArtwork,
        nameStyle, numberStyle, customFontUrl, customFontName, fontId,
        enableName, enableNumber,
        onProgress: setRenderProgress,
      });
      if (error) {
        setError(error);
        return;
      }
      onChange(updatedIds);
      const failed = (results || []).filter((r) => !r.success);
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
                    {vmi.merchize_product_id && (
                      <button
                        type="button"
                        onClick={() => resetVariant(i)}
                        disabled={generating}
                        className="mono-label text-kinetic hover:text-fog transition-colors text-[0.6rem] uppercase tracking-wider disabled:opacity-50"
                      >
                        Reset product ID
                      </button>
                    )}
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