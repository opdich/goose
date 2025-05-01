import { ChevronUp } from 'lucide-react';

export default function Expand({ size, isExpanded }: { size: number; isExpanded: boolean }) {
  return (
    <ChevronUp
      className={`w-${size} h-${size} transition-all origin-center ${isExpanded ? 'rotate-180' : 'rotate-90'}`}
    />
  );
}
