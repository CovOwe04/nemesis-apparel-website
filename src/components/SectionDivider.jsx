const TOP_URL =
  'https://media.base44.com/images/public/6a95dbf0d98672e2f49452f4/d703d6821_Top3x.png';
const BOTTOM_URL =
  'https://media.base44.com/images/public/6a95dbf0d98672e2f49452f4/fd737baaf_Bottom3x.png';

export default function SectionDivider({ variant = 'top' }) {
  const url = variant === 'top' ? TOP_URL : BOTTOM_URL;
  return (
    <div className="bg-void w-full leading-[0]">
      <img src={url} alt="" className="w-full h-8 object-contain object-center block" />
    </div>
  );
}