import { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Search, X, Loader2, Package, Check } from 'lucide-react';

const SIZE_ORDER = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', '5XL'];

function normalizeSize(s) {
  const upper = (s || '').toUpperCase().trim();
  return upper === 'DEFAULT' ? 'One Size' : upper;
}

export default function MerchizeCatalogPicker({ onSelect, onClose }) {
  const [search, setSearch] = useState('');
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [selectedId, setSelectedId] = useState(null);

  const fetchCatalog = useCallback(async (searchTerm, pageNum) => {
    setLoading(true);
    try {
      const res = await base44.functions.invoke('get-merchize-catalog', {
        search: searchTerm,
        page: pageNum,
      });
      if (res.data?.products) {
        if (pageNum === 1) setProducts(res.data.products);
        else setProducts((prev) => [...prev, ...res.data.products]);
        setHasMore(res.data.hasMore);
        setTotal(res.data.total);
      }
    } catch (err) {
      console.error('Catalog fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => fetchCatalog(search, 1), search ? 400 : 0);
    return () => clearTimeout(timer);
  }, [search, fetchCatalog]);

  const handleSelect = (product) => {
    const sizeMap = {};
    for (const v of product.variants) {
      const size = normalizeSize(v.size);
      if (SIZE_ORDER.includes(size) && !sizeMap[size]) {
        sizeMap[size] = v.sku;
      }
    }
    onSelect({
      merchize_product_id: product.id,
      merchize_variants: sizeMap,
      productTitle: product.title,
    });
    setSelectedId(product.id);
    setTimeout(() => onClose(), 300);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={onClose}>
      <div
        className="bg-void border border-steel rounded-[6px] w-full max-w-3xl max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-steel">
          <div>
            <div className="mono-label text-kinetic">MERCHIZE CATALOG</div>
            <div className="text-fog/40 text-xs mt-0.5">{total} products available</div>
          </div>
          <button onClick={onClose} className="text-fog/50 hover:text-kinetic transition-colors p-1">
            <X size={20} />
          </button>
        </div>

        {/* Search */}
        <div className="px-5 py-3 border-b border-steel">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-fog/40" />
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search by SKU or product name…"
              className="w-full bg-white text-black border border-steel rounded-[6px] pl-10 pr-4 py-2.5 text-sm placeholder:text-black/40 focus:border-kinetic outline-none"
              autoFocus
            />
          </div>
        </div>

        {/* Product list */}
        <div className="flex-1 overflow-y-auto px-5 py-3 space-y-2">
          {loading && products.length === 0 && (
            <div className="flex items-center justify-center py-12 text-fog/40">
              <Loader2 size={24} className="animate-spin" />
            </div>
          )}
          {!loading && products.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-fog/40">
              <Package size={32} className="mb-2" />
              <p className="mono-label">No products found</p>
            </div>
          )}
          {products.map((product) => (
            <button
              key={product.id}
              onClick={() => handleSelect(product)}
              className={`w-full text-left border rounded-[6px] p-3 transition-colors ${
                selectedId === product.id
                  ? 'border-kinetic bg-kinetic/10'
                  : 'border-steel hover:border-fog/30'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="font-heading text-sm text-fog uppercase truncate">{product.title}</div>
                  <div className="mono-label text-fog/40 mt-1">
                    SKU: {product.sku} · {product.fulfillment_location}
                    {product.printing_methods?.length > 0 && ` · ${product.printing_methods.join(', ')}`}
                  </div>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {product.variants.slice(0, 12).map((v) => (
                      <span
                        key={v.id}
                        className="mono-label text-[0.6rem] px-1.5 py-0.5 bg-steel/40 border border-steel rounded-[3px] text-fog/60"
                      >
                        {normalizeSize(v.size)}
                      </span>
                    ))}
                    {product.variants.length > 12 && (
                      <span className="mono-label text-[0.6rem] px-1.5 py-0.5 text-fog/40">
                        +{product.variants.length - 12} more
                      </span>
                    )}
                  </div>
                </div>
                {selectedId === product.id && (
                  <Check size={18} className="text-kinetic shrink-0 mt-1" />
                )}
              </div>
            </button>
          ))}
          {hasMore && !loading && (
            <button
              onClick={() => { setPage((p) => p + 1); fetchCatalog(search, page + 1); }}
              className="w-full mono-label text-fog/50 hover:text-kinetic transition-colors py-3 border border-steel rounded-[6px]"
            >
              LOAD MORE
            </button>
          )}
          {loading && products.length > 0 && (
            <div className="flex items-center justify-center py-3 text-fog/40">
              <Loader2 size={18} className="animate-spin" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}