import { ReservationType, Reserva, Quadra, RecurringType } from '../types';
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

  // Primeiro, adiciona todas as reservas não recorrentes que estão na janela de visualização
  const nonRecurring = baseReservations.filter(r => !r.isRecurring);
  nonRecurring.forEach(r => {
    const rDate = startOfDay(parseDateStringAsLocal(r.date));
    if ((isAfter(rDate, viewStartDate) || isSameDay(rDate, viewStartDate)) && (isBefore(rDate, viewEndDate) || isSameDay(rDate, viewEndDate))) {
      displayReservations.push(r);
    }
  });

  // Em seguida, expande todas as reservas recorrentes
  const recurringMasters = baseReservations.filter(r => r.isRecurring && r.status !== 'cancelada');
  recurringMasters.forEach(master => {
    const masterDate = startOfDay(parseDateStringAsLocal(master.date));
    const quadra = quadras.find(q => q.id === master.quadra_id);
    if (!quadra) return;

    let runningDate = startOfDay(viewStartDate);
    if (isBefore(runningDate, masterDate)) {
      runningDate = masterDate;
    }

    const finalEndDate = master.recurringEndDate ? parseDateStringAsLocal(master.recurringEndDate) : addYears(masterDate, 1);
    const loopEndDate = isBefore(viewEndDate, finalEndDate) ? viewEndDate : finalEndDate;

    while (isBefore(runningDate, loopEndDate) || isSameDay(runningDate, loopEndDate)) {
      const dayOfWeek = getDay(runningDate);
      const diaDaSemanaStr = (['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'] as const)[dayOfWeek];

      let shouldCreate = false;
      if (master.recurringType === 'daily') {
        if (quadra.horarios.diasFuncionamento[diaDaSemanaStr]) {
          shouldCreate = true;
        }
      } else { // weekly or undefined
        if (dayOfWeek === getDay(masterDate)) {
          shouldCreate = true;
        }
      }

      if (shouldCreate) {
        const isOriginal = isSameDay(runningDate, masterDate);
        displayReservations.push({
          ...master,
          id: isOriginal ? master.id : `${master.id}_${format(runningDate, 'yyyy-MM-dd')}`,
          date: format(runningDate, 'yyyy-MM-dd'),
          masterId: isOriginal ? undefined : master.id,
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
