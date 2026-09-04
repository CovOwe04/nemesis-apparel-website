import { Link } from 'react-router-dom';

const SECTION_IMAGE =
  'https://media.base44.com/images/public/6a95dbf0d98672e2f49452f4/1f6359d8f_240901_ROUNDNET-WORLDS-24_Corentin-Bureau_yellowballcult_1106.jpg';

export default function WeGetItDone() {
  return (
    <section className="bg-black">
      <div className="mx-auto max-w-7xl grid lg:grid-cols-2">
        {/* IMAGE */}
        <div className="relative aspect-[4/5] lg:aspect-auto lg:min-h-[640px] overflow-hidden bg-steel">
          <img
            src={SECTION_IMAGE}
            alt="Athlete wearing a custom Nemesis jersey"
            className="absolute inset-0 w-full h-full object-cover"
            style={{ objectPosition: '50% 30%' }}
          />
        </div>

        {/* CONTENT */}
        <div className="flex flex-col justify-center px-6 sm:px-12 lg:px-16 py-14 lg:py-20">
          <h2 className="font-heading text-3xl sm:text-4xl lg:text-5xl uppercase leading-[0.95] text-fog">
            We get it done right
          </h2>
          <p className="mt-6 max-w-md text-fog/80 text-base sm:text-lg leading-relaxed">
            Every jersey begins with dreaming up your needs as a team or club, it does not matter
            if you are a team of two, or a club of hundreds. We got you covered with outstanding
            designs.
          </p>

          <div className="mt-10 flex flex-wrap gap-10 sm:gap-14">
            <div>
              <div className="font-heading text-4xl sm:text-5xl text-kinetic leading-none">10+</div>
              <div className="mono-label text-fog mt-2">YEARS DESIGN EXPERIENCE</div>
            </div>
            <div>
              <div className="font-heading text-4xl sm:text-5xl text-kinetic leading-none">600+</div>
              <div className="mono-label text-fog mt-2">SATISFIED CUSTOMERS</div>
            </div>
          </div>

          <div className="mt-10">
            <Link
              to="/design-lab"
              className="inline-flex items-center border border-fog px-7 py-4 font-heading uppercase text-fog hover:bg-fog hover:text-void transition-colors"
            >
              Create your own
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}