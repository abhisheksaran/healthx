import { FormEvent, useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { App } from './main';
import { supabase } from './lib/supabase';
import './auth.css';

export function CloudApp() {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(!supabase);
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getUser().then(({ data }) => { setUser(data.user); setReady(true); });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => setUser(session?.user ?? null));
    return () => listener.subscription.unsubscribe();
  }, []);
  useEffect(() => {
    if (!supabase || !user) return;
    Promise.all([supabase.from('workout_logs').select('*').order('date', { ascending: false }), supabase.from('bodyweight_entries').select('*').order('date', { ascending: true })]).then(([logs, weights]) => {
      if (!logs.error && logs.data?.length) localStorage.setItem('liftlog-logs', JSON.stringify(logs.data.map((l: any) => ({ date: l.date, day: l.day, exercise: l.exercise, weight: Number(l.weight), reps: l.reps, rir: l.rir }))));
      if (!weights.error && weights.data?.length) localStorage.setItem('liftlog-weight', JSON.stringify(weights.data.map((w: any) => Number(w.weight))));
      setReady(true);
    });
  }, [user]);
  useEffect(() => {
    if (!supabase || !user || !ready) return;
    const original = localStorage.setItem.bind(localStorage);
    localStorage.setItem = (key: string, value: string) => {
      original(key, value);
      if (key === 'liftlog-logs') { const rows = JSON.parse(value).map((l: any) => ({ ...l, user_id: user.id })); supabase.from('workout_logs').delete().eq('user_id', user.id).then(() => { if (rows.length) supabase.from('workout_logs').insert(rows); }); }
      if (key === 'liftlog-weight') { const values = JSON.parse(value); const rows = values.map((weight: number, i: number) => ({ user_id: user.id, weight, date: new Date(Date.now() - (values.length - i - 1) * 86400000).toISOString().slice(0, 10) })); supabase.from('bodyweight_entries').delete().eq('user_id', user.id).then(() => { if (rows.length) supabase.from('bodyweight_entries').insert(rows); }); }
    };
    return () => { localStorage.setItem = original; };
  }, [user, ready]);
  const submit = async (e: FormEvent) => { e.preventDefault(); setMessage(''); if (!supabase) return; const result = mode === 'signin' ? await supabase.auth.signInWithPassword({ email, password }) : await supabase.auth.signUp({ email, password }); if (result.error) setMessage(result.error.message); else setMessage(mode === 'signup' ? 'Account created. Check your email if confirmation is enabled.' : 'Signed in.'); };
  if (!supabase) return <App />;
  if (user) return <><App /><button onClick={() => supabase.auth.signOut()} style={{ position: 'fixed', right: 28, top: 23, zIndex: 3, padding: '8px 12px', border: '1px solid #dce5de', borderRadius: 6, background: '#fff', color: '#687870', fontSize: 11 }}>Sign out</button></>;
  if (!ready) return <div className="auth-shell"><div className="auth-box"><div className="brand"><span className="brand-mark">↗</span><span>lift<span>log</span></span></div><p>Loading your secure workout data…</p></div></div>;
  return <div className="auth-shell"><form className="auth-box" onSubmit={submit}><div className="brand"><span className="brand-mark">↗</span><span>lift<span>log</span></span></div><p className="eyebrow">YOUR PRIVATE PROGRESS TRACKER</p><h1>{mode === 'signin' ? 'Welcome back.' : 'Start your log.'}</h1><p className="auth-copy">Sign in to keep your workouts synced across devices.</p><input required type="email" placeholder="Email address" value={email} onChange={e => setEmail(e.target.value)} /><input required minLength={6} type="password" placeholder="Password (6+ characters)" value={password} onChange={e => setPassword(e.target.value)} /><button className="primary auth-submit">{mode === 'signin' ? 'Sign in' : 'Create account'} →</button>{message && <p className="auth-message">{message}</p>}<button type="button" className="auth-switch" onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}>{mode === 'signin' ? 'New here? Create an account' : 'Already have an account? Sign in'}</button></form></div>;
}
