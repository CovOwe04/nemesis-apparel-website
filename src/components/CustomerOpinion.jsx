const SECTION_IMAGE =
  'https://media.base44.com/images/public/6a95dbf0d98672e2f49452f4/679e095f3_240901_ROUNDNET-WORLDS-24_Corentin-Bureau_yellowballcult_66.jpg';

const QUOTES = [
  '“Working with Brock has been the best experience I’ve had with any jersey company. It’s too easy, I’m even getting mashup jerseys through him. He’s a great kid with a lot of love for the sport and the community.”',
  '“Brock surpassed our expectations with his amazing work, incredibly fast turn around time, and consistent communication. He truly turned our dream into reality with ease.”',
  '“I don’t think I will ever get a jersey from anyone besides Nemesis ever again. The process was so easy and affordable. I lived working with Brock because he truly cares about his customers and that comes across in his designs.”',
];

export default function CustomerOpinion() {
  return (
    <section className="bg-void">
      <div className="mx-auto max-w-7xl grid lg:grid-cols-2">
        {/* IMAGE */}
        <div className="relative aspect-[4/5] lg:aspect-auto lg:min-h-[640px] overflow-hidden bg-steel">
          <img
            src={SECTION_IMAGE}
            alt="Team posing in custom Nemesis jerseys"
            className="absolute inset-0 w-full h-full object-cover"
            style={{ objectPosition: '50% 30%' }}
          />
        </div>

        {/* CONTENT */}
        <div className="flex flex-col justify-center px-6 sm:px-12 lg:px-16 py-14 lg:py-20">
          <h2 className="font-heading text-3xl sm:text-4xl lg:text-5xl uppercase leading-[0.95] text-fog">
            Our customers opinion
          </h2>
          <p className="mt-4 max-w-md text-fog/60 text-base sm:text-lg leading-relaxed">
            Find out what people are saying about Nemesis!
          </p>

          <div className="mt-10 space-y-8">
            {QUOTES.map((q) => (
              <blockquote
                key={q}
                className="border-l-2 border-kinetic pl-5 text-fog/85 text-base sm:text-lg leading-relaxed"
              >
                {q}
              </blockquote>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}