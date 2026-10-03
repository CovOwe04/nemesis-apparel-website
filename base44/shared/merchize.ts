// Shared Merchize API helpers for custom product + order creation

import { isSafeImageUrl } from './security.ts';

const SIZES = [
  { name: 'XS', value: 'xs' },
  { name: 'S', value: 's' },
  { name: 'M', value: 'm' },
  { name: 'L', value: 'l' },
  { name: 'XL', value: 'xl' },
  { name: '2XL', value: '2xl' },
  { name: '3XL', value: '3xl' },
  { name: '4XL', value: '4xl' },
];

interface CreateCustomProductParams {
  baseUrl: string;
  token: string;
  apiKey: string;
  baseProductId: string;
  title: string;
  description: string;
  productImages: string[];
  colorName: string;
  colorHex: string;
  price: number;
  fallbackSkus: Record<string, string>;
  artworkUrls: Record<string, string>;
  sellerSkuPrefix?: string;
}

// Seller SKU for a custom product size — used on both the product variant and
// the order line so Merchize maps the order to this product instead of
// auto-creating a generic one.
// Merchize reads the 3rd dash-separated segment of a seller SKU as the
// product's external ID, and order lines whose product_id equals that ID are
// linked to this product (no generic product is auto-created).
export function customSellerSku(externalId: string, size: string) {
  return `NEMESIS-C-${externalId}-${size}`;
}

// Step 1: Create the custom product with ALL size variants (matches the admin
// "Generate Products" flow). Returns immediately after product creation + variant
// fetch so the caller can persist the product ID before any artwork upload that
// might fail and trigger a duplicate-creating retry.
export async function createCustomProduct(params: CreateCustomProductParams) {
  const {
    baseUrl, token, apiKey, baseProductId, title, description,
    productImages, colorName, colorHex, price, fallbackSkus, sellerSkuPrefix,
  } = params;

  const attributes = [
    {
      is_preselected: true,
      position: 1,
      type: 'color',
      name: 'Color',
      values: [{ name: colorName, value: colorHex }],
    },
    {
      is_preselected: false,
      position: 2,
      type: 'size',
      name: 'Size',
      values: SIZES,
    },
  ];

  const productVariants = SIZES.map((s, i) => ({
    is_default: i === 0,
    sku: fallbackSkus?.[s.name] || '',
    sku_seller: sellerSkuPrefix ? customSellerSku(sellerSkuPrefix, s.name) : '',
    retail_price: price,
    currency: 'USD',
    options: [
      { name: colorName, value: colorHex },
      { name: s.name, value: s.value },
    ],
  }));

  const payload = {
    title,
    description,
    images: productImages,
    base_product_id: baseProductId,
    attributes,
    variants: productVariants,
    is_collection_hidden: false,
    is_shop_hidden: false,
    is_stealthy: false,
    is_featured: false,
  };

  const createRes = await fetch(`${baseUrl}/product/products/dropship/create`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const createData = await createRes.json();
  if (!createRes.ok || !createData.success || !createData.data?._id) {
    throw new Error(createData.msg || createData.error || `HTTP ${createRes.status}`);
  }

  const productId = createData.data._id;

  // Fetch all variant IDs and SKUs for every size
  let variantIds: Record<string, string> = {};
  let skus: Record<string, string> = {};
  try {
    const variantsRes = await fetch(`${baseUrl}/product/products/${productId}/all-variants`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    });
    const variantsData = await variantsRes.json();
    if (variantsData.success && Array.isArray(variantsData.data)) {
      for (const v of variantsData.data) {
        const sizeOption = v.options?.find((o: any) => o.attribute?.value_type === 'size');
        if (sizeOption) {
          const sizeKey = String(sizeOption.name).toUpperCase();
          variantIds[sizeKey] = v._id;
          skus[sizeKey] = v.sku || '';
        }
      }
    }
  } catch (err) {
    console.error(`Failed to fetch variants for custom product ${productId}:`, err.message);
  }

  return { productId, variantIds, skus };
}

