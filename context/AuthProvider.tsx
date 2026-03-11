'use client';

import {
  createContext,
  ReactNode,
  useState,
  useEffect,
  useContext,
} from 'react';
import { Spinner } from '@/components/custom/Spinner';
import { createClient } from '@/config/client';
import { User } from '@supabase/supabase-js';
import { useAuth } from '@/services/auth/states/auth-state';
import { useShallow } from 'zustand/shallow';
import { UserForm } from '@/lib/types/users';

interface Users extends User {
  userRole: string;
}

interface UserType {
  user: Users;
}

interface AuthProviderType {
  children: ReactNode;
}

export const AUTHCONTEXT = createContext<UserType | null>(null);

export function AuthProvider({ children }: AuthProviderType) {
  const [user, setUser] = useState<Users | null>(null);
  const [mount, setMount] = useState<boolean>(true);
  const { setUserInfo } = useAuth(
    useShallow((state) => ({ setUserInfo: state.setUserInfo })),
  );

  const supabase = createClient();

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setMount(true);
      setUser((session?.user as Users) ?? null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase, setMount]);

  useEffect(() => {
    const loadSession = async (): Promise<void> => {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      const { data, error: userError } = await supabase
        .from('profiles')
        .select(
          'role, id, email, first_name, last_name, middle_name, avatar_url, address',
        )
        .eq('id', session?.user.id)
        .single();

      if (userError) {
        throw userError.message;
      }

      if (error) {
        throw error.message;
      }

      setUser({ ...session?.user, userRole: data.role } as Users);
      setUserInfo({ ...data } as UserForm);
      setMount(false);
    };

    if (mount) {
      loadSession();
    }
  }, [supabase, mount, setMount]);

  if (!user?.userRole) {
    return (
      <div className="flex h-[85vh] items-center justify-center">
        <Spinner />
      </div>
    );
  }

  return (
    <AUTHCONTEXT.Provider value={{ user: user as Users }}>
      {children}
    </AUTHCONTEXT.Provider>
  );
}

export const useUser = () => {
  const context = useContext(AUTHCONTEXT);

  if (context === undefined) {
    throw new Error('useUser must be used within a AuthProvider');
  }

  return context;
};
