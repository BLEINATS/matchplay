import React from 'react';
import { motion } from 'framer-motion';
import { Calendar, MapPin, Clock, Shield, Zap, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout/Layout';
import Button from '../components/Forms/Button';
import { useTheme } from '../context/ThemeContext';

const Home: React.FC = () => {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();

  return (
    <Layout showHeader={false}>
      <div className="relative">
        <div className="absolute top-6 right-6 z-10">
          <Button onClick={() => navigate('/cadastro-arena')} variant="outline">
            Criar minha Arena
          </Button>
        </div>
        <div className="bg-white dark:bg-brand-gray-950">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-24">
            <div className="text-center">
              <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex justify-center mb-6">
                <Calendar className="h-12 w-12 text-brand-blue-500" />
              </motion.div>
              <motion.h1 initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-brand-gray-900 dark:text-white mb-6">
                Gerencie sua arena<br /><span className="text-brand-blue-500">com simplicidade</span>
              </motion.h1>
              <motion.p initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="text-xl text-brand-gray-600 dark:text-brand-gray-400 mb-8 max-w-3xl mx-auto">
                A plataforma completa para donos de arenas gerenciarem quadras e receberem reservas online. Seus clientes reservam, você lucra.
              </motion.p>
              <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button onClick={() => navigate('/cadastro-arena')} size="lg" className="text-lg px-8 py-4">Começar gratuitamente</Button>
                <Button onClick={() => navigate('/arena-beira-rio')} variant="outline" size="lg" className="text-lg px-8 py-4">Ver demo</Button>
              </motion.div>
            </div>
          </div>
        </div>
      </div>

      <div className="py-24 bg-brand-gray-50 dark:bg-brand-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-16">
            <h2 className="text-3xl font-extrabold text-brand-gray-900 dark:text-white mb-4">Tudo que você precisa para gerenciar sua arena</h2>
            <p className="text-xl text-brand-gray-600 dark:text-brand-gray-400 max-w-2xl mx-auto">Uma solução completa que automatiza reservas e facilita o dia a dia do seu negócio.</p>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              { icon: Calendar, title: 'Reservas Online', description: 'Seus clientes fazem reservas 24/7 através de uma interface simples e intuitiva.' },
              { icon: MapPin, title: 'Gestão de Quadras', description: 'Cadastre e gerencie todas as suas quadras em um só lugar com facilidade.' },
              { icon: Clock, title: 'Controle de Horários', description: 'Visualize disponibilidade em tempo real e evite conflitos de agendamento.' },
              { icon: Shield, title: 'Segurança Total', description: 'Seus dados e dos seus clientes protegidos com a máxima segurança.' },
              { icon: Zap, title: 'Setup Rápido', description: 'Sua arena online em minutos. Sem complicações, sem burocracia.' },
              { icon: Users, title: 'Multi-usuário', description: 'Gerencie funcionários e permissões de acesso de forma organizada.' },
            ].map((feature, index) => (
              <motion.div key={index} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: index * 0.1 }} className="text-center p-6">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 dark:bg-brand-blue-500/10 rounded-full mb-4">
                  <feature.icon className="h-8 w-8 text-brand-blue-500" />
                </div>
                <h3 className="text-xl font-semibold text-brand-gray-900 dark:text-white mb-2">{feature.title}</h3>
                <p className="text-brand-gray-600 dark:text-brand-gray-400">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-brand-blue-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center">
            <h2 className="text-3xl font-extrabold text-white mb-4">Pronto para começar?</h2>
            <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">Junte-se a centenas de donos de arena que já usam o MatchPlay para crescer seus negócios.</p>
            <Button onClick={() => navigate('/cadastro-arena')} variant="secondary" size="lg" className="bg-white text-brand-blue-600 hover:bg-brand-gray-100 text-lg px-8 py-4">Criar minha arena grátis</Button>
          </motion.div>
        </div>
      </div>
    </Layout>
  );
};

export default Home;