// Step 2: Upload artwork and display images to an already-created custom product.
// Best-effort — logs errors but does not throw, so a failed upload does not block
// order fulfillment or cause a duplicate product on retry.
export async function uploadCustomProductArtwork(params: {
  baseUrl: string;
  token: string;
  apiKey: string;
  productId: string;
  variantIds: Record<string, string>;
  productImages: string[];
  artworkUrls: Record<string, string>;
}) {
  const { baseUrl, token, apiKey, productId, variantIds, productImages, artworkUrls } = params;
  let artworkUploaded = false;
  let variantImagesUploaded = 0;

  // Upload artwork files to the main product only (matches admin Generate flow).
  const artworkEntries = Object.entries(artworkUrls).filter(([, url]) => url);
  if (artworkEntries.length > 0) {
    try {
      const formData = new FormData();
      for (const [piece, url] of artworkEntries) {
        if (!isSafeImageUrl(url)) continue;
        const imgRes = await fetch(url);
        if (!imgRes.ok) continue;
        const blob = await imgRes.blob();
        const ext = (imgRes.headers.get('content-type') || 'image/png').split('/')[1]?.replace('svg+xml', 'svg') || 'png';
        formData.append(piece, blob, `${piece}.${ext}`);
      }
      if ([...formData.keys()].length > 0) {
        const artworkRes = await fetch(`${baseUrl}/artwork/artworks?product_id=${productId}`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });
        const artworkData = await artworkRes.json();
        artworkUploaded = artworkData.success === true;
        if (!artworkUploaded) {
          console.error(`Artwork upload returned non-success for ${productId}:`, artworkData.message);
        }
      }
      // Also set artwork URLs directly on the product
      try {
        const artworkBody: Record<string, string> = {};
        for (const [piece, url] of artworkEntries) {
          artworkBody[piece] = url;
        }
        await fetch(`${baseUrl}/product/products/${productId}`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'x-api-key': apiKey, 'Content-Type': 'application/json' },
          body: JSON.stringify({ artwork: artworkBody }),
        });
      } catch (err) {
        console.error(`Failed to set artwork via POST for ${productId}:`, err.message);
      }
    } catch (err) {
      console.error(`Failed to upload artwork for custom product ${productId}:`, err.message);
    }
  }

  // Upload display images to every variant
  if (Object.keys(variantIds).length > 0 && productImages.length > 0) {
    const imageBlobs: { blob: Blob; ext: string }[] = [];
    for (const imgUrl of productImages) {
      try {
        if (!isSafeImageUrl(imgUrl)) continue;
        const imgRes = await fetch(imgUrl);
        if (!imgRes.ok) continue;
        const blob = await imgRes.blob();
        const ext = (imgRes.headers.get('content-type') || 'image/png').split('/')[1]?.replace('svg+xml', 'svg') || 'png';
        imageBlobs.push({ blob, ext });
      } catch (err) {
        console.error(`Failed to fetch display image ${imgUrl}:`, err.message);
      }
    }
    for (const variantId of Object.values(variantIds)) {
      try {
        const formData = new FormData();
        for (const { blob, ext } of imageBlobs) {
          formData.append('images', blob, `image.${ext}`);
        }
        if ([...formData.keys()].length > 0) {
          const variantImgRes = await fetch(`${baseUrl}/product/variants/${variantId}/image`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
            body: formData,
          });
          const variantImgData = await variantImgRes.json();
          if (variantImgData.success) variantImagesUploaded++;
        }
      } catch (err) {
        console.error(`Failed to upload image to variant ${variantId}:`, err.message);
      }
    }
  }

  return { artworkUploaded, variantImagesUploaded };
}

