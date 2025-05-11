import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
jest.mock('firebase/auth');

// Mock AuthGate and dependencies
const mockSignInWithPopup = jest.fn();
const mockSignOut = jest.fn();
const mockOnAuthStateChanged = jest.fn();
const mockValidateStanfordEmail = jest.fn();

jest.mock('../firebase', () => {
  const actual = jest.requireActual('../firebase');
  return {
    ...actual,
    auth: {},
    signInWithPopup: (...args: any[]) => mockSignInWithPopup(...args),
    signOut: (...args: any[]) => mockSignOut(...args),
    onAuthStateChanged: (auth: any, cb: any) => {
      mockOnAuthStateChanged(cb);
      return jest.fn(); // Return an unsubscribe function
    },
  };
});
jest.mock('../cloudFunctions', () => ({
  validateStanfordEmail: (...args: any[]) => mockValidateStanfordEmail(...args),
}));

// Mock Firestore before importing AuthGate
const mockSetDoc = jest.fn();
const mockGetDoc = jest.fn();
jest.mock('firebase/firestore', () => ({
  getFirestore: () => ({}),
  doc: jest.fn(),
  setDoc: (...args: any[]) => mockSetDoc(...args),
  getDoc: (...args: any[]) => mockGetDoc(...args),
}));

// Minimal AuthGate stub for test (replace with real import in actual code)
import AuthGate from './AuthGate';
import type { User } from './AuthGate';

