import { Instagram } from 'lucide-react';
import { Image } from '@/components/ui/image';

const LOGO_URL =
  'https://media.base44.com/images/public/6a95dbf0d98672e2f49452f4/39e4667d3_Asset53x.png';
const PATTERN_URL =
  'https://media.base44.com/images/public/6a95dbf0d98672e2f49452f4/8b81f75ac_Asset103x.png';

export default function Footer() {
  return (
    <footer className="relative bg-black flex flex-col items-center text-center px-5 py-10 overflow-hidden">
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `url(${PATTERN_URL}/v1/fit/w_200,h_200,q_80,usm_0.66_1.00_0.01,enc_webp,quality_auto/8b81f75ac_Asset103x.webp)`,
          backgroundSize: '1250%',
          backgroundRepeat: 'repeat',
          opacity: 0.5,
        }}
      />
      <div className="relative z-10 flex flex-col items-center">
      <Image
        src={LOGO_URL}
        alt="Nemesis Apparel"
        className="h-16 w-auto mb-4"
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