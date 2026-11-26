import type { Session, User } from '@supabase/supabase-js';
import { create } from 'zustand';
import { isSupabaseConfigured, supabase } from '@/services/supabase/client';

type AuthStatus = 'loading' | 'signed-out' | 'signed-in';

interface AuthState {
  status: AuthStatus;
  session: Session | null;
  /** Hay un proyecto Supabase configurado (si no, solo modo local/demo) */
  enabled: boolean;
  init: () => Promise<void>;
  signInWithMagicLink: (email: string) => Promise<void>;
  /** Devuelve false si falta confirmar el correo */
  signInWithPassword: (email: string, password: string) => Promise<boolean>;
  /** Devuelve true si la cuenta quedó activa; false si falta confirmar el correo */
  signUp: (email: string, password: string) => Promise<boolean>;
  resendConfirmation: (email: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

let initialized = false;

/**
 * Con club real, al cambiar la sesión se recarga el estado del club. Sin
 * Supabase en el club (modo demo), la sesión real abre también la sesión demo.
 */
async function bridgeDemoClub(session: Session | null) {
  const [{ clubRepo }, { useClubStore }] = await Promise.all([import('@/services/club'), import('@/store/clubStore')]);
  if (!clubRepo.isDemo) {
    // Club real: solo hay que recargar sesión, perfil y club
    await useClubStore.getState().refresh();
    return;
  }
  const current = await clubRepo.getSession();
  if (session?.user.email && current?.email !== session.user.email) await clubRepo.confirmMagicLink(session.user.email);
  else if (!session && current) await clubRepo.signOut();
  else return;
  await useClubStore.getState().refresh();
}

/** A donde vuelven los enlaces del correo (acceso y confirmación): la sesión se abre sola al llegar */
const emailRedirectTo = () => `${window.location.origin}/entrar`;

const need = () => {
  if (!supabase) throw new Error('El inicio de sesión no está configurado todavía.');
  return supabase;
};

/** Traduce los errores más comunes de Supabase Auth */
function friendly(message: string): string {
  const m = message.toLowerCase();
  if (m.includes('invalid login credentials')) return 'Correo o contraseña incorrectos.';
  if (m.includes('email not confirmed')) return 'Confirma tu correo con el enlace que te enviamos.';
  if (m.includes('already registered')) return 'Ese correo ya tiene una cuenta. Prueba a entrar.';
  if (m.includes('password should be')) return 'La contraseña debe tener al menos 6 caracteres.';
  if (m.includes('rate limit')) return 'Demasiados intentos. Espera un momento y vuelve a probar.';
  return message;
}

async function run(fn: () => Promise<{ data: unknown; error: { message: string } | null }>): Promise<unknown> {
  const { data, error } = await fn();
  if (error) throw new Error(friendly(error.message));
  return data;
}

export const useAuthStore = create<AuthState>()((set) => ({
  status: 'loading',
  session: null,
  enabled: isSupabaseConfigured,

  init: async () => {
    if (initialized) return;
    initialized = true;
    if (!supabase) {
      set({ status: 'signed-out' });
      return;
    }
    supabase.auth.onAuthStateChange((_event, session) => {
      set({ session, status: session ? 'signed-in' : 'signed-out' });
      void bridgeDemoClub(session).catch(() => undefined);
    });
    const { data } = await supabase.auth.getSession();
    set({ session: data.session, status: data.session ? 'signed-in' : 'signed-out' });
    void bridgeDemoClub(data.session).catch(() => undefined);
  },

  signInWithMagicLink: async (email) => {
    const sb = need();
    await run(() => sb.auth.signInWithOtp({ email, options: { emailRedirectTo: emailRedirectTo() } }));
  },

  signInWithPassword: async (email, password) => {
    const sb = need();
    const { error } = await sb.auth.signInWithPassword({ email, password });
    if (error?.code === 'email_not_confirmed') return false;
    if (error) throw new Error(friendly(error.message));
    return true;
  },

  signUp: async (email, password) => {
    const sb = need();
    const data = (await run(() => sb.auth.signUp({ email, password, options: { emailRedirectTo: emailRedirectTo() } }))) as { session: Session | null; user: User | null };
    // Con un correo ya confirmado, Supabase responde sin error pero no envía nada: el usuario llega sin identidades
    if (data.user?.identities?.length === 0) throw new Error('Ese correo ya tiene una cuenta. Entra con tu contraseña o usa «Olvidé mi contraseña» para crear una.');
    return !!data.session;
  },

  resendConfirmation: async (email) => {
    const sb = need();
    await run(() => sb.auth.resend({ type: 'signup', email, options: { emailRedirectTo: emailRedirectTo() } }));
  },

  resetPassword: async (email) => {
    const sb = need();
    await run(() => sb.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/entrar?recuperar=1` }));
  },

  updatePassword: async (password) => {
    const sb = need();
    await run(() => sb.auth.updateUser({ password }));
  },

  signOut: async () => {
    if (supabase) await supabase.auth.signOut();
    set({ session: null, status: 'signed-out' });
  },
}));
