import React from 'react';
import { usePresence } from './usePresence';
import { db } from '../firebase';
import { collection, addDoc } from 'firebase/firestore';
import { useState } from 'react';
import { useUserActiveHall } from './useHallGroups';

interface Member {
  uid: string;
  name: string;
  photoURL: string;
  createdAt: number;
  updatedAt: number;
  phone: string;
}

interface Hall {
  id: string;
  name: string;
  members: Member[];
}

interface User {
  uid: string;
  name: string;
  photoURL: string;
  phone: string;
}

const ONE_HOUR = 60 * 60 * 1000;

function formatPhone(phone: string) {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  return phone;
}

const HallCard: React.FC<{ hall: Hall; user: User }> = ({ hall, user }) => {
  const { isPresent, join, leave, members } = usePresence(hall, user);
  const [showMatchModal, setShowMatchModal] = useState(false);
  const [showTextAlert, setShowTextAlert] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const now = Date.now();
  const activeMembers = (members || []).filter(
    (m: Member) => now - m.updatedAt < ONE_HOUR
  );

  const otherMembers = activeMembers.filter(m => m.uid !== user.uid);
  const activeHallId = useUserActiveHall();
  const isInAnotherHall = activeHallId && activeHallId !== hall.id;

  const handleJoin = async () => {
    await join();
    if (otherMembers.length > 0) {
      setShowTextAlert(true);
    }
  };

  const handleLeave = async () => {
    await leave();
    setShowMatchModal(true);
  };

  const handleMatchAnswer = async (answer: boolean) => {
    setSubmitting(true);
    await addDoc(collection(db, 'matchFeedback'), {
      userId: user.uid,
      hallId: hall.id,
      answer,
      timestamp: Date.now(),
    });
    setShowMatchModal(false);
    setSubmitting(false);
  };

  const closeTextAlert = () => setShowTextAlert(false);

  return (
    <div>
      <div>
        <strong>{hall.name}</strong> <span>{activeMembers.length}</span>
      </div>
      <div>
        {activeMembers.map(m => (
          <div key={m.uid} style={{ display: 'flex', alignItems: 'center', marginBottom: 4 }}>
            <img src={m.photoURL} alt={m.name} style={{ width: 32, height: 32, borderRadius: '50%', marginRight: 8 }} />
            <span style={{ marginRight: 8 }}>{m.name}</span>
            <span style={{ color: '#888' }}>
              <a href={`sms:${m.phone}`} style={{ color: '#888', textDecoration: 'underline' }}>
                {formatPhone(m.phone)}
              </a>
            </span>
          </div>
        ))}
      </div>
      <div>
        {isPresent ? (
          <button
            onClick={handleLeave}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-semibold shadow hover:bg-gray-300 transition"
          >
            Leave
          </button>
        ) : (
          <button
            onClick={handleJoin}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg font-semibold shadow hover:bg-purple-700 transition"
            disabled={!!isInAnotherHall}
            title={isInAnotherHall ? 'You can only join one dining hall at a time. Leave your current hall to join another.' : ''}
          >
            Join
          </button>
        )}
      </div>
      {showTextAlert && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50">
          <div className="bg-white p-6 rounded-xl shadow-xl flex flex-col items-center">
            <p className="mb-4 text-lg font-semibold">Someone is already in this dining hall! Please text them to coordinate.</p>
            <div className="flex gap-4">
              <button
                onClick={closeTextAlert}
                className="px-4 py-2 bg-green-500 text-white rounded-lg font-semibold hover:bg-green-600"
              >
                I've already texted
              </button>
              <button
                onClick={closeTextAlert}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg font-semibold hover:bg-blue-600"
              >
                I'll text now!
              </button>
            </div>
          </div>
        </div>
      )}
      {showMatchModal && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50">
          <div className="bg-white p-6 rounded-xl shadow-xl flex flex-col items-center">
            <p className="mb-4 text-lg font-semibold">Did you find a match using Munch Club?</p>
            <div className="flex gap-4">
              <button
                onClick={() => handleMatchAnswer(true)}
                disabled={submitting}
                className="px-4 py-2 bg-green-500 text-white rounded-lg font-semibold hover:bg-green-600"
              >
                Yes
              </button>
              <button
                onClick={() => handleMatchAnswer(false)}
                disabled={submitting}
                className="px-4 py-2 bg-red-500 text-white rounded-lg font-semibold hover:bg-red-600"
              >
                No
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HallCard; 