import { useEffect, useState, useContext } from 'react';
import { db } from '../firebase';
import {
  collection,
  onSnapshot,
  getDocs,
  query,
  orderBy,
  doc,
} from 'firebase/firestore';
import { UserContext } from './HallList';

export interface HallGroup {
  id: string;
  name: string;
  count: number;
}

export function useHallGroups(): { loading: boolean; halls: HallGroup[] } {
  const [halls, setHalls] = useState<HallGroup[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubGroups: (() => void) | null = null;
    let unsubHalls: (() => void) | null = null;
    let activeGroupsMap: Record<string, number> = {};
    let hallsList: { id: string; name: string; order: number }[] = [];
    let ready = { halls: false, groups: false };

    // Listen to diningHalls
    const hallsQuery = query(collection(db, 'diningHalls'), orderBy('order'));
    unsubHalls = onSnapshot(hallsQuery, snap => {
      hallsList = snap.docs.map(doc => ({
        id: doc.id,
        name: doc.data().name,
        order: doc.data().order ?? 0,
      }));
      ready.halls = true;
      update();
    });

    // Listen to activeGroups
    unsubGroups = onSnapshot(collection(db, 'activeGroups'), snap => {
      activeGroupsMap = {};
      snap.docs.forEach(doc => {
        const data = doc.data();
        activeGroupsMap[doc.id] = Array.isArray(data.members) ? data.members.length : 0;
      });
      ready.groups = true;
      update();
    });

    function update() {
      if (!ready.halls || !ready.groups) return;
      setHalls(
        hallsList.map(hall => ({
          id: hall.id,
          name: hall.name,
          count: activeGroupsMap[hall.id] || 0,
        }))
      );
      setLoading(false);
    }

    return () => {
      unsubGroups && unsubGroups();
      unsubHalls && unsubHalls();
    };
  }, []);

  return { loading, halls };
}

// Returns the hallId the user is present in, or null if not present in any
export function useUserActiveHall(): string | null {
  const user = useContext(UserContext);
  const [activeHallId, setActiveHallId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setActiveHallId(null);
      return;
    }
    const unsub = onSnapshot(collection(db, 'activeGroups'), snap => {
      let found: string | null = null;
      snap.docs.forEach(doc => {
        const data = doc.data();
        if (Array.isArray(data.members) && data.members.some((m: any) => m.uid === user.uid)) {
          found = doc.id;
        }
      });
      setActiveHallId(found);
    });
    return () => unsub();
  }, [user]);

  return activeHallId;
} 