// Create a personalized product for one cart item exactly like the admin
// "Generate in Merchize" button: title "<Listing> - <Color> - <Name> - <Number>",
// all sizes, artwork on the main product, 3D render on every size variant.
// Stores the product mapping on the item and returns it.
export async function createCustomProductForItem(opts: {
  baseUrl: string; token: string; apiKey: string; item: any; jersey: any; sellerSkuPrefix: string;
}) {
  const { baseUrl, token, apiKey, item, jersey } = opts;
  // External ID must not contain dashes (it is one SKU segment)
  const sellerSkuPrefix = opts.sellerSkuPrefix.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  const baseProductId = jersey?.merchize_product_id || jersey?.merchize_existing_product_id;
  if (!baseProductId) return null;

  const colorName = item.colorName || 'Default';
  const colorObj = (jersey.colors || []).find((c) => c.name === item.colorName);
  const title = [jersey.name, item.colorName, item.customName, item.customNumber].filter(Boolean).join(' - ');
  const productImages = [item.rendered_image].filter(Boolean);
  const artworkUrls: Record<string, string> = {};
  if (item.rendered_artwork_front) artworkUrls.front = item.rendered_artwork_front;
  if (item.artwork_back) artworkUrls.back = item.artwork_back;
  if (item.artwork_sleeve) artworkUrls.sleeve = item.artwork_sleeve;
  if (item.artwork_hood) artworkUrls.hood = item.artwork_hood;
  const fallbackSkus = (jersey.merchize_product_id ? jersey.merchize_variants : jersey.merchize_existing_variants) || {};

  const { productId, variantIds, skus } = await createCustomProduct({
    baseUrl, token, apiKey, baseProductId, title,
    description: jersey.description || '',
    productImages, colorName, colorHex: colorObj?.hex || '#000000',
    price: jersey.price, fallbackSkus, artworkUrls, sellerSkuPrefix,
  });
  const size = item.shirtSize || 'M';
  item.custom_merchize_product_id = productId;
  item.custom_merchize_title = title;
  item.custom_merchize_variant_ids = variantIds;
  item.custom_merchize_skus = skus;
  item.custom_merchize_variant_id = variantIds[size] || '';
  item.custom_merchize_sku = skus[size] || fallbackSkus[size] || '';
  item.custom_seller_sku = customSellerSku(sellerSkuPrefix, size);
  item.custom_external_product_id = sellerSkuPrefix;

  await uploadCustomProductArtwork({ baseUrl, token, apiKey, productId, variantIds, productImages, artworkUrls });
  console.log(`Custom product created: ${productId} "${title}"`);
  return item;
}

// A preset item is one whose (name, number) matches an entry in the listing's
// name_number_combos. Preset products are pre-generated in Merchize (stored on
// variant_merchize_ids), so preset orders fulfill directly without admin review.
export function findPresetMatch(item: any, jersey: any) {
  const combos = jersey?.name_number_combos || [];
  const combo = combos.find((entry: any) =>
    (entry.name || '').toUpperCase() === (item.customName || '').toUpperCase() &&
    (entry.number || '') === (item.customNumber || ''),
  );
  if (!combo) return null;
  const vmi = (jersey?.variant_merchize_ids || []).find((entry: any) =>
    (entry.color_name || 'Default') === (item.colorName || 'Default') &&
    (entry.combo_name || '').toUpperCase() === (combo.name || '').toUpperCase() &&
    (entry.combo_number || '') === (combo.number || ''),
  );
  return { combo, vmi };
}

export function isPresetItem(item: any, jersey: any) {
  return findPresetMatch(item, jersey) !== null;
}

// Merchize order line for a preset item that already has a generated product.
export function buildPresetOrderItem(item: any, jersey: any, vmi: any) {
  const size = item.shirtSize || 'M';
  const merchizeSku = vmi?.skus?.[size] || vmi?.skus?.M || Object.values(vmi?.skus || {})[0] || '';
  if (!vmi?.merchize_product_id || !merchizeSku) return null;
  return {
    product_id: vmi.merchize_product_id,
    sku: `NEMESIS-${(item.name || 'JERSEY').replace(/\s+/g, '-')}-${size}`,
    merchize_sku: merchizeSku,
    quantity: item.quantity,
    price: item.price,
    currency: 'USD',
    image: item.rendered_image,
    requires_custom_artwork_front: true,
    order_artwork: {
      front: item.rendered_artwork_front,
      back: item.artwork_back || '',
      sleeve: item.artwork_sleeve || '',
      hood: item.artwork_hood || '',
    },
  };
}

