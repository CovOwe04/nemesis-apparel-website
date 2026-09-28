// Shared Merchize API helpers for custom product + order creation

import { isSafeImageUrl } from './security.ts';

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
  size: string;
  sizeValue: string;
  price: number;
  fallbackSku: string;
  artworkUrls: Record<string, string>;
}

export async function createCustomProduct(params: CreateCustomProductParams) {
  const {
    baseUrl, token, apiKey, baseProductId, title, description,
    productImages, colorName, colorHex, size, sizeValue, price,
    fallbackSku, artworkUrls,
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
      is_preselected: true,
      position: 2,
      type: 'size',
      name: 'Size',
      values: [{ name: size, value: sizeValue }],
    },
  ];

  const productVariants = [
    {
      is_default: true,
      sku: fallbackSku,
      sku_seller: '',
      retail_price: price,
      currency: 'USD',
      options: [
        { name: colorName, value: colorHex },
        { name: size, value: sizeValue },
      ],
    },
  ];

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

  // Fetch the variant ID for this single-size product
  let variantId = '';
  let sku = fallbackSku;
  try {
    const variantsRes = await fetch(`${baseUrl}/product/products/${productId}/all-variants`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    });
    const variantsData = await variantsRes.json();
    if (variantsData.success && Array.isArray(variantsData.data) && variantsData.data.length > 0) {
      variantId = variantsData.data[0]._id;
      sku = variantsData.data[0].sku || fallbackSku;
    }
  } catch (err) {
    console.error(`Failed to fetch variant for custom product ${productId}:`, err.message);
  }

  // Upload artwork (front/back/sleeve/hood)
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
        await fetch(`${baseUrl}/artwork/artworks?product_id=${productId}`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });
      }
      // Also set artwork URLs directly on the product (matches Generate button behavior)
      try {
        const artworkBody = {};
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

  // Upload display images to the variant
  if (variantId && productImages.length > 0) {
    try {
      const formData = new FormData();
      for (const imgUrl of productImages) {
        if (!isSafeImageUrl(imgUrl)) continue;
        const imgRes = await fetch(imgUrl);
        if (!imgRes.ok) continue;
        const blob = await imgRes.blob();
        const ext = (imgRes.headers.get('content-type') || 'image/png').split('/')[1]?.replace('svg+xml', 'svg') || 'png';
        formData.append('images', blob, `image.${ext}`);
      }
      if ([...formData.keys()].length > 0) {
        await fetch(`${baseUrl}/product/variants/${variantId}/image`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });
      }
    } catch (err) {
      console.error(`Failed to upload image to variant ${variantId}:`, err.message);
    }
  }

  return { productId, variantId, sku };
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
      items: items.map(({ order_artwork, requires_custom_artwork_front, ...item }) => item),
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
  const detailUrl = new URL(`${baseUrl}/order/external/orders/order-detail`);
  detailUrl.searchParams.set('external_number', orderId);
  detailUrl.searchParams.set('identifier', identifier);
  // Merchize can take a moment to expose newly created order items to the
  // detail endpoint. Retry briefly before treating a missing item list as a
  // fulfillment failure.
  let detailRes;
  let detail;
  for (let attempt = 0; attempt < 4; attempt++) {
    detailRes = await fetch(detailUrl, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    });
    detail = await detailRes.json();
    if (!detailRes.ok || !detail.success) {
      throw new Error(detail.message || `Could not retrieve Merchize order items (HTTP ${detailRes.status}).`);
    }
    if (Array.isArray(detail.data?.items) && detail.data.items.length >= items.length) break;
    if (attempt < 3) await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1)));
  }
  if (!Array.isArray(detail.data?.items) || detail.data.items.length < items.length) {
    throw new Error('Merchize created the order, but its order items are not available yet for artwork attachment. Retry artwork upload from the admin order.');
  }

  // Merchize returns order items in the same order as the import request. Use SKU
  // matching first and position as a fallback for responses with different SKU keys.
  const inputBySku = new Map();
  items.forEach((item, index) => {
    const key = String(item.merchize_sku || '').trim();
    if (!key) return;
    const queue = inputBySku.get(key) || [];
    queue.push(index);
    inputBySku.set(key, queue);
  });

  const artworkRequests = [];
  detail.data.items.forEach((orderItem, index) => {
    const key = String(orderItem.sku || '').trim();
    const matchedIndex = inputBySku.get(key)?.shift();
    const source = items[matchedIndex ?? index];
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
    if (Object.keys(artwork).length === 0) {
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

  const importRes = await fetch(`${baseUrl}/order/import/artworks`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ items: artworkRequests }),
  });
  const importData = await importRes.json();
  const failedImporters = (importData.data?.importers || []).filter((importer) =>
    importer.status === 'failed' || importer.error_message
  );
  if (!importRes.ok || !importData.success || (importData.data?.invalid_items || []).length > 0 || failedImporters.length > 0) {
    throw new Error(failedImporters[0]?.error_message || importData.message || `Merchize rejected artwork import (HTTP ${importRes.status}).`);
  }
  const succeeded = Number(importData.data?.succeeded || 0);
  if (succeeded < artworkRequests.length) {
    throw new Error(`Merchize imported ${succeeded} of ${artworkRequests.length} artwork sets.`);
  }
  return { success: true, succeeded, importers: importData.data?.importers || [] };
}
