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
  /**
   * Whether this subtree needs a signed-in user with a role before it renders.
   *
   * Defaults to true, which is the admin and `/user` areas: there, a visitor with no session gets
   * the spinner rather than a shell whose every request will 401.
   *
   * The customer area passes false. Its entry screen is the shared counter tablet, and that screen's
   * whole job is to sign an anonymous customer in and open their cart - so it has to render for
   * exactly the visitor who has no session yet. Gating it on a role meant `Start shopping` could
   * never be reached: the page below it was never mounted to be clicked.
   */
  requireUser?: boolean;
}

export const AUTHCONTEXT = createContext<UserType | null>(null);

export function AuthProvider({
  children,
  requireUser = true,
}: AuthProviderType) {
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

      // No session is an answer, not a failure. It used to fall through to the profile query with
      // `session?.user.id` undefined, which asks for `profiles?id=eq.undefined` -> 400 -> a throw
      // from inside this async effect. Nothing caught it, so `setMount(false)` below never ran and
      // the spinner never stopped: a signed-out visitor to the tablet saw a blank page forever.
      // Settling here is what guarantees the loading state ends, whichever subtree this wraps.
      if (error || !session?.user) {
        setUser(null);
        setMount(false);
        return;
      }

      const { data, error: userError } = await supabase
        .from('profiles')
        .select(
          'role, id, email, first_name, last_name, middle_name, avatar_url, address',
        )
        .eq('id', session.user.id)
        .single();

      // Same rule for a session whose profile is missing or carries no role: there is no
      // role-bearing user to hand down, and a throw here would strand the spinner identically.
      if (userError || !data?.role) {
        setUser(null);
        setMount(false);
        return;
      }

      setUser({ ...session.user, userRole: data.role } as Users);
      setUserInfo({ ...data } as UserForm);
      setMount(false);
    };

    if (mount) {
      loadSession();
    }
  }, [supabase, mount, setMount]);

  // The spinner means "the session is not settled yet" - for a subtree that needs a user it also
  // covers "and there is not one", which is the admin and `/user` behaviour. The customer area asks
  // for no user, so its children render as soon as the answer is in, with a null context: the
  // context type has always allowed null, and the tablet is what signs the visitor in.
  const settled = !mount && (!requireUser || Boolean(user?.userRole));

  if (!settled) {
    return (
      <div className="flex h-[85vh] items-center justify-center">
        <Spinner />
      </div>
    );
  }

  return (
    <AUTHCONTEXT.Provider value={user ? { user } : null}>
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
