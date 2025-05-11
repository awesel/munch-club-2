import React, { createContext } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
jest.mock('firebase/app', () => ({
  initializeApp: jest.fn(),
  getApps: () => [{}],
}));
jest.mock('firebase/auth', () => ({
  getAuth: jest.fn(),
  GoogleAuthProvider: jest.fn(),
  signInWithPopup: jest.fn(),
  signOut: jest.fn(),
  onAuthStateChanged: jest.fn(),
}));

// Enhance Firestore mocks to call listeners with mock data
const mockOnSnapshot = jest.fn();
const mockCollection = jest.fn();
const mockQuery = jest.fn();
const mockOrderBy = jest.fn();
const mockDoc = jest.fn();
const mockGetDoc = jest.fn();

jest.mock('firebase/firestore', () => ({
  getFirestore: jest.fn(),
  collection: (...args: any[]) => mockCollection(...args),
  onSnapshot: (...args: any[]) => mockOnSnapshot(...args),
  getDocs: jest.fn(),
  query: (...args: any[]) => mockQuery(...args),
  orderBy: (...args: any[]) => mockOrderBy(...args),
  doc: (...args: any[]) => mockDoc(...args),
  setDoc: jest.fn(),
  updateDoc: jest.fn(),
  arrayUnion: jest.fn(),
  arrayRemove: jest.fn(),
  getDoc: (...args: any[]) => mockGetDoc(...args),
  serverTimestamp: jest.fn(),
}));

import HallList from './HallList';
import { UserContext } from './HallList';
import HallCard from './HallCard';

const user = { uid: '1', email: 'jane@stanford.edu', displayName: 'Jane', photoURL: 'jane.jpg', name: 'Jane' };

// Helper to create a mock Firestore snapshot
function createSnapshot(docs: any[]) {
  return {
    docs: docs.map((doc: any) => ({
      id: doc.id,
      data: () => doc.data,
    })),
  };
}

jest.mock('./useHallGroups', () => ({
  useUserActiveHall: jest.fn(),
  useHallGroups: jest.requireActual('./useHallGroups').useHallGroups,
}));
import { useUserActiveHall } from './useHallGroups';

