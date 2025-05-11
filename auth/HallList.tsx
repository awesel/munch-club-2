import React, { useContext } from 'react';
import { useHallGroups, HallGroup } from './useHallGroups';
import HallCard from './HallCard';
import { usePresence } from './usePresence';

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
  console.log('HallList render', { loading, halls, user });
  if (!user) return null;
  if (loading) return <div data-testid="hall-list-loading">Loading…</div>;
  return (
    <ul>
      {halls.map(hall => (
        <li key={hall.id}>
          <HallCard hall={{ id: hall.id, name: hall.name, members: [] }} user={{
            uid: user.uid,
            name: user.name,
            photoURL: user.photoURL || '',
            phone: user.phone
          }} />
        </li>
      ))}
    </ul>
  );
};

export default HallList; 