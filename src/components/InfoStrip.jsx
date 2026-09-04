import { MapPin, Lock, Phone } from 'lucide-react';

const COLUMNS = [
  {
    icon: MapPin,
    heading: 'JERSEYS',
    lines: ['Discover the future of Jersey Apparel', 'No minimums'],
  },
  {
    icon: Lock,
    heading: 'TRUSTED PARTNER OF',
    lines: ['Roundnet Canada, Roundnet Illinois, NC State, Seattle', 'And so many more'],
  },
  {
    icon: Phone,
    heading: 'SEND US A MESSAGE',
    lines: ['brock@nemesisround.net', '@Nemesis.Sports.Apparel'],
  },
];

export default function InfoStrip() {
  return (
    <section className="bg-black border-t border-steel">
      <div className="mx-auto max-w-7xl px-5 sm:px-8 py-10 sm:py-16">
        <div className="flex flex-col sm:flex-row sm:items-stretch">
          {COLUMNS.map((col, i) => {
            const Icon = col.icon;
            return (
              <div key={col.heading} className="flex flex-col sm:flex-row sm:flex-1 sm:items-stretch">
                <div className="flex flex-1 flex-col items-center text-center px-6 py-6 sm:py-4">
                  <Icon size={30} className="text-kinetic mb-5" strokeWidth={2} />
                  <h3 className="font-heading text-lg sm:text-xl uppercase tracking-wide text-fog mb-3">
                    {col.heading}
                  </h3>
                  {col.lines.map((line) => (
                    <p key={line} className="text-fog/85 text-sm sm:text-base leading-relaxed max-w-xs">
                      {line}
                    </p>
                  ))}
                </div>
                {i < COLUMNS.length - 1 && (
                  <div className="flex items-center justify-center">
                    <div className="w-px h-16 sm:h-3/4 bg-kinetic" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}