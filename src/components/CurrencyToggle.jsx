import { getCurrency, setCurrency } from '@/lib/currency';

const OPTIONS = ['USD', 'CAD'];

// Compact USD/CAD switcher for pages other than the Arsenal. The choice is
// persisted through the shared currency helper so every page agrees on it.
export default function CurrencyToggle({ value, onChange, className = '' }) {
  const currency = value || getCurrency();

  const select = (next) => {
    if (next === currency) return;
    setCurrency(next);
    onChange?.(next);
  };

  return (
    <div className={`inline-flex items-center border border-steel rounded-[4px] overflow-hidden ${className}`}>
      {OPTIONS.map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => select(option)}
          aria-pressed={currency === option}
          aria-label={`Show prices in ${option}`}
          className={`mono-label px-2 py-1 text-[0.6rem] transition-colors ${
            currency === option ? 'bg-kinetic text-white' : 'text-fog/50 hover:text-fog'
          }`}
        >
          {option}
        </button>
      ))}
    </div>
  );
}