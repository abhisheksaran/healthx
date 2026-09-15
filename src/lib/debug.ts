export const debug = (...args: unknown[]) => {
  if (import.meta.env.DEV || import.meta.env.VITE_DEBUG_SYNC === 'true') {
    console.log('[Liftlog/Supabase]', ...args);
  }
};

export const debugError = (...args: unknown[]) => {
  console.error('[Liftlog/Supabase]', ...args);
};
