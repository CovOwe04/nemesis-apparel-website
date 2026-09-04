import { Link } from 'react-router-dom';
import { Image } from '@/components/ui/image';
import { Plus } from 'lucide-react';
import { useCart } from '@/lib/CartContext';

const CAD_RATE = 1.36;

function formatPrice(priceUsd, currency) {
  const value = currency === 'CAD' ? Math.round(priceUsd * CAD_RATE) : priceUsd;
  return currency === 'CAD' ? `CA$${value}` : `$${value}`;
}

export default function JerseyCard({ jersey, currency = 'USD' }) {
  const { addItem } = useCart();

  const quickAdd = (e) => {
    e.preventDefault();
    e.stopPropagation();
    addItem({
      jerseyId: jersey.id,
      name: jersey.name,
      team: jersey.team,
      price: jersey.price,
      front_image: jersey.front_image,
      back_image: jersey.back_image,
      customName: '',
      font: '',
      size: 0,
      curve: 0,
      quantity: 1,
    });
  };

  return (
    <div className="group flex flex-col">
      <Link
        to={`/lab/${jersey.id}`}
        className="relative block aspect-[3/4] overflow-hidden bg-steel rounded-[12px]"
      >
        <Image
          src={jersey.front_image}
          alt={`${jersey.name} front`}
          fittingType="fill"
          className="w-full h-full transition-opacity duration-300 group-hover:opacity-0"
        />
        <Image
          src={jersey.back_image}
          alt={`${jersey.name} back`}
          fittingType="fill"
          className="absolute inset-0 w-full h-full opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        />
        <div className="absolute top-3 left-3 mono-label text-fog/80 bg-void/60 px-2 py-1">
          {jersey.team}
        </div>
        <div className="absolute top-3 right-3 bg-kinetic text-void font-heading text-sm px-2 py-1 rounded-[6px]">
          {formatPrice(jersey.price, currency)}
        </div>
      </Link>
      <div className="flex items-end justify-between gap-3 pt-3">
        <div className="min-w-0">
          <h3 className="font-heading text-base text-fog leading-tight truncate">
            {jersey.name}
          </h3>
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