// Order line for an item that has a custom product from createCustomProductForItem.
export function buildCustomOrderItem(item: any) {
  return {
    product_id: item.custom_external_product_id || item.custom_merchize_product_id,
    sku: item.custom_seller_sku || `NEMESIS-CUSTOM-${item.shirtSize || 'M'}`,
    merchize_sku: item.custom_merchize_sku || '',
    quantity: item.quantity,
    price: item.price,
    currency: 'USD',
    image: item.rendered_image,
    requires_custom_artwork_front: true,
    order_artwork: {
      front: item.rendered_artwork_front,
      back: item.artwork_back || '',
      sleeve: item.artwork_sleeve || '',
      hood: item.artwork_hood || '',
    },
  };
}

export async function createMerchizeOrder(
  baseUrl: string,
  token: string,
  apiKey: string,
  opts: { orderId: string; customerName: string; customerEmail: string; shippingAddress: any; items: any[] },
) {
  const { orderId, customerName, customerEmail, shippingAddress, items } = opts;
  const identifier = 'nemesis-apparel.base44.app';

  // Do not create a fulfillment order that cannot carry its print files. The
  // Merchize order item image is only a preview; print artwork is attached by
  // the separate /order/import/artworks request below.
  for (const [index, item] of items.entries()) {
    if (item.requires_custom_artwork_front && !isSafeImageUrl(item.order_artwork?.front)) {
      throw new Error(`Personalized front print artwork is missing for order item ${index + 1}.`);
    }
    if (item.requires_custom_artwork_front && !isSafeImageUrl(item.image)) {
      throw new Error(`Customized jersey preview is missing for order item ${index + 1}.`);
    }
    const artworkUrls = Object.values(item.order_artwork || {}).filter(
      (url) => typeof url === 'string' && isSafeImageUrl(url),
    );
    if (artworkUrls.length === 0) {
      throw new Error(`Print artwork is missing for order item ${index + 1}.`);
    }
  }

  const merchizeRes = await fetch(`${baseUrl}/order/external/orders/catalog`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'x-api-key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      order_id: orderId,
      identifier,
      shipping_info: {
        full_name: customerName,
        address_1: shippingAddress.line1 || '',
        address_2: shippingAddress.line2 || '',
        city: shippingAddress.city || '',
        state: shippingAddress.state || '',
        postcode: shippingAddress.postalCode || '',
        country: shippingAddress.country || 'US',
        email: customerEmail,
        phone: '',
      },
      items: items.map(({ order_artwork, requires_custom_artwork_front, rendered_image_version: _renderedImageVersion, ...item }) => item),
    }),
  });
  const merchizeData = await merchizeRes.json();
  if (!merchizeRes.ok || !merchizeData.success || !merchizeData.data?._id) return merchizeData;

  const hasArtwork = items.some((item) => item.order_artwork && Object.values(item.order_artwork).some(Boolean));
  if (!hasArtwork) return { ...merchizeData, artwork_import: { success: true, skipped: true } };

  try {
    const artworkImport = await importMerchizeOrderArtworks(baseUrl, token, {
      orderId,
      identifier,
      items,
    });
    return { ...merchizeData, artwork_import: artworkImport };
  } catch (error) {
    console.error('Merchize order artwork import failed:', error.message || error);
    return {
      ...merchizeData,
      artwork_import: { success: false, error: error.message || 'Could not attach artwork to the Merchize order.' },
    };
  }
}

