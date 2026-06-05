import { getSupabaseClient } from './supabaseClient.js';

const listeners = new Set();

function firebaseError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

function notify(user) {
  auth.currentUser = user;
  listeners.forEach((listener) => listener(user));
}

function wrapUser(user, session = null) {
  if (!user) return null;

  return {
    ...user,
    uid: user.id,
    displayName: user.user_metadata?.display_name || user.user_metadata?.full_name || user.user_metadata?.clinic_name || null,
    async getIdToken() {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;
      return data.session?.access_token || session?.access_token || null;
    },
  };
}

async function ensureInitialized() {
  if (auth.__initialized) return;
  auth.__initialized = true;

  const supabase = getSupabaseClient();
  const { data } = await supabase.auth.getSession();
  notify(wrapUser(data.session?.user, data.session));

  supabase.auth.onAuthStateChange((_event, session) => {
    notify(wrapUser(session?.user, session));
  });
}

export const auth = {
  currentUser: null,
  __initialized: false,
  onAuthStateChanged(callback) {
    const wasInitialized = auth.__initialized;
    listeners.add(callback);
    ensureInitialized()
      .then(() => {
        if (wasInitialized) callback(auth.currentUser);
      })
      .catch(() => callback(null));
    return () => listeners.delete(callback);
  },
  async signOut() {
    const supabase = getSupabaseClient();
    await supabase.auth.signOut();
    notify(null);
  },
};

export function onAuthStateChanged(authInstance, callback) {
  return authInstance.onAuthStateChanged(callback);
}

export async function signInWithEmailAndPassword(_auth, email, password) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw firebaseError('auth/invalid-credential', error.message);
  const user = wrapUser(data.user, data.session);
  notify(user);
  return { user };
}

export async function createUserWithEmailAndPassword(_auth, email, password) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw firebaseError('auth/email-already-in-use', error.message);
  const user = wrapUser(data.user, data.session);
  notify(user);
  return { user };
}

export async function updateProfile(user, profile) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.auth.updateUser({
    data: {
      display_name: profile.displayName,
      full_name: profile.displayName,
    },
  });
  if (error) throw error;
  const wrapped = wrapUser(data.user);
  notify(wrapped || user);
  return wrapped;
}

export async function sendPasswordResetEmail(_auth, email) {
  const supabase = getSupabaseClient();
  const redirectTo = `${window.location.origin}/resetar-senha`;
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
  if (error) throw firebaseError('auth/user-not-found', error.message);
}

export async function verifyPasswordResetCode(_auth, code) {
  if (!code) throw firebaseError('auth/invalid-action-code', 'Codigo invalido.');
  return code;
}

export async function confirmPasswordReset(_auth, _code, newPassword) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw firebaseError('auth/invalid-action-code', error.message);
  notify(wrapUser(data.user));
}

export const EmailAuthProvider = {
  credential(email, password) {
    return { email, password };
  },
};

export async function reauthenticateWithCredential(user, credential) {
  return signInWithEmailAndPassword(auth, credential.email || user.email, credential.password);
}

export async function updatePassword(_user, newPassword) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;
  notify(wrapUser(data.user));
}

export async function signOut(authInstance = auth) {
  return authInstance.signOut();
}