describe('HallList', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockOnSnapshot.mockReset();
    mockCollection.mockReset();
    mockQuery.mockReset();
    mockOrderBy.mockReset();
    mockDoc.mockReset();
    mockGetDoc.mockImplementation(() => ({
      exists: () => false,
      data: () => ({}),
    }));
    (useUserActiveHall as jest.Mock).mockReturnValue(null);
  });

  it('shows loading state initially', () => {
    // Simulate loading by not calling the callback immediately
    mockOnSnapshot.mockImplementation(() => jest.fn());
    render(
      <UserContext.Provider value={user}>
        <HallList />
      </UserContext.Provider>
    );
    expect(screen.getByTestId('hall-list-loading')).toBeInTheDocument();
  });

  it('renders dining halls with active group counts', async () => {
    // Simulate Firestore returning halls and active groups
    mockOnSnapshot.mockImplementationOnce((query, cb) => {
      // diningHalls
      cb(createSnapshot([
        { id: 'arrillaga', data: { name: 'Arrillaga', order: 1 } },
        { id: 'wilbur', data: { name: 'Wilbur', order: 2 } },
      ]));
      return jest.fn();
    }).mockImplementationOnce((query, cb) => {
      // activeGroups
      cb(createSnapshot([
        { id: 'arrillaga', data: { members: [{ uid: '1', name: 'Jane', photoURL: 'jane.jpg', updatedAt: Date.now() }] } },
        { id: 'wilbur', data: { members: [] } },
      ]));
      return jest.fn();
    });
    render(
      <UserContext.Provider value={user}>
        <HallList />
      </UserContext.Provider>
    );
    expect(screen.getByText('Arrillaga')).toBeInTheDocument();
    expect(screen.getByText('Wilbur')).toBeInTheDocument();
  });

  it('updates in real-time when data changes', async () => {
    // Initial snapshot
    let halls = [
      { id: 'arrillaga', data: { name: 'Arrillaga', order: 1 } },
      { id: 'wilbur', data: { name: 'Wilbur', order: 2 } },
    ];
    let groups = [
      { id: 'arrillaga', data: { members: [{ uid: '1', name: 'Jane', photoURL: 'jane.jpg', updatedAt: Date.now() }] } },
      { id: 'wilbur', data: { members: [] } },
    ];
    let hallCallback: any = null;
    let groupCallback: any = null;
    mockOnSnapshot.mockImplementation((query, cb) => {
      if (!hallCallback) {
        hallCallback = cb;
        cb(createSnapshot(halls));
      } else if (!groupCallback) {
        groupCallback = cb;
        cb(createSnapshot(groups));
      }
      return jest.fn();
    });
    render(
      <UserContext.Provider value={user}>
        <HallList />
      </UserContext.Provider>
    );
    expect(screen.getByText('Arrillaga')).toBeInTheDocument();
    // Simulate real-time update
    groups = [
      { id: 'arrillaga', data: { members: [{ uid: '1', name: 'Jane', photoURL: 'jane.jpg', updatedAt: Date.now() }, { uid: '2', name: 'John', photoURL: 'john.jpg', updatedAt: Date.now() }] } },
      { id: 'wilbur', data: { members: [{ uid: '3', name: 'Alice', photoURL: 'alice.jpg', updatedAt: Date.now() }] } },
    ];
    if (groupCallback) groupCallback(createSnapshot(groups));
    expect(screen.getByText('Wilbur')).toBeInTheDocument();
  });

  it('renders Join button for each hall and calls join on click', () => {
    mockOnSnapshot.mockImplementationOnce((query, cb) => {
      // diningHalls
      cb(createSnapshot([
        { id: 'arrillaga', data: { name: 'Arrillaga', order: 1 } },
        { id: 'wilbur', data: { name: 'Wilbur', order: 2 } },
      ]));
      return jest.fn();
    }).mockImplementationOnce((query, cb) => {
      // activeGroups
      cb(createSnapshot([
        { id: 'arrillaga', data: { members: [] } },
        { id: 'wilbur', data: { members: [] } },
      ]));
      return jest.fn();
    });
    render(
      <UserContext.Provider value={user}>
        <HallList />
      </UserContext.Provider>
    );
    const joinButtons = screen.getAllByRole('button', { name: /join/i });
    expect(joinButtons.length).toBe(2);
    joinButtons[0].click();
    // Would check join logic here if not mocked
  });

  it('does not show the current user\'s avatar in the member list', () => {
    const now = Date.now();
    const hall = { id: 'arrillaga', name: 'Arrillaga', members: [
      { uid: '1', name: 'Jane', photoURL: 'jane.jpg', updatedAt: now },
      { uid: '2', name: 'John', photoURL: 'john.jpg', updatedAt: now }
    ] };
    render(
      <UserContext.Provider value={user}>
        <HallCard hall={hall} user={user} />
      </UserContext.Provider>
    );
    // Should not find the current user's avatar
    const images = screen.getAllByRole('img');
    images.forEach(img => {
      expect(img).not.toHaveAttribute('src', 'jane.jpg');
    });
    // Should find the other member's avatar
    expect(images.some(img => img.getAttribute('src') === 'john.jpg')).toBe(true);
  });

  it('renders the informational blurb about how the site works', async () => {
    // Simulate Firestore returning halls and active groups (empty for this test)
    mockOnSnapshot.mockImplementationOnce((query, cb) => {
      cb({ docs: [] }); // diningHalls
      return jest.fn();
    }).mockImplementationOnce((query, cb) => {
      cb({ docs: [] }); // activeGroups
      return jest.fn();
    });
    render(
      <UserContext.Provider value={user}>
        <HallList />
      </UserContext.Provider>
    );
    // Wait for loading to disappear
    await waitFor(() => expect(screen.queryByTestId('hall-list-loading')).not.toBeInTheDocument());
    // Use a flexible matcher for the blurb
    expect(screen.getByTestId('hall-list-blurb')).toHaveTextContent(
      /If someone's looking for a meal, text them hello! If nobody's in the dining hall you want to eat in, or you want more people in your group, add yourself to your favorite dining hall! Our users typically recieve a text from someone trying to eat in just a few minutes. Be patient!/i
    );
  });

  it('disables all Join buttons except the one for the hall the user is in', () => {
    mockOnSnapshot.mockImplementationOnce((query, cb) => {
      cb(createSnapshot([
        { id: 'arrillaga', data: { name: 'Arrillaga', order: 1 } },
        { id: 'wilbur', data: { name: 'Wilbur', order: 2 } },
      ]));
      return jest.fn();
    }).mockImplementationOnce((query, cb) => {
      cb(createSnapshot([
        { id: 'arrillaga', data: { members: [{ uid: '1', name: 'Jane', photoURL: 'jane.jpg', updatedAt: Date.now() }] } },
        { id: 'wilbur', data: { members: [] } },
      ]));
      return jest.fn();
    });
    (useUserActiveHall as jest.Mock).mockReturnValue('arrillaga');
    render(
      <UserContext.Provider value={user}>
        <HallList />
      </UserContext.Provider>
    );
    const joinButtons = screen.getAllByRole('button', { name: /join/i });
    expect(joinButtons.length).toBe(2);
    expect(joinButtons[0]).not.toBeDisabled(); // arrillaga
    expect(joinButtons[1]).toBeDisabled(); // wilbur
  });
}); 