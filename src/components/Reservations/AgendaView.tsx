import React, { useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { format, parse } from 'date-fns';
import { Quadra, Reserva } from '../../types';
import { getReservationTypeDetails } from '../../utils/reservationUtils';
import { Repeat } from 'lucide-react';
import { parseDateStringAsLocal } from '../../utils/dateUtils';

interface AgendaViewProps {
  quadras: Quadra[];
  reservas: Reserva[];
  selectedDate: Date;
  onSlotDoubleClick: (quadraId: string, time: string) => void;
  onReservationClick: (reserva: Reserva) => void;
}

const AgendaView: React.FC<AgendaViewProps> = ({ quadras, reservas, selectedDate, onSlotDoubleClick, onReservationClick }) => {
  const timeSlots = Array.from({ length: (23 - 6) * 2 + 1 }, (_, i) => {
    const totalMinutes = 6 * 60 + i * 30;
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setMinutes(totalMinutes);
    return format(date, 'HH:mm');
  });

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const am8 = containerRef.current?.querySelector('[data-row-time="08:00"]');
    if (am8) {
      am8.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
  }, []);

  return (
    <div className="bg-white dark:bg-brand-gray-800 rounded-xl shadow-lg border border-brand-gray-200 dark:border-brand-gray-700 overflow-hidden">
      <div ref={containerRef} className="max-h-[70vh] overflow-auto">
        <div 
          className="grid relative" 
          style={{ 
            gridTemplateColumns: `60px repeat(${quadras.length}, minmax(150px, 1fr))`,
            gridTemplateRows: `auto repeat(${timeSlots.length}, 3rem)`
          }}
        >
          {/* Header Row */}
          <div className="sticky top-0 z-20 bg-brand-gray-50 dark:bg-brand-gray-700 p-2 border-b border-r border-brand-gray-200 dark:border-brand-gray-600" style={{ gridColumn: 1, gridRow: 1 }}></div>
          {quadras.map((quadra, quadraIndex) => (
            <div key={quadra.id} className="sticky top-0 z-20 bg-brand-gray-50 dark:bg-brand-gray-700 p-3 text-center border-b border-r border-brand-gray-200 dark:border-brand-gray-600" style={{ gridColumn: quadraIndex + 2, gridRow: 1 }}>
              <p className="font-semibold text-sm text-brand-gray-900 dark:text-white truncate">{quadra.name}</p>
            </div>
          ))}

          {/* Time Column & Background Grid */}
          {timeSlots.map((time, timeIndex) => (
            <React.Fragment key={time}>
              {/* Time Label */}
              <div 
                data-row-time={time}
                className="h-12 flex items-center justify-center border-r border-b border-brand-gray-200 dark:border-brand-gray-700"
                style={{ gridColumn: 1, gridRow: timeIndex + 2 }}
              >
                <span className="text-xs text-brand-gray-500 dark:text-brand-gray-400">{time}</span>
              </div>
              {/* Background slots for each quadra */}
              {quadras.map((quadra, quadraIndex) => (
                <div
                  key={`${quadra.id}-${time}`}
                  onDoubleClick={() => onSlotDoubleClick(quadra.id, time)}
                  className="h-12 border-r border-b border-brand-gray-200 dark:border-brand-gray-700 hover:bg-blue-50 dark:hover:bg-brand-blue-500/10 cursor-pointer"
                  style={{ gridColumn: quadraIndex + 2, gridRow: timeIndex + 2 }}
                />
              ))}
            </React.Fragment>
          ))}

          {/* Reservations Layer */}
          {reservas
            .filter(r => format(parseDateStringAsLocal(r.date), 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd') && r.status !== 'cancelada')
            .map(reserva => {
              const quadraIndex = quadras.findIndex(q => q.id === reserva.quadra_id);
              if (quadraIndex === -1) return null;

              const startTime = parse(reserva.start_time, 'HH:mm', new Date());
              const endTime = parse(reserva.end_time, 'HH:mm', new Date());
              const durationMinutes = (endTime.getTime() - startTime.getTime()) / (1000 * 60);
              
              const startOffsetMinutes = (startTime.getHours() * 60 + startTime.getMinutes()) - (6 * 60);
              const startRowIndex = startOffsetMinutes / 30;
              const rowSpan = Math.max(1, durationMinutes / 30);

              const typeDetails = getReservationTypeDetails(reserva.type);
              const Icon = typeDetails.icon;

              return (
                <motion.div
                  key={reserva.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  onClick={() => onReservationClick(reserva)}
                  className={`p-2 rounded-lg text-white text-xs cursor-pointer shadow-lg z-10 m-0.5 flex flex-col overflow-hidden ${typeDetails.bgColor} bg-opacity-90`}
                  style={{
                    gridColumn: quadraIndex + 2,
                    gridRow: `${Math.floor(startRowIndex) + 2} / span ${rowSpan}`,
                  }}
                >
                  <p className="font-bold flex items-center flex-shrink-0">
                    <Icon className="h-3 w-3 mr-1 flex-shrink-0" />
                    {reserva.isRecurring && <Repeat className="h-3 w-3 mr-1 flex-shrink-0" />}
                    <span className="truncate">{reserva.clientName || 'Cliente'}</span>
                  </p>
                  <p className="flex-shrink-0">{reserva.start_time} - {reserva.end_time}</p>
                  {reserva.notes && <p className="text-xs opacity-80 mt-1 italic truncate">{reserva.notes}</p>}
                </motion.div>
              );
            })
          }
        </div>
      </div>
    </div>
  );
};

export default AgendaView;
