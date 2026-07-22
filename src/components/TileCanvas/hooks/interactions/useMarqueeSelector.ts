import { useState } from 'react';

export const useMarqueeSelector = () => {
  const [marqueeStart, setMarqueeStart] = useState<{ x: number; y: number } | null>(null);
  const [marqueeEnd, setMarqueeEnd] = useState<{ x: number; y: number } | null>(null);

  const clearMarquee = () => {
    setMarqueeStart(null);
    setMarqueeEnd(null);
  };

  return {
    marqueeStart,
    setMarqueeStart,
    marqueeEnd,
    setMarqueeEnd,
    clearMarquee,
  };
};
