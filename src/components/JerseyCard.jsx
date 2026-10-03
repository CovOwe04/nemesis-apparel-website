import { Link } from 'react-router-dom';
import { Image } from '@/components/ui/image';
import { Plus } from 'lucide-react';
import { useCart } from '@/lib/CartContext';

const CAD_RATE = 1.36;

function formatPrice(priceUsd, currency) {
  const value = currency === 'CAD' ? priceUsd * CAD_RATE : priceUsd;
  const formatted = Number(value).toFixed(2);
  return currency === 'CAD' ? `CA$${formatted}` : `$${formatted}`;
}

function getColors(jersey) {
  if (jersey.colors && jersey.colors.length > 0) return jersey.colors;
  if (jersey.images && jersey.images.length > 0)
    return [{ name: 'Default', hex: '#000000', images: jersey.images.map((img) => ({ url: img.url })) }];
  return [{ name: 'Default', hex: '#000000', images: [{ url: jersey.front_image }] }];
}

export default function JerseyCard({ jersey, currency = 'USD' }) {
  const { addItem } = useCart();
  const colors = getColors(jersey);
  const front = colors[0]?.images?.[0]?.url || jersey.front_image;
  const back = colors[0]?.images?.[1]?.url || front;

  const quickAdd = (e) => {
    e.preventDefault();
    e.stopPropagation();
    addItem({
      jerseyId: jersey.id,
      name: jersey.name,
      team: jersey.team,
      price: jersey.price,
      front_image: front,
      back_image: back,
      colorName: colors[0]?.name || 'Default',
      static_display: jersey.static_display,
      customName: '',
      font: '',
      size: 0,
      curve: 0,
      quantity: 1,
      artwork_front: colors[0]?.artwork_front || jersey.artwork_front || '',
      artwork_back: colors[0]?.artwork_back || jersey.artwork_back || '',
      artwork_sleeve: colors[0]?.artwork_sleeve || jersey.artwork_sleeve || '',
      artwork_hood: colors[0]?.artwork_hood || jersey.artwork_hood || '',
    });
  };

  return (
    <div className="group flex flex-col">
      <div className="relative transition-transform duration-300 group-hover:scale-[1.03]">
        <div className="absolute -inset-1 rounded-[13px] bg-kinetic opacity-0 blur-md transition-opacity duration-300 group-hover:opacity-90 pointer-events-none" />
        <Link
          to={`/lab/${jersey.id}`}
          className={`relative block overflow-hidden rounded-[12px] ${jersey.static_display ? 'aspect-square bg-black' : 'aspect-[3/4] bg-steel'}`}
        >
        <Image
          src={front}
          alt={`${jersey.name} front`}
          fittingType={jersey.static_display ? 'fit' : 'fill'}
          className={`w-full h-full ${jersey.static_display ? '' : 'transition-opacity duration-300 group-hover:opacity-0'}`}
        />
        {!jersey.static_display && back !== front && (
          <Image
            src={back}
            alt={`${jersey.name} back`}
            fittingType="fill"
            className="absolute inset-0 w-full h-full opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          />
        )}
        <div className="absolute top-3 left-3 mono-label text-fog/80 bg-void/60 px-2 py-1">
          {jersey.team}
        </div>
        <div className="absolute top-3 right-3 bg-kinetic text-void font-heading text-sm px-2 py-1 rounded-[6px]">
          {formatPrice(jersey.price, currency)}
        </div>
        </Link>
      </div>
      <div className="flex items-end justify-between gap-3 pt-3">
        <div className="min-w-0 flex-1">
          <h3 className="font-heading text-base text-fog leading-tight truncate">
            {jersey.name}
          </h3>
          {colors.length > 1 && (
            <div className="flex items-center gap-1 mt-1.5">
              {colors.map((c, i) => (
                <span key={i} className="w-3.5 h-3.5 rounded-full border border-steel"
                  style={{ backgroundColor: c.hex || '#000' }}
                  title={c.name || 'Default'} />
              ))}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={quickAdd}
            className="btn-solid p-2"
            aria-label={`Quick add ${jersey.name} to cart`}
            title="Quick add"
          >
            <Plus size={16} />
          </button>
          <Link
            to={`/lab/${jersey.id}`}
            className="btn-solid mono-label px-3 py-2"
          >
            {jersey.enable_customization ? 'ADD NAME' : 'VIEW'}
          </Link>
        </div>
      </div>
    </div>
  );
}