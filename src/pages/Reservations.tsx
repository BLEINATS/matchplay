import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { LayoutGrid, Calendar, List, Plus, SlidersHorizontal, ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout/Layout';
import Button from '../components/Forms/Button';
import Input from '../components/Forms/Input';
import { Quadra, Reserva } from '../types';
import AgendaView from '../components/Reservations/AgendaView';
import ListView from '../components/Reservations/ListView';
import CalendarView from '../components/Reservations/CalendarView';
import ReservationModal from '../components/Reservations/ReservationModal';
import ReservationLegend from '../components/Reservations/ReservationLegend';
import { startOfDay, format, startOfMonth, endOfMonth, isBefore, subMinutes, parse, endOfDay, isSameMonth, isSameDay, isEqual } from 'date-fns';
import { expandRecurringReservations, hasTimeConflict } from '../utils/reservationUtils';
import { parseDateStringAsLocal } from '../utils/dateUtils';

type ViewMode = 'agenda' | 'calendar' | 'list';

const Reservations: React.FC = () => {
  const { arena } = useAuth();
  const [quadras, setQuadras] = useState<Quadra[]>([]);
  const [reservas, setReservas] = useState<Reserva[]>([]); // Apenas as reservas "master"
  const [viewMode, setViewMode] = useState<ViewMode>('agenda');
  const [selectedDate, setSelectedDate] = useState(startOfDay(new Date()));
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedReservation, setSelectedReservation] = useState<Reserva | null>(null);
  const [newReservationSlot, setNewReservationSlot] = useState<{ quadraId: string, time: string } | null>(null);
  const [selectedQuadraId, setSelectedQuadraId] = useState<'all' | string>('all');

  useEffect(() => {
    if (arena) {
      const savedQuadras = localStorage.getItem(`quadras_${arena.id}`);
      if (savedQuadras) setQuadras(JSON.parse(savedQuadras));
      const savedReservas = localStorage.getItem(`reservas_${arena.id}`);
      if (savedReservas) setReservas(JSON.parse(savedReservas));
    }
  }, [arena]);

  const displayedReservations = useMemo(() => {
    const viewStartDate = startOfMonth(selectedDate);
    const viewEndDate = endOfMonth(selectedDate);
    const allExpanded = expandRecurringReservations(reservas, viewStartDate, viewEndDate, quadras);

    if (selectedQuadraId === 'all') {
      return allExpanded;
    }
    return allExpanded.filter(r => r.quadra_id === selectedQuadraId);
  }, [reservas, selectedDate, selectedQuadraId, quadras]);

  const filteredQuadras = useMemo(() => {
    if (selectedQuadraId === 'all') return quadras;
    return quadras.filter(q => q.id === selectedQuadraId);
  }, [quadras, selectedQuadraId]);


  const handleSaveReservation = (reserva: Reserva) => {
    if (!arena) return;

    // Validação de horário de fim vs início
    const startTime = parse(reserva.start_time, 'HH:mm', new Date());
    const endTime = parse(reserva.end_time, 'HH:mm', new Date());

    if (isBefore(endTime, startTime) || isEqual(endTime, startTime)) {
      alert("O horário de fim não pode ser anterior ou igual ao horário de início.");
      return;
    }

    // Validação de horário passado
    const now = new Date();
    const reservationDate = parseDateStringAsLocal(reserva.date);
    const reservationStartDateTime = parse(reserva.start_time, 'HH:mm', reservationDate);
    
    // Allow editing past reservations, but not creating new ones in the past
    if (!reserva.id && isBefore(reservationStartDateTime, subMinutes(now, 1))) {
      alert("Não é possível criar uma reserva em um horário que já passou.");
      return;
    }

    // Validação de conflito
    if (hasTimeConflict(reserva, reservas, quadras)) {
      alert("Este horário conflita com outra reserva existente (ou uma de suas futuras ocorrências).");
      return;
    }

    const isEditing = !!reservas.find(r => r.id === reserva.id);
    const updatedReservas = isEditing
      ? reservas.map(r => r.id === reserva.id ? reserva : r)
      : [...reservas, reserva];
    
    setReservas(updatedReservas);
    localStorage.setItem(`reservas_${arena.id}`, JSON.stringify(updatedReservas));
    alert(`Reserva ${isEditing ? 'atualizada' : 'criada'} com sucesso!`);
    closeModal();
  };

  const handleCancelReservation = (reservaId: string) => {
    if (!arena) return;
    const updatedReservas = reservas.map(r => r.id === reservaId ? { ...r, status: 'cancelada' } : r);
    setReservas(updatedReservas);
    localStorage.setItem(`reservas_${arena.id}`, JSON.stringify(updatedReservas));
    alert("Reserva cancelada.");
    closeModal();
  };

  const openNewReservationModal = (quadraId: string, time: string) => {
    setNewReservationSlot({ quadraId, time });
    setSelectedReservation(null);
    setIsModalOpen(true);
  };
  
  const openNewReservationOnDay = (date: Date, time?: string) => {
    setSelectedDate(date);
    setNewReservationSlot({ quadraId: selectedQuadraId !== 'all' ? selectedQuadraId : '', time: time || '' });
    setSelectedReservation(null);
    setIsModalOpen(true);
  };

  const openEditReservationModal = (reserva: Reserva) => {
    // Se for uma instância virtual, abra o mestre para edição
    if (reserva.masterId) {
      const master = reservas.find(r => r.id === reserva.masterId);
      setSelectedReservation(master || null);
    } else {
      setSelectedReservation(reserva);
    }
    setNewReservationSlot(null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedReservation(null);
    setNewReservationSlot(null);
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = parseDateStringAsLocal(e.target.value);
    if (!isNaN(newDate.getTime())) {
        setSelectedDate(newDate);
    }
  };

  const renderView = () => {
    switch (viewMode) {
      case 'agenda':
        return <AgendaView quadras={filteredQuadras} reservas={displayedReservations} selectedDate={selectedDate} onSlotDoubleClick={openNewReservationModal} onReservationClick={openEditReservationModal} />;
      case 'calendar':
        return <CalendarView quadras={quadras} reservas={displayedReservations} onReservationClick={openEditReservationModal} selectedDate={selectedDate} onDateChange={setSelectedDate} onDayDoubleClick={openNewReservationOnDay} onSlotClick={openNewReservationOnDay} />;
      case 'list':
        return <ListView quadras={quadras} reservas={displayedReservations} onReservationClick={openEditReservationModal} />;
      default:
        return null;
    }
  };

  return (
    <Layout>
      <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <Link 
            to="/dashboard" 
            className="inline-flex items-center text-sm font-medium text-brand-gray-600 dark:text-brand-gray-400 hover:text-brand-blue-500 dark:hover:text-brand-blue-400 transition-colors mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar para o Dashboard
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-brand-gray-900 dark:text-white">Hub de Reservas</h1>
            <p className="text-brand-gray-600 dark:text-brand-gray-400 mt-2">Visualize e gerencie todas as suas reservas em um só lugar.</p>
          </div>
        </div>

        <div className="bg-white dark:bg-brand-gray-800 rounded-xl shadow-lg p-4 mb-8 border border-brand-gray-200 dark:border-brand-gray-700">
          <div className="flex flex-col sm:flex-row justify-between items-center flex-wrap gap-4">
            <div className="flex items-center space-x-1 bg-brand-gray-100 dark:bg-brand-gray-900 p-1 rounded-lg">
              {(['agenda', 'calendar', 'list'] as ViewMode[]).map(mode => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center ${
                    viewMode === mode ? 'bg-white dark:bg-brand-gray-700 text-brand-blue-600 dark:text-white shadow' : 'text-brand-gray-600 dark:text-brand-gray-300 hover:bg-white/50 dark:hover:bg-brand-gray-700/50'
                  }`}
                >
                  {mode === 'agenda' && <LayoutGrid className="h-4 w-4 inline-block sm:mr-1" />}
                  {mode === 'calendar' && <Calendar className="h-4 w-4 inline-block sm:mr-1" />}
                  {mode === 'list' && <List className="h-4 w-4 inline-block sm:mr-1" />}
                  <span className="capitalize hidden sm:inline-block">{mode}</span>
                </button>
              ))}
            </div>
            <div className="flex items-center flex-wrap justify-center gap-4">
              <select
                value={selectedQuadraId}
                onChange={(e) => setSelectedQuadraId(e.target.value)}
                className="form-select text-sm rounded-md border-brand-gray-300 dark:border-brand-gray-600 bg-white dark:bg-brand-gray-800 text-brand-gray-900 dark:text-white focus:border-brand-blue-500 focus:ring-brand-blue-500 py-1.5"
              >
                <option value="all">Todas as Quadras</option>
                {quadras.map(q => <option key={q.id} value={q.id}>{q.name}</option>)}
              </select>
              <Input
                type="date"
                value={format(selectedDate, 'yyyy-MM-dd')}
                onChange={handleDateChange}
                className="py-1.5"
              />
              <Button variant="outline"><SlidersHorizontal className="h-4 w-4 sm:mr-2" /> <span className="hidden sm:inline">Filtros</span></Button>
              <Button onClick={() => openNewReservationModal(selectedQuadraId !== 'all' ? selectedQuadraId : '', '')}><Plus className="h-4 w-4 sm:mr-2" /> <span className="hidden sm:inline">Nova Reserva</span></Button>
            </div>
          </div>
        </div>
        
        <ReservationLegend />

        <AnimatePresence mode="wait">
          <motion.div
            key={viewMode}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            {renderView()}
          </motion.div>
        </AnimatePresence>
      </div>
      
      <AnimatePresence>
        {isModalOpen && (
          <ReservationModal
            isOpen={isModalOpen}
            onClose={closeModal}
            onSave={handleSaveReservation}
            onCancelReservation={handleCancelReservation}
            reservation={selectedReservation}
            newReservationSlot={newReservationSlot}
            quadras={quadras}
            arenaId={arena?.id || ''}
            selectedDate={selectedDate}
          />
        )}
      </AnimatePresence>
    </Layout>
  );
};

export default Reservations;