export async function importMerchizeOrderArtworks(
  baseUrl: string,
  token: string,
  opts: { orderId: string; identifier: string; items: any[] },
) {
  const { orderId, identifier, items } = opts;
  console.log(`[importMerchizeOrderArtworks] START — orderId=${orderId} identifier=${identifier} items=${items.length}`);
  for (const [i, item] of items.entries()) {
    console.log(`[importMerchizeOrderArtworks] item[${i}] product_id=${item.product_id} sku=${item.sku} merchize_sku=${item.merchize_sku} qty=${item.quantity} requires_custom_artwork_front=${item.requires_custom_artwork_front || false}`);
    console.log(`[importMerchizeOrderArtworks] item[${i}] order_artwork=`, JSON.stringify(item.order_artwork || {}));
  }

  const detailUrl = new URL(`${baseUrl}/order/external/orders/order-detail`);
  detailUrl.searchParams.set('external_number', orderId);
  detailUrl.searchParams.set('identifier', identifier);
  console.log(`[importMerchizeOrderArtworks] fetching order detail: ${detailUrl.toString()}`);
  // Merchize can take a moment to expose newly created order items to the
  // detail endpoint. Retry briefly before treating a missing item list as a
  // fulfillment failure.
  let detailRes;
  let detail;
  const MAX_DETAIL_ATTEMPTS = 8;
  for (let attempt = 0; attempt < MAX_DETAIL_ATTEMPTS; attempt++) {
    detailRes = await fetch(detailUrl, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    });
    detail = await detailRes.json();
    console.log(`[importMerchizeOrderArtworks] detail attempt ${attempt + 1}/${MAX_DETAIL_ATTEMPTS} — ok=${detailRes.ok} success=${detail.success} items_found=${detail.data?.items?.length || 0} message=${detail.message || ''}`);
    // Success — order items are available
    if (detailRes.ok && detail.success && Array.isArray(detail.data?.items) && detail.data.items.length >= items.length) break;
    // Transient "Order is being processed" — retry with backoff
    if (attempt < MAX_DETAIL_ATTEMPTS - 1) {
      await new Promise((resolve) => setTimeout(resolve, 1500 * (attempt + 1)));
      continue;
    }
    // Final attempt failed — throw with the Merchize error message
    if (!detailRes.ok || !detail.success) {
      throw new Error(detail.message || `Could not retrieve Merchize order items (HTTP ${detailRes.status}).`);
    }
  }
  if (!Array.isArray(detail.data?.items) || detail.data.items.length < items.length) {
    console.error(`[importMerchizeOrderArtworks] order items not available — expected ${items.length}, got ${detail.data?.items?.length || 0}`);
    throw new Error('Merchize created the order, but its order items are not available yet for artwork attachment. Retry artwork upload from the admin order.');
  }

  console.log(`[importMerchizeOrderArtworks] order detail items:`);
  for (const [i, oi] of detail.data.items.entries()) {
    console.log(`[importMerchizeOrderArtworks] detail item[${i}] id=${oi.id || oi._id} sku=${oi.sku} merchize_sku=${oi.merchize_sku} product_id=${oi.product_id || oi.product?._id}`);
  }

  // Match detail lines by either our seller SKU or Merchize's catalog SKU.
  const inputBySku = new Map();
  const inputByProductId = new Map();
  items.forEach((item, index) => {
    for (const value of [item.merchize_sku, item.sku]) {
      const key = String(value || '').trim();
      if (!key) continue;
      const queue = inputBySku.get(key) || [];
      queue.push(index);
      inputBySku.set(key, queue);
    }
    const productId = String(item.product_id || '').trim();
    if (productId) {
      const queue = inputByProductId.get(productId) || [];
      queue.push(index);
      inputByProductId.set(productId, queue);
    }
  });
  console.log(`[importMerchizeOrderArtworks] SKU index keys:`, [...inputBySku.keys()]);
  console.log(`[importMerchizeOrderArtworks] product_id index keys:`, [...inputByProductId.keys()]);

  const artworkRequests = [];
  const matchedInputs = new Set();
  detail.data.items.forEach((orderItem, index) => {
    const skuKeys = [orderItem.sku, orderItem.merchize_sku, orderItem.sku_seller, orderItem.seller_sku]
      .map((value) => String(value || '').trim())
      .filter(Boolean);
    let matchedIndex;
    for (const key of skuKeys) {
      const queue = inputBySku.get(key);
      const availableIndex = queue?.findIndex((candidate) => !matchedInputs.has(candidate)) ?? -1;
      if (availableIndex >= 0) {
        matchedIndex = queue.splice(availableIndex, 1)[0];
        console.log(`[importMerchizeOrderArtworks] detail item[${index}] matched by SKU key="${key}" → input item[${matchedIndex}]`);
        break;
      }
    }
    if (matchedIndex === undefined) {
      const productId = String(orderItem.product_id || orderItem.product?._id || orderItem.product?.id || '').trim();
      const queue = inputByProductId.get(productId);
      const availableIndex = queue?.findIndex((candidate) => !matchedInputs.has(candidate)) ?? -1;
      if (availableIndex >= 0) {
        matchedIndex = queue.splice(availableIndex, 1)[0];
        console.log(`[importMerchizeOrderArtworks] detail item[${index}] matched by product_id="${productId}" → input item[${matchedIndex}]`);
      }
    }
    if (matchedIndex === undefined && detail.data.items.length === items.length && !matchedInputs.has(index)) {
      matchedIndex = index;
      console.log(`[importMerchizeOrderArtworks] detail item[${index}] matched by position fallback → input item[${matchedIndex}]`);
    }
    if (matchedIndex === undefined) {
      console.error(`[importMerchizeOrderArtworks] could not match detail item[${index}] skuKeys=${JSON.stringify(skuKeys)}`);
      throw new Error(`Could not match Merchize order item ${index + 1} to the submitted order items.`);
    }
    matchedInputs.add(matchedIndex);
    const source = items[matchedIndex];
    if (!source?.order_artwork) {
      throw new Error(`Could not match Merchize order item ${index + 1} to its artwork.`);
    }
    const orderItemId = orderItem.id || orderItem._id;
    if (!orderItemId) throw new Error(`Merchize order item ID is missing for item ${index + 1}.`);

    const artwork = {};
    for (const side of ['front', 'back', 'sleeve', 'hood']) {
      const url = source.order_artwork[side];
      if (url && isSafeImageUrl(url)) artwork[`design_${side}`] = url;
    }
    console.log(`[importMerchizeOrderArtworks] detail item[${index}] → order_item_id=${orderItemId} artwork=${JSON.stringify(artwork)}`);
    if (Object.keys(artwork).length === 0) {
      console.error(`[importMerchizeOrderArtworks] no artwork for detail item[${index}] — source.order_artwork=${JSON.stringify(source.order_artwork)}`);
      throw new Error(`No accessible print artwork URL was found for Merchize order item ${index + 1}.`);
    }
    if (source.requires_custom_artwork_front && !artwork.design_front) {
      throw new Error(`Personalized front print artwork is missing for Merchize order item ${index + 1}.`);
    }

    let remaining = Math.max(1, Number(source.quantity) || 1);
    while (remaining > 0) {
      const applyForItem = Math.min(remaining, 50);
      artworkRequests.push({ id: orderItemId, ...artwork, apply_for_item: applyForItem });
      remaining -= applyForItem;
    }
  });

  if (artworkRequests.length === 0) {
    throw new Error('No usable artwork URLs could be matched to the Merchize order items.');
  }

  console.log(`[importMerchizeOrderArtworks] POST /order/import/artworks — ${artworkRequests.length} request(s):`);
  console.log(JSON.stringify(artworkRequests, null, 2));

  const importRes = await fetch(`${baseUrl}/order/import/artworks`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ items: artworkRequests }),
  });
  const importData = await importRes.json();
  console.log(`[importMerchizeOrderArtworks] response — ok=${importRes.ok} success=${importData.success} succeeded=${importData.data?.succeeded} invalid_items=${importData.data?.invalid_items?.length || 0} importers=${importData.data?.importers?.length || 0}`);
  console.log(`[importMerchizeOrderArtworks] full response:`, JSON.stringify(importData).substring(0, 2000));
  const failedImporters = (importData.data?.importers || []).filter((importer) =>
    importer.status === 'failed' || importer.error_message
  );
  if (failedImporters.length > 0) {
    console.error(`[importMerchizeOrderArtworks] failed importers:`, JSON.stringify(failedImporters, null, 2));
  }
  if (!importRes.ok || !importData.success || (importData.data?.invalid_items || []).length > 0 || failedImporters.length > 0) {
    throw new Error(failedImporters[0]?.error_message || importData.message || `Merchize rejected artwork import (HTTP ${importRes.status}).`);
  }
  const succeeded = Number(importData.data?.succeeded || 0);
  if (succeeded < artworkRequests.length) {
    throw new Error(`Merchize imported ${succeeded} of ${artworkRequests.length} artwork sets.`);
  }
  console.log(`[importMerchizeOrderArtworks] END — succeeded=${succeeded}`);
  return { success: true, succeeded, importers: importData.data?.importers || [] };
}