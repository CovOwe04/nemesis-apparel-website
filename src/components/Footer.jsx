import { Instagram } from 'lucide-react';

const LOGO_URL =
  'https://media.base44.com/images/public/6a95dbf0d98672e2f49452f4/3f9aac29e_Asset53x.png';

export default function Footer() {
  return (
    <footer className="bg-black flex flex-col items-center text-center px-5 py-10">
      <img
        src={LOGO_URL}
        alt="Nemesis Apparel"
        className="h-16 w-auto mb-4"
      />
      <p className="text-fog/90 text-sm mb-5">
        Roundnet Jerseys don't have to be a headache
      </p>
      <a
        href="https://www.instagram.com/Nemesis.Sports.Apparel"
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center justify-center border border-fog/80 px-4 py-2 text-fog hover:bg-fog hover:text-void transition-colors"
        aria-label="Instagram"
      >
        <Instagram size={18} />
      </a>
      <p className="mt-5 text-fog/60 text-xs">
        ©2025 Nemesis Apparel Limited
      </p>
    </footer>
  );
}