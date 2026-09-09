import { Instagram } from 'lucide-react';

const LOGO_URL =
  'https://media.base44.com/images/public/6a95dbf0d98672e2f49452f4/39e4667d3_Asset53x.png';

const BG_PATTERN_URL =
  'https://media.base44.com/images/public/6a95dbf0d98672e2f49452f4/e640f258a_Cropped-Asset103x.png';

export default function Footer() {
  return (
    <footer className="relative bg-black flex flex-col items-center text-center px-5 py-10 overflow-hidden">
      {/* Cropped background at 100% size */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `url(${BG_PATTERN_URL})`,
          backgroundSize: '100%',
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'top left',
          opacity: 0.5,
        }}
      />
      <div className="relative z-10 flex flex-col items-center">
        <img
          src={LOGO_URL}
          alt="Nemesis Apparel"
          width={120}
          height={64}
          className="h-16 w-auto mb-4"
          loading="eager"
          decoding="async"
          fetchpriority="high"
        />
        <p className="text-fog/90 text-sm mb-5">
          Jerseys don't have to be a headache
        </p>
        <a
          href="https://www.instagram.com/Nemesis.Sports.Apparel"
          target="_blank"
          rel="noreferrer"
          className="btn-solid px-10 py-2"
          aria-label="Instagram"
        >
          <Instagram size={18} />
        </a>
        <p className="mt-5 text-fog/60 text-xs">
          ©2025 Nemesis Apparel Limited
        </p>
      </div>
    </footer>
  );
}