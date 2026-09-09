'use client';

import { useState, type FormEvent } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Bike, Car, Loader2, Plane, Plus, TrainFront, X } from 'lucide-react';
import LocationSearchInput from './LocationSearchInput';
import { useTravelStore, type LocationNode, type TransportMode } from '@/stores/useTravelStore';
import { cn } from '@/lib/utils';

const MODE_OPTIONS: { value: TransportMode; label: string; icon: React.ReactNode }[] = [
  { value: 'flight', label: 'Flight', icon: <Plane size={14} /> },
  { value: 'train', label: 'Train', icon: <TrainFront size={14} /> },
  { value: 'roadtrip', label: 'Road trip', icon: <Car size={14} /> },
  { value: 'bike', label: 'Bike', icon: <Bike size={14} /> },
];

const PANEL =
  'backdrop-blur-xl bg-black/60 border border-white/10 text-white shadow-2xl rounded-2xl';

/** Local datetime-local input value, e.g. "2025-06-01T09:30". */
function toDatetimeLocal(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
}

export default function AddTripModal() {
  const [isOpen, setIsOpen] = useState(false);
  const addSegment = useTravelStore((state) => state.addSegment);
  const isSaving = useTravelStore((state) => state.isSaving);

  const [mode, setMode] = useState<TransportMode>('flight');
  const [origin, setOrigin] = useState<LocationNode | null>(null);
  const [destination, setDestination] = useState<LocationNode | null>(null);
  const [departure, setDeparture] = useState(() => toDatetimeLocal(new Date()));
  const [arrival, setArrival] = useState('');
  const [carrier, setCarrier] = useState('');
  const [error, setError] = useState<string | null>(null);

  const resetForm = () => {
    setMode('flight');
    setOrigin(null);
    setDestination(null);
    setDeparture(toDatetimeLocal(new Date()));
    setArrival('');
    setCarrier('');
    setError(null);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!origin || !destination) {
      setError('Pick an origin and a destination.');
      return;
    }
    if (origin.lat === destination.lat && origin.lng === destination.lng) {
      setError('Origin and destination are the same place.');
      return;
    }
    if (!arrival) {
      setError('Add an arrival time.');
      return;
    }

    const departureIso = new Date(departure).toISOString();
    const arrivalIso = new Date(arrival).toISOString();

    if (new Date(arrivalIso) <= new Date(departureIso)) {
      setError('Arrival must be after departure.');
      return;
    }

    const { error: saveError } = await addSegment({
      mode,
      origin,
      destination,
      departureTime: departureIso,
      arrivalTime: arrivalIso,
      carrierOrFlightNo: carrier.trim() || undefined,
    });

    if (saveError) {
      setError(saveError);
      return;
    }

    resetForm();
    setIsOpen(false);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="pointer-events-auto flex items-center gap-1.5 rounded-2xl border border-white/10 bg-[#00F5D4]/15 px-3.5 py-2 text-xs font-semibold text-[#00F5D4] shadow-2xl backdrop-blur-xl transition hover:bg-[#00F5D4]/25"
      >
        <Plus size={14} />
        Add trip
      </button>

      <AnimatePresence>
        {isOpen ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="pointer-events-auto fixed inset-0 z-50 grid place-items-center bg-black/60 p-4"
            onClick={() => setIsOpen(false)}
          >
            <motion.form
              initial={{ opacity: 0, y: 16, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.98 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              onClick={(event) => event.stopPropagation()}
              onSubmit={handleSubmit}
              className={cn(PANEL, 'flex max-h-[90vh] w-full max-w-md flex-col gap-4 overflow-y-auto p-6')}
            >
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold">Add a trip</h2>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  aria-label="Close"
                  className="rounded-full p-1 text-white/40 transition hover:bg-white/10 hover:text-white"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {MODE_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setMode(option.value)}
                    className={cn(
                      'flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-medium transition',
                      mode === option.value
                        ? 'border-[#00F5D4]/50 bg-[#00F5D4]/15 text-[#00F5D4]'
                        : 'border-white/10 text-white/55 hover:bg-white/5'
                    )}
                  >
                    {option.icon}
                    {option.label}
                  </button>
                ))}
              </div>

              <LocationSearchInput
                label="From"
                placeholder="Airport code, city, or place"
                value={origin}
                onChange={setOrigin}
              />
              <LocationSearchInput
                label="To"
                placeholder="Airport code, city, or place"
                value={destination}
                onChange={setDestination}
              />

              <div className="grid grid-cols-2 gap-3">
                <label className="flex flex-col gap-1.5 text-xs font-medium text-white/60">
                  Departure
                  <input
                    type="datetime-local"
                    required
                    value={departure}
                    onChange={(event) => setDeparture(event.target.value)}
                    className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none [color-scheme:dark] focus:border-[#00F5D4]/50"
                  />
                </label>
                <label className="flex flex-col gap-1.5 text-xs font-medium text-white/60">
                  Arrival
                  <input
                    type="datetime-local"
                    required
                    value={arrival}
                    onChange={(event) => setArrival(event.target.value)}
                    className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none [color-scheme:dark] focus:border-[#00F5D4]/50"
                  />
                </label>
              </div>

              <label className="flex flex-col gap-1.5 text-xs font-medium text-white/60">
                Carrier / flight no.{' '}
                <span className="font-normal text-white/30">(optional)</span>
                <input
                  type="text"
                  value={carrier}
                  onChange={(event) => setCarrier(event.target.value)}
                  placeholder="e.g. BA 112"
                  className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-[#00F5D4]/50"
                />
              </label>

              {error ? (
                <p className="rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-300">
                  {error}
                </p>
              ) : null}

              <button
                type="submit"
                disabled={isSaving}
                className="mt-1 flex items-center justify-center gap-2 rounded-xl bg-[#00F5D4] px-4 py-2.5 text-sm font-semibold text-[#03121A] transition hover:bg-[#5BFFE6] disabled:opacity-60"
              >
                {isSaving ? <Loader2 className="animate-spin" size={16} /> : null}
                Save trip
              </button>
            </motion.form>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
