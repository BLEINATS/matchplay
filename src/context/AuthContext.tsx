import React, { createContext, useContext, useState, useEffect } from 'react';
import { AuthState, User, Profile, Arena } from '../types';

interface AuthContextType extends AuthState {
  signUp: (email: string, password: string, arenaName?: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    profile: null,
    arena: null,
    isLoading: true,
  });

  useEffect(() => {
    // Simular verificação de sessão existente
    const checkSession = () => {
      const savedAuth = localStorage.getItem('matchplay_auth');
      if (savedAuth) {
        const { user, profile, arena } = JSON.parse(savedAuth);
        setAuthState({ user, profile, arena, isLoading: false });
      } else {
        setAuthState(prev => ({ ...prev, isLoading: false }));
      }
    };

    checkSession();
  }, []);

  const signUp = async (email: string, password: string, arenaName?: string) => {
    // Simular processo de cadastro
    const userId = 'user_' + Date.now();
    const arenaId = arenaName ? 'arena_' + Date.now() : '';
    
    const user: User = {
      id: userId,
      email,
      created_at: new Date().toISOString(),
    };

    let arena: Arena | null = null;
    let profile: Profile;

    if (arenaName) {
      // Cadastro de dono de arena
      arena = {
        id: arenaId,
        name: arenaName,
        slug: arenaName.toLowerCase().replace(/\s+/g, '-'),
        created_at: new Date().toISOString(),
      };

      profile = {
        id: 'profile_' + Date.now(),
        user_id: userId,
        arena_id: arenaId,
        role: 'admin_arena',
        created_at: new Date().toISOString(),
      };
    } else {
      // Cadastro de cliente (necessário definir arena_id posteriormente)
      profile = {
        id: 'profile_' + Date.now(),
        user_id: userId,
        arena_id: '', // Será definido na página da arena
        role: 'cliente',
        created_at: new Date().toISOString(),
      };
    }

    const newAuthState = { user, profile, arena, isLoading: false };
    setAuthState(newAuthState);
    localStorage.setItem('matchplay_auth', JSON.stringify(newAuthState));
  };

  const signIn = async (email: string, password: string) => {
    // Simular login - na implementação real, verificaria credenciais
    const savedAuth = localStorage.getItem('matchplay_auth');
    if (savedAuth) {
      const authData = JSON.parse(savedAuth);
      setAuthState(authData);
    } else {
      throw new Error('Credenciais inválidas');
    }
  };

  const signOut = () => {
    localStorage.removeItem('matchplay_auth');
    setAuthState({ user: null, profile: null, arena: null, isLoading: false });
  };

  return (
    <AuthContext.Provider value={{ ...authState, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};
