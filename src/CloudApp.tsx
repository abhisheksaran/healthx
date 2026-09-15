import { FormEvent, useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { App } from './main';
import { supabase } from './lib/supabase';
import { debug, debugError } from './lib/debug';
import './auth.css';

export function CloudApp() {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(!supabase);
  const [dataReady, setDataReady] = useState(!supabase);
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  useEffect(() => {
    debug('client configured:', Boolean(supabase), 'url:', import.meta.env.VITE_SUPABASE_URL || '(missing)', 'key present:', Boolean(import.meta.env.VITE_SUPABASE_ANON_KEY));
    if (!supabase) return;
    supabase.auth.getUser().then(({ data, error }) => { debug('getUser:', data.user?.email || 'signed out', error || 'ok'); setUser(data.user); setReady(true); });
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => { debug('auth event:', event, session?.user?.email || 'signed out'); setUser(session?.user ?? null); });
    return () => listener.subscription.unsubscribe();
  }, []);
  useEffect(() => {
    if (!supabase || !user) return;
    setDataReady(false);
    debug('loading cloud data for user:', user.id);
    Promise.all([supabase.from('workout_logs').select('*').order('date', { ascending: false }), supabase.from('bodyweight_entries').select('*').order('date', { ascending: true })]).then(([logs, weights]) => {
      debug('workout_logs response:', { count: logs.data?.length || 0, error: logs.error || null });
      debug('bodyweight_entries response:', { count: weights.data?.length || 0, error: weights.error || null });
      if (!logs.error) localStorage.setItem('liftlog-logs', JSON.stringify((logs.data || []).map((l: any) => ({ date: l.date, day: l.day, exercise: l.exercise, weight: Number(l.weight), reps: l.reps, rir: l.rir }))));
      if (!weights.error) localStorage.setItem('liftlog-weight', JSON.stringify((weights.data || []).map((w: any) => Number(w.weight))));
      setDataReady(true);
    });
  }, [user]);
  const submit = async (e: FormEvent) => { e.preventDefault(); setMessage(''); if (!supabase) return; debug(mode, 'attempt:', email); const result = mode === 'signin' ? await supabase.auth.signInWithPassword({ email, password }) : await supabase.auth.signUp({ email, password }); debug(mode, 'result:', result.error || 'ok', result.data.user?.id || 'no user yet'); if (result.error) setMessage(result.error.message); else setMessage(mode === 'signup' ? 'Account created. Check your email if confirmation is enabled.' : 'Signed in.'); };
  if (!supabase) return <App />;
  if (user && !dataReady) return <div className="auth-shell"><div className="auth-box"><div className="brand"><span className="brand-mark">↗</span><span>lift<span>log</span></span></div><p>Loading your secure workout data…</p></div></div>;
  if (user) return <><App /><button onClick={() => supabase.auth.signOut()} style={{ position: 'fixed', right: 28, top: 23, zIndex: 3, padding: '8px 12px', border: '1px solid #dce5de', borderRadius: 6, background: '#fff', color: '#687870', fontSize: 11 }}>Sign out</button></>;
  if (!ready) return <div className="auth-shell"><div className="auth-box"><div className="brand"><span className="brand-mark">↗</span><span>lift<span>log</span></span></div><p>Loading your secure workout data…</p></div></div>;
  return <div className="auth-shell"><form className="auth-box" onSubmit={submit}><div className="brand"><span className="brand-mark">↗</span><span>lift<span>log</span></span></div><p className="eyebrow">YOUR PRIVATE PROGRESS TRACKER</p><h1>{mode === 'signin' ? 'Welcome back.' : 'Start your log.'}</h1><p className="auth-copy">Sign in to keep your workouts synced across devices.</p><input required type="email" placeholder="Email address" value={email} onChange={e => setEmail(e.target.value)} /><input required minLength={6} type="password" placeholder="Password (6+ characters)" value={password} onChange={e => setPassword(e.target.value)} /><button className="primary auth-submit">{mode === 'signin' ? 'Sign in' : 'Create account'} →</button>{message && <p className="auth-message">{message}</p>}<button type="button" className="auth-switch" onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}>{mode === 'signin' ? 'New here? Create an account' : 'Already have an account? Sign in'}</button></form></div>;
}
