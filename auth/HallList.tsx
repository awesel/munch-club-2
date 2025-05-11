import React, { useContext } from 'react';
import { useHallGroups, HallGroup } from './useHallGroups';
import HallCard from './HallCard';
import { usePresence } from './usePresence';
import { signOut, auth } from '../firebase';

export interface UserWithNameAndPhone {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  name: string;
  phone?: string;
}

export const UserContext = React.createContext<UserWithNameAndPhone | undefined>(undefined);

const HallList: React.FC = () => {
  const { loading, halls } = useHallGroups();
  const user = useContext(UserContext);
  const [showMenu, setShowMenu] = React.useState(false);
  console.log('HallList render', { loading, halls, user });
  if (!user) return null;
  if (loading) return <div data-testid="hall-list-loading">Loading…</div>;
  return (
    <>
      {/* User avatar and logout menu */}
      <div style={{ position: 'absolute', top: 24, right: 32, zIndex: 10 }}>
        <img
          src={user.photoURL || ''}
          alt={user.name}
          style={{ width: 40, height: 40, borderRadius: '50%', cursor: 'pointer', border: '2px solid #ccc' }}
          onClick={() => setShowMenu((v) => !v)}
          data-testid="user-avatar"
        />
        {showMenu && (
          <button
            onClick={() => signOut(auth)}
            style={{
              display: 'block',
              marginTop: 8,
              padding: '8px 16px',
              background: '#fff',
              border: '1px solid #ccc',
              borderRadius: 8,
              boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
              cursor: 'pointer',
              fontWeight: 600,
            }}
            role="button"
          >
            Log out
          </button>
        )}
      </div>
      <div data-testid="hall-list-blurb" style={{ marginBottom: 16, fontSize: '1.1em', color: '#444' }}>
        {`If someone's looking for a meal, text them hello! If nobody's in the dining hall you want to eat in, or you want more people in your group, add yourself to your favorite dining hall! Our users typically recieve a text from someone trying to eat in just a few minutes. Be patient!`}
      </div>
      <ul>
        {halls.map(hall => (
          <li key={hall.id}>
            <HallCard hall={{ id: hall.id, name: hall.name, members: [] }} user={{
              uid: user.uid,
              name: user.name,
              photoURL: user.photoURL || '',
              phone: user.phone || ''
            }} />
          </li>
        ))}
      </ul>
    </>
  );
};

export default HallList; 