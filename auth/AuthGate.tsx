import React, { useEffect, useState } from 'react';
import { signInWithPopup, signOut, onAuthStateChanged, auth, provider } from '../firebase';
import { validateStanfordEmail } from '../cloudFunctions';
import { UserContext } from './HallList';
import { db } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

export interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

export const AuthGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isStanford, setIsStanford] = useState<boolean | null>(null);
  const [phone, setPhone] = useState<string>('');
  const [phoneSubmitted, setPhoneSubmitted] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const localUser: User = {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
          photoURL: firebaseUser.photoURL,
        };
        setUser(localUser);
        setLoading(false);
        setError(null);
        (async () => {
          try {
            const valid = await validateStanfordEmail(localUser.email ?? '');
            setIsStanford(valid);
            // Load phone from Firestore
            const userDoc = await getDoc(doc(db, 'users', localUser.uid));
            if (userDoc.exists()) {
              const data = userDoc.data();
              if (data.phone) {
                setPhone(data.phone);
                setPhoneSubmitted(true);
              }
            }
          } catch (e) {
            setError('Validation error');
            setIsStanford(false);
          }
        })();
      } else {
        setUser(null);
        setLoading(false);
        setError(null);
        setIsStanford(null);
      }
    }, (error) => {
      setError(error.message);
      setLoading(false);
    });
    return () => { unsub(); };
  }, []);

  const handleLogin = async () => {
    setError(null);
    setLoading(true);
    try {
      await signInWithPopup(auth, provider);
    } catch (e: any) {
      setError('Error: ' + (e?.message || 'Sign-in failed'));
    }
    setLoading(false);
  };

  if (loading) return <div data-testid="auth-loading">Loading…</div>;
  if (error) return <div>{error}</div>;
  if (!user)
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-100 to-purple-200 p-8">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 border border-gray-100 flex flex-col items-center">
          <h1 className="text-4xl font-extrabold text-center text-purple-700 mb-4 drop-shadow">Munch Club</h1>
          <p className="text-lg text-gray-700 mb-6 text-center">Eat with your friends!</p>
          <button
            onClick={handleLogin}
            aria-label="Sign in with Google"
            className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg font-semibold shadow hover:bg-purple-700 transition text-lg"
          >
            Sign in with Google
          </button>
        </div>
      </div>
    );
  if (isStanford === false)
    return <div>Only Stanford (@stanford.edu) accounts allowed.</div>;
  if (isStanford === null)
    return <div data-testid="auth-loading">Loading…</div>;
  if (!phoneSubmitted) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-100 to-purple-200 p-8">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 border border-gray-100 flex flex-col items-center">
          <h2 className="text-2xl font-bold text-purple-700 mb-4 drop-shadow text-center">Enter Your Phone Number</h2>
          <form
            onSubmit={async e => {
              e.preventDefault();
              setPhoneSubmitted(true);
              if (user) {
                await setDoc(doc(db, 'users', user.uid), { phone });
              }
            }}
            className="w-full flex flex-col items-center gap-4"
          >
            <label htmlFor="phone-input" className="block text-lg font-medium text-gray-700 mb-1">Phone Number</label>
            <input
              id="phone-input"
              aria-label="Phone Number"
              type="tel"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-400 text-lg"
            />
            <button
              type="submit"
              aria-label="Submit Phone"
              className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg font-semibold shadow hover:bg-purple-700 transition text-lg mt-2"
            >
              Submit Phone
            </button>
          </form>
        </div>
      </div>
    );
  }
  // Parse first name and last initial from displayName
  const nameParts = user?.displayName?.trim().split(/\s+/) || [];
  let firstName = nameParts[0] || '';
  let lastInitial = nameParts.length > 1 ? nameParts[nameParts.length - 1][0] : '';
  const userWithNameAndPhone = {
    ...user!,
    name: `${firstName} ${lastInitial ? lastInitial + '.' : ''}`.trim(),
    phone,
  };
  return <UserContext.Provider value={userWithNameAndPhone}>{children}</UserContext.Provider>;
};

export default AuthGate; 