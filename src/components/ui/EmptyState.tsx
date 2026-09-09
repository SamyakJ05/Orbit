'use client';

import { motion } from 'framer-motion';
import { Plane } from 'lucide-react';
import { useTravelStore } from '@/stores/useTravelStore';

/**
 * Centered nudge shown only when the signed-in user has never logged a trip.
 * Placed above the globe but below the nav/HUD, and stays out of the way
 * (pointer-events-none) so the globe underneath it is still draggable.
 */
export default function EmptyState() {
  const segments = useTravelStore((state) => state.segments);
  const isLoading = useTravelStore((state) => state.isLoading);

  if (isLoading || segments.length > 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3, ease: 'easeOut' }}
      className="pointer-events-none absolute inset-x-0 bottom-32 z-10 flex justify-center px-4"
    >
      <div className="pointer-events-none flex items-center gap-2.5 rounded-2xl border border-white/10 bg-black/40 px-4 py-2.5 text-sm text-white/70 shadow-2xl backdrop-blur-xl">
        <Plane size={15} className="text-[#00F5D4]" />
        No trips logged yet — use{' '}
        <span className="font-semibold text-white">Add trip</span> to start your recap.
      </div>
    </motion.div>
  );
}
