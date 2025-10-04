import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function Home() {
  const [user, setUser] = useState(null);
  const [players, setPlayers] = useState([]);
  const [coaches, setCoaches] = useState([]);
  const [coachRequests, setCoachRequests] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [pendingRequest, setPendingRequest] = useState(false);

  useEffect(() => {
    supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null);
      if (session?.user?.email) checkAdmin(session.user.email);
    });
    fetchPlayers();
    fetchCoaches();
    fetchCoachRequests();
  }, []);

  async function checkAdmin(email) {
    const { data } = await supabase.from('coaches').select('*').eq('email', email).single();
    setIsAdmin(!!data);
  }

  async function signIn(provider) {
    await supabase.auth.signInWithOAuth({ provider });
  }

  async function signOut() {
    await supabase.auth.signOut();
    setUser(null);
    setIsAdmin(false);
  }

  async function fetchPlayers() {
    const { data } = await supabase.from('players').select('*');
    setPlayers(data || []);
  }

  async function fetchCoaches() {
    const { data } = await supabase.from('coaches').select('*');
    setCoaches(data || []);
  }

  async function fetchCoachRequests() {
    const { data } = await supabase.from('coach_requests').select('*');
    setCoachRequests(data || []);
  }

  async function requestAccess() {
    if (!user) return alert('Sign in first');
    const { error } = await supabase.from('coach_requests').insert([
      { name: user.user_metadata.full_name || 'Coach', email: user.email },
    ]);
    if (error) return alert(error.message);
    setPendingRequest(true);
  }

  async function addPlayer() {
    const name = prompt('Player name:');
    if (!name) return;
    await supabase.from('players').insert([{ name }]);
    fetchPlayers();
  }

  async function deletePlayer(id) {
    await supabase.from('players').delete().eq('id', id);
    fetchPlayers();
  }

  async function approveCoach(id) {
    const request = coachRequests.find(r => r.id === id);
    if (!request) return;
    await supabase.from('coaches').insert([{ name: request.name, email: request.email }]);
    await supabase.from('coach_requests').delete().eq('id', id);
    fetchCoaches();
    fetchCoachRequests();
  }

  async function denyCoach(id) {
    await supabase.from('coach_requests').delete().eq('id', id);
    fetchCoachRequests();
  }

  return (
    <div style={{ maxWidth: '700px', margin: 'auto', padding: '2rem', fontFamily: 'sans-serif' }}>
      <h1>Team Lineup Manager</h1>

      {!user ? (
        <>
          <button onClick={() => signIn('google')}>Sign in with Google</button>
          <button onClick={() => signIn('apple')}>Sign in with Apple</button>
        </>
      ) : (
        <>
          <p>Signed in as: {user.email}</p>
          <button onClick={signOut}>Sign out</button>

          <div style={{ marginTop: '2rem' }}>
            <h2>Players</h2>
            <ul>
              {players.map(p => (
                <li key={p.id}>
                  {p.name}{' '}
                  {isAdmin && <button onClick={() => deletePlayer(p.id)}>Delete</button>}
                </li>
              ))}
            </ul>
            {isAdmin && <button onClick={addPlayer}>Add Player</button>}
          </div>

          <div style={{ marginTop: '2rem' }}>
            <h2>Coaches</h2>
            <ul>
              {coaches.map(c => (
                <li key={c.id}>{c.name} ({c.email})</li>
              ))}
            </ul>
          </div>

          {!isAdmin && !pendingRequest && <button onClick={requestAccess}>Request Admin Access</button>}
          {pendingRequest && <p>Access request sent, waiting approval</p>}

          {isAdmin && coachRequests.length > 0 && (
            <div style={{ marginTop: '2rem' }}>
              <h2>Pending Coach Requests</h2>
              <ul>
                {coachRequests.map(r => (
                  <li key={r.id}>
                    {r.name} ({r.email}){' '}
                    <button onClick={() => approveCoach(r.id)}>Approve</button>{' '}
                    <button onClick={() => denyCoach(r.id)}>Deny</button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
}
