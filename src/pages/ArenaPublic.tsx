import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams } from 'react-router-dom';
import { Calendar, Clock, MapPin, DollarSign, User, X, Ban, Wrench, PartyPopper, GraduationCap, Repeat } from 'lucide-react';
import { format, addDays, startOfDay, addMinutes, isSameDay, isPast, parse, getDay, endOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout/Layout';
import Button from '../components/Forms/Button';
import Input from '../components/Forms/Input';
import { Arena, Quadra, Reserva } from '../types';
import { getReservationTypeDetails, expandRecurringReservations } from '../utils/reservationUtils';
import { parseDateStringAsLocal } from '../utils/dateUtils';

const ArenaPublic: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const { user, profile, signUp } = useAuth();
  const isAdmin = profile?.role === 'admin_arena';

  const [arena, setArena] = useState<Arena | null>(null);
  const [quadras, setQuadras] = useState<Quadra[]>([]);
  const [selectedDate, setSelectedDate] = useState(startOfDay(new Date()));
  const [reservas, setReservas] = useState<Reserva[]>([]);
  
  // Modal States
  const [modal, setModal] = useState<'auth' | 'confirmBooking' | 'blockSlot' | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<{ quadra: Quadra; time: string } | null>(null);

  const [loginData, setLoginData] = useState({ email: '', password: '' });

  useEffect(() => {
    // Simulação de fetch de dados da arena
    const mockArena: Arena = { id: 'arena_1', name: 'Arena Beira Rio', slug: slug || '', created_at: new Date().toISOString() };
    setArena(mockArena);
    const savedQuadras = localStorage.getItem(`quadras_${mockArena.id}`);
    if (savedQuadras) setQuadras(JSON.parse(savedQuadras));
    const savedReservas = localStorage.getItem(`reservas_${mockArena.id}`);
    if (savedReservas) setReservas(JSON.parse(savedReservas));
  }, [slug]);

  const displayedReservations = useMemo(() => {
    const viewStartDate = startOfDay(new Date());
    const viewEndDate = endOfDay(addDays(new Date(), 7)); // Expand for the next 7 days
    return expandRecurringReservations(reservas, viewStartDate, viewEndDate, quadras);
  }, [reservas, quadras]);

  const generateTimeSlots = (quadra: Quadra) => {
    const slots = [];
    const dayOfWeek = getDay(selectedDate); // 0 = Dom, 1 = Seg, ...
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const horarioString = isWeekend ? quadra.horarios.horarioFimSemana : quadra.horarios.horarioSemana;

    if (!horarioString) return [];

    const ranges = horarioString.split(',');
    for (const range of ranges) {
      const [startStr, endStr] = range.split('-');
      if (!startStr || !endStr) continue;
      
      let currentTime = parse(startStr.trim(), 'HH:mm', selectedDate);
      const endTime = parse(endStr.trim(), 'HH:mm', selectedDate);

      while (currentTime < endTime) {
        slots.push(format(currentTime, 'HH:mm'));
        currentTime = addMinutes(currentTime, quadra.booking_interval_minutes || 60);
      }
    }
    return slots;
  };

  const getSlotStatus = (time: string, quadraId: string) => {
    const slotDateTime = parse(time, 'HH:mm', selectedDate);

    if (isPast(slotDateTime) && !isSameDay(selectedDate, startOfDay(new Date()))) {
       // Allow viewing past slots on past days, but don't mark as "past"
    } else if (isPast(slotDateTime)) {
      return { status: 'past', data: null };
    }

    const reserva = displayedReservations.find(r => 
      r.quadra_id === quadraId && 
      isSameDay(parseDateStringAsLocal(r.date), selectedDate) && 
      r.start_time === time && 
      r.status !== 'cancelada'
    );
    if (reserva) return { status: 'booked', data: reserva };

    return { status: 'available', data: null };
  };

  const handleSlotClick = (time: string, quadra: Quadra) => {
    setSelectedSlot({ quadra, time });
    const { status, data } = getSlotStatus(time, quadra.id);

    if (isAdmin) {
      if (status === 'available') {
        setModal('blockSlot');
      } else if (status === 'booked' && data?.type === 'bloqueio') {
        if (window.confirm('Deseja desbloquear este horário?')) {
          unblockSlot(data.id);
        }
      } else if (status === 'booked') {
        alert('Este horário já está reservado por um cliente.');
      }
    } else { // Client
      if (status === 'available') {
        if (!user) {
          setModal('auth');
        } else {
          setModal('confirmBooking');
        }
      }
    }
  };

  const handleConfirmBooking = () => {
    if (!user || !selectedSlot || !arena) return;

    const { quadra, time } = selectedSlot;
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    const startTime = parse(time, 'HH:mm', selectedDate);
    const endTime = format(addMinutes(startTime, quadra.booking_interval_minutes || 60), 'HH:mm');

    const newReserva: Reserva = {
      id: 'reserva_' + Date.now(),
      quadra_id: quadra.id,
      profile_id: profile?.id || '',
      arena_id: arena.id,
      date: dateStr,
      start_time: time,
      end_time: endTime,
      status: 'pendente',
      type: 'normal',
      isRecurring: false,
      recurringType: 'weekly',
      created_at: new Date().toISOString(),
    };

    const updatedReservas = [...reservas, newReserva];
    setReservas(updatedReservas);
    localStorage.setItem(`reservas_${arena.id}`, JSON.stringify(updatedReservas));
    setModal(null);
  };
  
  const handleBlockSlot = (type: Reserva['type']) => {
    if (!selectedSlot || !arena) return;
    const { quadra, time } = selectedSlot;
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    const startTime = parse(time, 'HH:mm', selectedDate);
    const endTime = format(addMinutes(startTime, quadra.booking_interval_minutes || 60), 'HH:mm');

    const newBlockedSlot: Reserva = {
      id: 'reserva_' + Date.now(),
      quadra_id: quadra.id,
      arena_id: arena.id,
      date: dateStr,
      start_time: time,
      end_time: endTime,
      type: type,
      status: 'confirmada', // Bloqueios são sempre confirmados
      profile_id: profile?.id || '',
      clientName: type.charAt(0).toUpperCase() + type.slice(1),
      isRecurring: false,
      recurringType: 'weekly',
      created_at: new Date().toISOString(),
    };
    const updatedReservas = [...reservas, newBlockedSlot];
    setReservas(updatedReservas);
    localStorage.setItem(`reservas_${arena.id}`, JSON.stringify(updatedReservas));
    setModal(null);
  };
  
  const unblockSlot = (reservaId: string) => {
    if (!arena) return;
    const updatedReservas = reservas.filter(r => r.id !== reservaId);
    setReservas(updatedReservas);
    localStorage.setItem(`reservas_${arena.id}`, JSON.stringify(updatedReservas));
  };

  const handleClientSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await signUp(loginData.email, loginData.password);
      setModal('confirmBooking');
    } catch (error) {
      alert('Erro ao fazer cadastro. Tente novamente.');
    }
  };

  if (!arena) return <Layout><div className="text-center p-8">Arena não encontrada</div></Layout>;

  const nextDays = Array.from({ length: 7 }, (_, i) => addDays(new Date(), i));

  const renderSlotButton = (quadra: Quadra, time: string) => {
    const { status, data } = getSlotStatus(time, quadra.id);
    let styles = '';
    let icon;
    
    if (status === 'available') {
      styles = 'bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-500/20';
      icon = <Clock className="h-3 w-3 mr-1" />;
    } else if (status === 'past') {
      styles = 'bg-brand-gray-100 text-brand-gray-400 dark:bg-brand-gray-700/50 dark:text-brand-gray-500 cursor-not-allowed';
      icon = <Clock className="h-3 w-3 mr-1" />;
    } else if (status === 'booked' && data) {
      const typeDetails = getReservationTypeDetails(data.type);
      styles = `${typeDetails.publicBgColor} ${typeDetails.publicTextColor} cursor-not-allowed`;
      icon = <typeDetails.icon className="h-3 w-3 mr-1" />;
      if (isAdmin && data.type === 'bloqueio') {
        styles += ' cursor-pointer';
      }
    }

    return (
      <motion.button 
        key={time} 
        whileHover={{ scale: status === 'available' || (isAdmin && data?.type === 'bloqueio') ? 1.05 : 1 }} 
        whileTap={{ scale: status === 'available' || (isAdmin && data?.type === 'bloqueio') ? 0.95 : 1 }} 
        onClick={() => handleSlotClick(time, quadra)} 
        disabled={status === 'past' || (status === 'booked' && !(isAdmin && data?.type === 'bloqueio'))}
        className={`p-3 rounded-lg text-sm font-medium transition-all text-center ${styles}`}
      >
        <div className="flex items-center justify-center">
          {icon}
          {data?.isRecurring && <Repeat className="h-3 w-3 mr-1" />}
          {time}
        </div>
      </motion.button>
    );
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-3xl font-bold text-brand-gray-900 dark:text-white">{arena.name}</h1>
          <div className="flex items-center mt-2 text-brand-gray-600 dark:text-brand-gray-400">
            <MapPin className="h-4 w-4 mr-1" />
            <span>{isAdmin ? 'Visão do Administrador' : 'Reserve sua quadra online'}</span>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mb-8 p-4 bg-white dark:bg-brand-gray-800 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold text-brand-gray-900 dark:text-white mb-4">Escolha a data</h2>
          <div className="flex space-x-2 overflow-x-auto pb-2 -mx-2 px-2">
            {nextDays.map((date, index) => (
              <button key={index} onClick={() => setSelectedDate(startOfDay(date))} className={`flex flex-col items-center p-3 rounded-lg border-2 transition-all min-w-[80px] ${isSameDay(date, selectedDate) ? 'border-brand-blue-500 bg-blue-50 dark:bg-brand-blue-500/10 text-brand-blue-700 dark:text-brand-blue-300' : 'border-brand-gray-200 dark:border-brand-gray-700 hover:border-brand-blue-400 dark:hover:border-brand-blue-500'}`}>
                <span className="text-xs font-medium uppercase">{format(date, 'EEE', { locale: ptBR })}</span>
                <span className="text-lg font-bold">{format(date, 'dd')}</span>
                <span className="text-xs">{format(date, 'MMM', { locale: ptBR })}</span>
              </button>
            ))}
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="space-y-8">
          {quadras.map((quadra) => (
            <div key={quadra.id} className="bg-white dark:bg-brand-gray-800 rounded-lg shadow-lg overflow-hidden">
              <div className="bg-gradient-to-r from-brand-blue-600 to-brand-blue-700 px-6 py-4 text-white">
                <h3 className="text-xl font-semibold">{quadra.name}</h3>
                <div className="flex items-center justify-between mt-2 text-sm">
                  <span className="text-blue-100">{quadra.sport_type}</span>
                  <div className="flex items-center"><DollarSign className="h-4 w-4 mr-1" /><span className="font-semibold">R$ {quadra.price_per_hour.toFixed(2)}/hora</span></div>
                </div>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
                  {generateTimeSlots(quadra).map(time => renderSlotButton(quadra, time))}
                </div>
              </div>
            </div>
          ))}
        </motion.div>

        <AnimatePresence>
          {modal && (
            <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50" onClick={() => setModal(null)}>
              <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="bg-white dark:bg-brand-gray-900 rounded-lg p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
                {modal === 'auth' && (
                  <>
                    <h3 className="text-xl font-semibold text-brand-gray-900 dark:text-white mb-4">Faça seu cadastro para reservar</h3>
                    <form onSubmit={handleClientSignup} className="space-y-4">
                      <Input label="E-mail" type="email" value={loginData.email} onChange={(e) => setLoginData(prev => ({ ...prev, email: e.target.value }))} required />
                      <Input label="Senha" type="password" value={loginData.password} onChange={(e) => setLoginData(prev => ({ ...prev, password: e.target.value }))} required />
                      <div className="flex space-x-3 pt-2">
                        <Button type="submit" className="flex-1"><User className="h-4 w-4 mr-2" />Cadastrar e Reservar</Button>
                        <Button type="button" variant="outline" onClick={() => setModal(null)}>Cancelar</Button>
                      </div>
                    </form>
                  </>
                )}
                {modal === 'confirmBooking' && selectedSlot && (
                  <>
                    <h3 className="text-xl font-semibold text-brand-gray-900 dark:text-white mb-2">Confirmar Reserva</h3>
                    <p className="text-brand-gray-600 dark:text-brand-gray-400 mb-4">Você está prestes a reservar a quadra <strong className="text-brand-gray-800 dark:text-brand-gray-200">{selectedSlot.quadra.name}</strong>.</p>
                    <div className="space-y-2 text-sm bg-brand-gray-50 dark:bg-brand-gray-800 p-4 rounded-lg mb-6">
                      <p><strong>Data:</strong> {format(selectedDate, 'dd/MM/yyyy')}</p>
                      <p><strong>Horário:</strong> {selectedSlot.time}</p>
                      <p><strong>Valor:</strong> R$ {selectedSlot.quadra.price_per_hour.toFixed(2)}</p>
                    </div>
                    <div className="flex space-x-3">
                      <Button onClick={handleConfirmBooking} className="flex-1">Confirmar</Button>
                      <Button variant="outline" onClick={() => setModal(null)}>Cancelar</Button>
                    </div>
                  </>
                )}
                {modal === 'blockSlot' && selectedSlot && (
                  <>
                    <h3 className="text-xl font-semibold text-brand-gray-900 dark:text-white mb-4">Criar Agendamento</h3>
                    <p className="text-brand-gray-600 dark:text-brand-gray-400 mb-6">Selecione o tipo de agendamento para o horário das <strong className="text-brand-gray-800 dark:text-brand-gray-200">{selectedSlot.time}</strong> na quadra <strong className="text-brand-gray-800 dark:text-brand-gray-200">{selectedSlot.quadra.name}</strong>.</p>
                    <div className="space-y-3">
                       <Button onClick={() => handleBlockSlot('aula')} className="w-full justify-start"><GraduationCap className="h-4 w-4 mr-2" />Aula</Button>
                       <Button onClick={() => handleBlockSlot('evento')} className="w-full justify-start"><PartyPopper className="h-4 w-4 mr-2" />Evento</Button>
                       <Button onClick={() => handleBlockSlot('bloqueio')} className="w-full justify-start"><Ban className="h-4 w-4 mr-2" />Bloqueio (Manutenção/Pessoal)</Button>
                    </div>
                    <div className="mt-6 text-right">
                       <Button variant="outline" onClick={() => setModal(null)}>Cancelar</Button>
                    </div>
                  </>
                )}
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </Layout>
  );
};

export default ArenaPublic;
