const PinIcon = (props) => (
  <svg viewBox="0 0 24 24" width="30" height="30" fill="currentColor" {...props}>
    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
  </svg>
);

const LockIcon = (props) => (
  <svg viewBox="0 0 24 24" width="30" height="30" fill="currentColor" {...props}>
    <path d="M7 10V8a5 5 0 0 1 10 0v2h2a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1h2zm0 2v8h10v-8H7z" />
  </svg>
);

const PhoneIcon = (props) => (
  <svg viewBox="0 0 24 24" width="30" height="30" fill="currentColor" {...props}>
    <path d="M6.62 10.79a15.05 15.05 0 0 0 6.59 6.59l2.2-2.2a1 1 0 0 1 1.02-.24 11.36 11.36 0 0 0 3.57.57 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1 11.36 11.36 0 0 0 .57 3.57 1 1 0 0 1-.24 1.02l-2.2 2.2z" />
  </svg>
);

const COLUMNS = [
  {
    icon: PinIcon,
    heading: 'JERSEYS',
    lines: ['Discover the future of Jersey Apparel', 'No minimums'],
  },
  {
    icon: LockIcon,
    heading: 'TRUSTED PARTNER OF',
    lines: ['Roundnet Canada, Roundnet Illinois, NC State, Seattle', 'And so many more'],
  },
  {
    icon: PhoneIcon,
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
                  <Icon className="text-kinetic mb-5" />
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