describe('AuthGate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetDoc.mockImplementation(() => ({ exists: () => false }));
    mockValidateStanfordEmail.mockResolvedValue(true);
  });

  it('renders Google login button if not authenticated', async () => {
    mockOnAuthStateChanged.mockImplementationOnce(cb => cb(null));
    render(<AuthGate children={"Protected"} />);
    expect(screen.getByRole('button', { name: /sign in with google/i })).toBeInTheDocument();
  });

  it('calls signInWithPopup on login click', async () => {
    mockOnAuthStateChanged.mockImplementationOnce(cb => cb(null));
    render(<AuthGate children={"Protected"} />);
    fireEvent.click(screen.getByRole('button', { name: /sign in with google/i }));
    expect(mockSignInWithPopup).toHaveBeenCalled();
  });

  it('allows access for @stanford.edu emails', async () => {
    mockOnAuthStateChanged.mockImplementationOnce(cb => cb({ uid: '1', email: 'jane@stanford.edu', displayName: 'Jane', photoURL: 'x' }));
    mockValidateStanfordEmail.mockResolvedValueOnce(true);
    render(<AuthGate children={"Protected"} />);
    // Submit phone number
    await waitFor(() => expect(screen.getByLabelText(/phone number/i)).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText(/phone number/i), { target: { value: '1234567890' } });
    fireEvent.click(screen.getByRole('button', { name: /submit phone/i }));
    await waitFor(() => expect(screen.getByText('Protected')).toBeInTheDocument());
  });

  it('denies access for non-Stanford emails', async () => {
    mockOnAuthStateChanged.mockImplementationOnce(cb => cb({ uid: '1', email: 'jane@gmail.com', displayName: 'Jane', photoURL: 'x' }));
    mockValidateStanfordEmail.mockResolvedValueOnce(false);
    render(<AuthGate children={"Protected"} />);
    await waitFor(() => expect(screen.getByText(/only stanford/i)).toBeInTheDocument());
  });

  it('shows loading state while checking auth', () => {
    mockOnAuthStateChanged.mockImplementationOnce(() => {});
    render(<AuthGate children={"Protected"} />);
    expect(screen.getByTestId('auth-loading')).toBeInTheDocument();
  });

  it('shows error if sign-in fails', async () => {
    mockOnAuthStateChanged.mockImplementationOnce(cb => cb(null));
    mockSignInWithPopup.mockRejectedValueOnce(new Error('Popup closed'));
    render(<AuthGate children={"Protected"} />);
    fireEvent.click(screen.getByRole('button', { name: /sign in with google/i }));
    await waitFor(() => expect(screen.getByText(/error/i)).toBeInTheDocument());
  });

  it('provides user context to children', async () => {
    mockOnAuthStateChanged.mockImplementationOnce(cb => cb({ uid: '1', email: 'jane@stanford.edu', displayName: 'Jane', photoURL: 'x' }));
    mockValidateStanfordEmail.mockResolvedValueOnce(true);
    const TestChild = () => {
      const { UserContext } = require('./HallList');
      const user = React.useContext(UserContext) as any;
      return <div>{user?.uid}</div>;
    };
    render(<AuthGate><TestChild /></AuthGate>);
    // Submit phone number
    await waitFor(() => expect(screen.getByLabelText(/phone number/i)).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText(/phone number/i), { target: { value: '1234567890' } });
    fireEvent.click(screen.getByRole('button', { name: /submit phone/i }));
    await waitFor(() => expect(screen.getByText('1')).toBeInTheDocument());
  });

  it('prompts for phone number after Google sign-in and before access', async () => {
    mockOnAuthStateChanged.mockImplementationOnce(cb => cb({ uid: '1', email: 'jane@stanford.edu', displayName: 'Jane', photoURL: 'x' }));
    mockValidateStanfordEmail.mockResolvedValueOnce(true);
    render(<AuthGate children={"Protected"} />);
    // Should prompt for phone number
    await waitFor(() => expect(screen.getByLabelText(/phone number/i)).toBeInTheDocument());
    // Enter phone number and submit
    fireEvent.change(screen.getByLabelText(/phone number/i), { target: { value: '1234567890' } });
    fireEvent.click(screen.getByRole('button', { name: /submit phone/i }));
    // Should show protected content after phone number is entered
    await waitFor(() => expect(screen.getByText('Protected')).toBeInTheDocument());
  });

  it('formats name as first name and last initial, even with middle name', async () => {
    mockOnAuthStateChanged.mockImplementationOnce(cb => cb({ uid: '1', email: 'john@stanford.edu', displayName: 'John Quincy Adams', photoURL: 'x' }));
    mockValidateStanfordEmail.mockResolvedValueOnce(true);
    let userName = '';
    const TestChild = () => {
      const { UserContext } = require('./HallList');
      const user = React.useContext(UserContext) as any;
      userName = user?.name || '';
      return <div>{user?.name}</div>;
    };
    render(<AuthGate><TestChild /></AuthGate>);
    await waitFor(() => expect(screen.getByLabelText(/phone number/i)).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText(/phone number/i), { target: { value: '1234567890' } });
    fireEvent.click(screen.getByRole('button', { name: /submit phone/i }));
    await waitFor(() => expect(screen.getByText('John A.')).toBeInTheDocument());
    expect(userName).toBe('John A.');
  });

  it('saves phone number to Firestore and loads it on next login', async () => {
    // First login: no phone in Firestore, user enters phone
    mockOnAuthStateChanged.mockImplementationOnce(cb => cb({ uid: '1', email: 'jane@stanford.edu', displayName: 'Jane', photoURL: 'x' }));
    mockValidateStanfordEmail.mockResolvedValueOnce(true);
    mockGetDoc.mockResolvedValueOnce({ exists: () => false });
    render(<AuthGate children={"Protected"} />);
    await waitFor(() => expect(screen.getByLabelText(/phone number/i)).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText(/phone number/i), { target: { value: '1234567890' } });
    fireEvent.click(screen.getByRole('button', { name: /submit phone/i }));
    await waitFor(() => expect(mockSetDoc).toHaveBeenCalled());
    // Second login: phone exists in Firestore, should skip prompt
    mockOnAuthStateChanged.mockImplementationOnce(cb => cb({ uid: '1', email: 'jane@stanford.edu', displayName: 'Jane', photoURL: 'x' }));
    mockValidateStanfordEmail.mockResolvedValueOnce(true);
    mockGetDoc.mockResolvedValueOnce({ exists: () => true, data: () => ({ phone: '1234567890' }) });
    render(<AuthGate children={"Protected"} />);
    await waitFor(() => expect(screen.getByText('Protected')).toBeInTheDocument());
  });
}); 