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
  const merchizeRes = await fetch(`${baseUrl}/order/external/orders/catalog`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'x-api-key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      order_id: orderId,
      identifier: 'nemesis-apparel.base44.app',
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
      items,
    }),
  });
  return await merchizeRes.json();
}