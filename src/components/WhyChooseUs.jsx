import { Link } from 'react-router-dom';

const SECTION_IMAGE =
  'https://media.base44.com/images/public/6a95dbf0d98672e2f49452f4/0572af773_240901_ROUNDNET-WORLDS-24_Corentin-Bureau_yellowballcult_92.jpg';

const BLOCKS = [
  {
    heading: 'WHY CHOOSE US',
    body: 'We work with the top players, and create the best looking jerseys in the industry.',
  },
  {
    heading: 'WHAT MAKES US DIFFERENT',
    body: 'Roundnet jerseys, by roundnet players.',
  },
  {
    heading: 'EXPERIENCE OUR PREMIUM SERVICES',
    body: 'No slow responses, no uninspired designs. We walk with you through every step in the process.',
  },
];

export default function WhyChooseUs() {
  return (
    <section className="bg-black">
      <div className="mx-auto max-w-7xl grid lg:grid-cols-2 py-12">
        {/* CONTENT */}
        <div className="flex flex-col justify-center px-6 sm:px-12 lg:px-16 py-14 lg:py-20 order-2 lg:order-1">
          {BLOCKS.map((b) => (
            <div key={b.heading} className="mb-8 last:mb-0">
              <h3 className="font-heading text-2xl sm:text-3xl uppercase tracking-tight text-fog leading-tight">
                {b.heading}
              </h3>
              <p className="mt-3 max-w-md text-fog/85 text-base sm:text-lg leading-relaxed">
                {b.body}
              </p>
            </div>
          ))}

          <p className="mt-2 text-sm text-fog/70 justify-center">Photos by Jacob Narayan</p>

          <div className="mt-8">
            <Link
              to="/arsenal"
              className="btn-solid px-7 py-4 font-heading uppercase"
            >
              Shop now
            </Link>
          </div>
        </div>

        {/* IMAGE */}
        <div className="relative aspect-[4/5] lg:aspect-auto lg:min-h-[640px] overflow-hidden bg-steel rounded-[12px] order-1 lg:order-2">
          <img
            src={SECTION_IMAGE}
            alt="Athletes celebrating in custom Nemesis jerseys"
            className="absolute inset-0 w-full h-full object-cover"
            style={{ objectPosition: '50% 30%' }}
          />
        </div>
      </div>
    </section>
  );
}