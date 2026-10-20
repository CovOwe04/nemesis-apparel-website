import { base44 } from '@/api/base44Client';
import { renderJerseyDisplayToBlob, renderOverlayToBlob } from '@/components/admin/canvasOverlayRenderer';
import { resolveArtworkNameStyle, resolveArtworkNumberStyle, getMockupImageUrl } from '@/lib/jerseyStyle';

// Same variant list the "Generate in Merchize" button builds: one color-only
// row per color, then one row per color × name/number combo.
export function generateVariants(colors, combos) {
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

// Merge the saved variant_merchize_ids onto the full variant list so every
// row carries its current Merchize product mapping (or empty placeholders).
export function buildSyncedIds(colors, combos, variantMerchizeIds) {
  const allVariants = generateVariants(colors, combos);
  return allVariants.map((v) => {
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
}

// Shared generation flow used by both the "Generate in Merchize" button and the
// Update Listing pop-up. Renders display + artwork for missing combo variants,
// calls create-merchize-products, and returns the updated variant list.
export async function generateMerchizeVariants({
  jerseyId, colors, combos, variantMerchizeIds, merchizeProductId, merchizeVariants,
  colorArtwork, nameStyle, numberStyle, customFontUrl, customFontName, fontId,
  enableName, enableNumber, onProgress,
}) {
  const syncedIds = buildSyncedIds(colors, combos, variantMerchizeIds);
  const missing = syncedIds.filter((v) => !v.merchize_product_id);
  if (missing.length === 0) {
    return { updatedIds: syncedIds, results: [], skipped: true, error: null };
  }

  const renderedImages = {};
  const needsRender = missing.filter((v) => v.combo_name || v.combo_number);
  for (let i = 0; i < needsRender.length; i++) {
    const v = needsRender[i];
    onProgress?.(`Rendering ${i + 1}/${needsRender.length}…`);
    const colorObj = (colors || []).find((c) => c.name === v.color_name);
    const images = colorObj?.images || [];
    if (images.length === 0) continue;
    const isStatic = images.length <= 1;
    const imageUrl = getMockupImageUrl(colorObj);
    try {
      const blob = await renderJerseyDisplayToBlob({
        imageUrl,
        jersey: {
          static_display: isStatic,
          name_style: nameStyle,
          number_style: numberStyle,
          custom_font_url: customFontUrl,
          custom_font_name: customFontName,
        },
        color: colorObj,
        customName: v.combo_name,
        customNumber: v.combo_number,
        fontId,
        enableName,
        enableNumber,
      });
      if (blob) {
        const file = new File([blob], `combo-${v.color_name}-${v.combo_name}-${v.combo_number}.png`, { type: 'image/png' });
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        renderedImages[`${v.color_name}|${v.combo_name}|${v.combo_number}`] = file_url;
      }
    } catch (err) {
      console.error('Display render failed:', err);
    }
  }

  const renderedArtwork = {};
  for (let i = 0; i < needsRender.length; i++) {
    const v = needsRender[i];
    onProgress?.(`Compositing artwork ${i + 1}/${needsRender.length}…`);
    const colorObj = (colors || []).find((c) => c.name === v.color_name);
    const resolvedNameStyle = resolveArtworkNameStyle({ name_style: nameStyle }, colorObj);
    const resolvedNumberStyle = resolveArtworkNumberStyle({ number_style: numberStyle }, colorObj);
    const artworkFront = colorObj?.artwork_front || '';
    if (!artworkFront) continue;
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
        nameStyle: resolvedNameStyle,
        numberStyle: resolvedNumberStyle,
        fontFam: artworkFontFam,
        customFontUrl,
        customFontName,
        enableName,
        enableNumber,
        staticDisplay: isStaticArtwork,
        isArtwork: true,
        aspectRatio: naturalW / naturalH,
        renderW,
        renderH,
      });
      if (blob) {
        const file = new File([blob], `artwork-front-${v.color_name}-${v.combo_name}-${v.combo_number}.png`, { type: 'image/png' });
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        renderedArtwork[`${v.color_name}|${v.combo_name}|${v.combo_number}`] = file_url;
      }
    } catch (err) {
      console.error('Artwork render failed:', err);
    }
  }

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
    return { updatedIds: syncedIds, results: [], error: res.data.error };
  }
  const results = res.data?.results || [];
  const updated = syncedIds.map((v) => {
    const r = results.find((rr) => rr.color_name === v.color_name && rr.combo_name === v.combo_name && rr.combo_number === v.combo_number);
    if (r && r.success) {
      return {
        ...v,
        merchize_product_id: r.merchize_product_id,
        external_product_id: r.external_product_id || '',
        title: r.title || '',
        manually_set: false,
        variant_ids: r.variant_ids || {},
        skus: r.skus || {},
      };
    }
    return v;
  });
  return { updatedIds: updated, results, error: null };
}