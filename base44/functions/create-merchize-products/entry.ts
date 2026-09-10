import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { secrets } from 'base44:runtime';

const SIZES = [
  { name: 'S', value: 's' },
  { name: 'M', value: 'm' },
  { name: 'L', value: 'l' },
  { name: 'XL', value: 'xl' },
  { name: '2XL', value: '2xl' },
  { name: '3XL', value: '3xl' },
];

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    let user;
    try {
      user = await base44.auth.me();
    } catch {
      return Response.json({ error: 'Authentication required' }, { status: 401 });
    }
    if (user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await req.json();
    const { jerseyId, variants } = body;

    if (!jerseyId || !variants || !Array.isArray(variants) || variants.length === 0) {
      return Response.json({ error: 'jerseyId and variants array required' }, { status: 400 });
    }

    const jersey = await base44.asServiceRole.entities.Jersey.get(jerseyId);
    if (!jersey) {
      return Response.json({ error: 'Jersey not found' }, { status: 404 });
    }

    const baseUrl = secrets.get('MERCHIZE_API_BASE_URL');
    const token = secrets.get('MERCHIZE_ACCESS_TOKEN');

    const results = [];
    for (const variant of variants) {
      const { color_name, combo_name, combo_number } = variant;
      const parts = [jersey.name, color_name, combo_name, combo_number].filter(Boolean);
      const variantLabel = parts.join(' - ');

      const colorObj = (jersey.colors || []).find((c) => c.name === color_name);
      const colorHex = colorObj?.hex || '#000000';

      const attributes = [
        {
          is_preselected: true,
          position: 1,
          type: 'color',
          name: 'Color',
          values: [{ name: color_name || 'Default', value: colorHex }],
        },
        {
          is_preselected: false,
          position: 2,
          type: 'size',
          name: 'Size',
          values: SIZES,
        },
      ];

      const productVariants = SIZES.map((size, i) => ({
        is_default: i === 0,
        sku: '',
        sku_seller: '',
        retail_price: jersey.price,
        currency: 'USD',
        options: [
          { name: color_name || 'Default', value: colorHex },
          { name: size.name, value: size.value },
        ],
      }));

      const payload = {
        title: variantLabel,
        description: jersey.description || '',
        attributes,
        variants: productVariants,
        is_collection_hidden: false,
        is_shop_hidden: false,
        is_stealthy: false,
        is_featured: false,
      };

      try {
        const createRes = await fetch(`${baseUrl}/product/products/dropship/create`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        const createData = await createRes.json();
        if (!createRes.ok || !createData.success || !createData.data?._id) {
          results.push({
            color_name, combo_name, combo_number,
            merchize_product_id: '', variant_ids: {}, skus: {},
            success: false,
            error: createData.msg || createData.error || `HTTP ${createRes.status}`,
          });
          continue;
        }

        const productId = createData.data._id;

        // Fetch all variants for this product to get per-size variant IDs
        let variantIds = {};
        let skus = {};
        try {
          const variantsRes = await fetch(`${baseUrl}/product/products/${productId}/all-variants`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          });
          const variantsData = await variantsRes.json();
          if (variantsData.success && Array.isArray(variantsData.data)) {
            for (const v of variantsData.data) {
              const sizeOption = v.options?.find((o) => o.attribute?.value_type === 'size');
              if (sizeOption) {
                const sizeKey = sizeOption.name.toUpperCase();
                variantIds[sizeKey] = v._id;
                skus[sizeKey] = v.sku || '';
              }
            }
          }
        } catch (err) {
          console.error(`Failed to fetch variants for product ${productId}:`, err.message);
        }

        results.push({
          color_name, combo_name, combo_number,
          merchize_product_id: productId,
          variant_ids: variantIds,
          skus,
          success: true,
        });
      } catch (err) {
        results.push({
          color_name, combo_name, combo_number,
          merchize_product_id: '', variant_ids: {}, skus: {},
          success: false,
          error: err.message,
        });
      }
    }

    return Response.json({ results });
  } catch (error) {
    console.error('create-merchize-products error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}