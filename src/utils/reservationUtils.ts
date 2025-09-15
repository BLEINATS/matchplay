import { ReservationType, Reserva, Quadra } from '../types';
import { User, GraduationCap, PartyPopper, Ban, Repeat } from 'lucide-react';
import { format, parse, isAfter, isBefore, isSameDay, getDay, addDays, startOfDay, addYears, endOfDay } from 'date-fns';
import { parseDateStringAsLocal } from './dateUtils';

export const getReservationTypeDetails = (type: ReservationType, isRecurring?: boolean) => {
  const baseDetails = {
    'normal': { label: 'Reserva de Cliente', icon: User, bgColor: 'bg-blue-500', borderColor: 'border-blue-600', publicBgColor: 'bg-blue-100 dark:bg-blue-900/50', publicTextColor: 'text-blue-700 dark:text-blue-400' },
    'aula': { label: 'Aula', icon: GraduationCap, bgColor: 'bg-purple-500', borderColor: 'border-purple-600', publicBgColor: 'bg-purple-100 dark:bg-purple-900/50', publicTextColor: 'text-purple-700 dark:text-purple-400' },
    'evento': { label: 'Evento', icon: PartyPopper, bgColor: 'bg-orange-500', borderColor: 'border-orange-600', publicBgColor: 'bg-orange-100 dark:bg-orange-900/50', publicTextColor: 'text-orange-700 dark:text-orange-400' },
    'bloqueio': { label: 'Bloqueio', icon: Ban, bgColor: 'bg-red-500', borderColor: 'border-red-600', publicBgColor: 'bg-red-100 dark:bg-red-900/50', publicTextColor: 'text-red-700 dark:text-red-400' },
  };

  const details = baseDetails[type] || baseDetails['normal'];

  if (isRecurring) {
    return {
      ...details,
      label: details.label + ' (Fixo)',
      icon: Repeat,
    };
  }

  return details;
};

export const expandRecurringReservations = (
  baseReservations: Reserva[],
  viewStartDate: Date,
  viewEndDate: Date,
  quadras: Quadra[]
): Reserva[] => {
  const displayReservations: Reserva[] = [];

  baseReservations.forEach(reserva => {
    // Case 1: It's a single, non-recurring reservation
    if (!reserva.isRecurring) {
      const rDate = startOfDay(parseDateStringAsLocal(reserva.date));
      // Check if the single reservation falls within the view window
      if (
        (isAfter(rDate, viewStartDate) || isSameDay(rDate, viewStartDate)) &&
        (isBefore(rDate, viewEndDate) || isSameDay(rDate, viewEndDate))
      ) {
        displayReservations.push(reserva);
      }
      return; // Move to the next reservation in the loop
    }

    // Case 2: It's a recurring reservation master. We need to expand it.
    if (reserva.status === 'cancelada') {
      return; // Don't expand cancelled recurring masters
    }

    const masterDate = startOfDay(parseDateStringAsLocal(reserva.date));
    const quadra = quadras.find(q => q.id === reserva.quadra_id);
    if (!quadra) return; // Can't expand if we don't know the quadra's schedule

    // Determine the date to start the expansion loop from.
    // It should be the later of the view start date or the master reservation's start date.
    let runningDate = startOfDay(viewStartDate);
    if (isBefore(runningDate, masterDate)) {
      runningDate = masterDate;
    }

    // Determine the final end date for the recurrence.
    const recurrenceFinalEndDate = reserva.recurringEndDate
      ? parseDateStringAsLocal(reserva.recurringEndDate)
      : addYears(masterDate, 1); // Default to 1 year if no end date

    // The loop should not go beyond the view's end date or the recurrence's own end date.
    const loopEndDate = isBefore(viewEndDate, recurrenceFinalEndDate) ? viewEndDate : recurrenceFinalEndDate;

    while (isBefore(runningDate, loopEndDate) || isSameDay(runningDate, loopEndDate)) {
      const dayOfWeek = getDay(runningDate);
      const diaDaSemanaStr = (['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'] as const)[dayOfWeek];

      let shouldCreateInstance = false;
      if (reserva.recurringType === 'daily') {
        // For daily recurrence, check if the court is open on this day of the week.
        if (quadra.horarios.diasFuncionamento[diaDaSemanaStr]) {
          shouldCreateInstance = true;
        }
      } else { // weekly or undefined (defaults to weekly)
        // For weekly recurrence, check if it's the same day of the week as the master.
        if (dayOfWeek === getDay(masterDate)) {
          shouldCreateInstance = true;
        }
      }

      if (shouldCreateInstance) {
        const isOriginal = isSameDay(runningDate, masterDate);
        displayReservations.push({
          ...reserva,
          // Create a unique ID for virtual instances, but keep the original ID for the master.
          id: isOriginal ? reserva.id : `${reserva.id}_${format(runningDate, 'yyyy-MM-dd')}`,
          date: format(runningDate, 'yyyy-MM-dd'),
          // Link virtual instances back to their master reservation.
          masterId: isOriginal ? undefined : reserva.id,
        });
      }

      runningDate = addDays(runningDate, 1);
    }
  });

  return displayReservations;
};


