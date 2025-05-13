import { useEffect, useState, useCallback, useRef } from 'react';
import { db } from '../firebase';
import {
  doc,
  onSnapshot,
  setDoc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  getDoc,
  serverTimestamp,
} from 'firebase/firestore';

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

export function usePresence(hall: Hall, user: User) {
  const [members, setMembers] = useState<Member[]>(hall.members || []);
  const [isPresent, setIsPresent] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const unsubRef = useRef<() => void>();

  // Listen to group membership
  useEffect(() => {
    const groupRef = doc(db, 'activeGroups', hall.id);
    unsubRef.current = onSnapshot(groupRef, async snap => {
      const data = snap.data();
      if (data && Array.isArray(data.members)) {
        const now = Date.now();
        const filteredMembers = data.members.filter((m: Member) => now - m.createdAt < ONE_HOUR);
        // If any expired members, update Firestore to remove them
        if (filteredMembers.length !== data.members.length) {
          await updateDoc(groupRef, {
            members: filteredMembers,
            updatedAt: Date.now(),
          });
        }
        setMembers(filteredMembers);
        setIsPresent(!!filteredMembers.find((m: Member) => m.uid === user.uid));
      } else {
        setMembers([]);
        setIsPresent(false);
      }
    });
    return () => {
      if (unsubRef.current) unsubRef.current();
    };
  }, [hall.id, user.uid]);

  // Join group
  const join = useCallback(async () => {
    const groupRef = doc(db, 'activeGroups', hall.id);
    const member: Member = {
      uid: user.uid,
      name: user.name,
      photoURL: user.photoURL,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      phone: user.phone,
    };
    const snap = await getDoc(groupRef);
    if (!snap.exists()) {
      await setDoc(groupRef, {
        hallId: hall.id,
        members: [member],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    } else {
      const data = snap.data();
      const now = Date.now();
      const filtered = (data.members || []).filter((m: Member) => now - m.createdAt < ONE_HOUR && m.uid !== user.uid);
      await updateDoc(groupRef, {
        members: [...filtered, member],
        updatedAt: Date.now(),
      });
    }
  }, [hall.id, user]);

  // Leave group
  const leave = useCallback(async () => {
    const groupRef = doc(db, 'activeGroups', hall.id);
    const snap = await getDoc(groupRef);
    if (snap.exists()) {
      const data = snap.data();
      const filtered = (data.members || []).filter((m: Member) => m.uid !== user.uid);
      await updateDoc(groupRef, {
        members: filtered,
        updatedAt: Date.now(),
      });
    }
  }, [hall.id, user.uid]);

  // Presence refresh every 30s
  useEffect(() => {
    if (!isPresent) return;
    intervalRef.current = setInterval(async () => {
      const groupRef = doc(db, 'activeGroups', hall.id);
      const snap = await getDoc(groupRef);
      if (snap.exists()) {
        const data = snap.data();
        const now = Date.now();
        const membersArr = (data.members || [])
          .filter((m: Member) => now - m.createdAt < ONE_HOUR || m.uid === user.uid)
          .map((m: Member) =>
            m.uid === user.uid ? { ...m, updatedAt: Date.now() } : m
          );
        await updateDoc(groupRef, {
          members: membersArr,
          updatedAt: Date.now(),
        });
      }
    }, 30000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isPresent, hall.id, user.uid]);

  // Remove presence on unmount
  useEffect(() => {
    return () => {
      leave();
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (unsubRef.current) unsubRef.current();
    };
  }, [leave]);

  return { isPresent, join, leave, members };
} 