'use client';

import * as React from 'react';
import { useLiveAuctionStore } from '../store/useLiveAuctionStore';

export const CountdownTimer = React.memo(() => {
  const { endTime, timeOffset } = useLiveAuctionStore();
  const [timeLeft, setTimeLeft] = React.useState<number>(0);
  
  // Highlight state for Anti-Sniping extension pulse
  const [extendedPulse, setExtendedPulse] = React.useState(false);
  const prevEndTime = React.useRef(endTime);

  React.useEffect(() => {
    if (endTime !== prevEndTime.current) {
      if (prevEndTime.current) {
        setExtendedPulse(true);
        setTimeout(() => setExtendedPulse(false), 2000);
      }
      prevEndTime.current = endTime;
    }
  }, [endTime]);

  React.useEffect(() => {
    if (!endTime) return;

    let animationFrameId: number;
    const target = new Date(endTime).getTime();

    const tick = () => {
      // Offset applied to current browser time gives us the synchronized server time
      const nowSync = Date.now() + timeOffset;
      const remaining = Math.max(0, target - nowSync);
      setTimeLeft(remaining);

      if (remaining > 0) {
        animationFrameId = requestAnimationFrame(tick);
      }
    };

    animationFrameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animationFrameId);
  }, [endTime, timeOffset]);

  if (!endTime) return <div>--:--:--</div>;

  const seconds = Math.floor((timeLeft / 1000) % 60);
  const minutes = Math.floor((timeLeft / (1000 * 60)) % 60);
  const hours = Math.floor((timeLeft / (1000 * 60 * 60)));

  return (
    <div className={`font-mono text-2xl transition-colors duration-500 ${extendedPulse ? 'text-destructive font-bold scale-110' : 'text-primary'}`}>
      {String(hours).padStart(2, '0')}:
      {String(minutes).padStart(2, '0')}:
      {String(seconds).padStart(2, '0')}
    </div>
  );
});

CountdownTimer.displayName = 'CountdownTimer';