/**
 * Checks if a single reservation instance conflicts with a list of other reservation instances.
 * This is a pure utility function.
 */
const checkSingleConflict = (reservaToCheck: Reserva, otherExpandedReservations: Reserva[]): boolean => {
  const reservaDate = parseDateStringAsLocal(reservaToCheck.date);
  let startTime = parse(reservaToCheck.start_time, 'HH:mm', reservaDate);
  let endTime = parse(reservaToCheck.end_time, 'HH:mm', reservaDate);
  if (endTime <= startTime) endTime = addDays(endTime, 1);

  for (const existing of otherExpandedReservations) {
    if (existing.quadra_id !== reservaToCheck.quadra_id) continue;
    if (!isSameDay(parseDateStringAsLocal(existing.date), reservaDate)) continue;
    if (existing.status === 'cancelada') continue;

    let existingStartTime = parse(existing.start_time, 'HH:mm', parseDateStringAsLocal(existing.date));
    let existingEndTime = parse(existing.end_time, 'HH:mm', parseDateStringAsLocal(existing.date));
    if (existingEndTime <= existingStartTime) existingEndTime = addDays(existingEndTime, 1);

    // Check for overlap: (StartA < EndB) and (EndA > StartB)
    if (startTime < existingEndTime && endTime > existingStartTime) {
      return true; // Conflict found
    }
  }
  return false;
};

/**
 * Main function to check for time conflicts. It handles single and recurring reservations.
 */
export const hasTimeConflict = (newReserva: Reserva, existingMasterReservas: Reserva[], quadras: Quadra[]): boolean => {
  if (!newReserva.date || !newReserva.start_time || !newReserva.end_time || !newReserva.quadra_id) {
    return false;
  }
  
  // Create a list of master reservations *excluding* the one being edited, if it has an ID.
  const otherMasterReservas = newReserva.id 
    ? existingMasterReservas.filter(r => r.id !== newReserva.id)
    : existingMasterReservas;

  // Case 1: The new reservation is a single, non-recurring event.
  if (!newReserva.isRecurring) {
    const newReservaDate = parseDateStringAsLocal(newReserva.date);
    // We only need to check for conflicts on that specific day.
    const otherExpandedForDay = expandRecurringReservations(otherMasterReservas, startOfDay(newReservaDate), endOfDay(newReservaDate), quadras);
    return checkSingleConflict(newReserva, otherExpandedForDay);
  }

  // Case 2: The new reservation is recurring.
  const newMasterDate = parseDateStringAsLocal(newReserva.date);
  const endDate = newReserva.recurringEndDate ? parseDateStringAsLocal(newReserva.recurringEndDate) : addYears(newMasterDate, 1);
  
  // Expand all *other* reservations for the entire period of the new recurring one.
  const otherExpandedForPeriod = expandRecurringReservations(otherMasterReservas, newMasterDate, endDate, quadras);
  
  // Expand the new reservation itself to get all its future occurrences.
  const newExpanded = expandRecurringReservations([newReserva], newMasterDate, endDate, quadras);

  // Check each new occurrence against all existing ones.
  for (const newOccurrence of newExpanded) {
    if (checkSingleConflict(newOccurrence, otherExpandedForPeriod)) {
      return true; // Conflict found in one of the future occurrences.
    }
  }

  return false;
};
