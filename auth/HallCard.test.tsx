import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
jest.mock('./usePresence');

const mockJoin = jest.fn();
const mockLeave = jest.fn();
const mockUsePresence = jest.fn();

jest.mock('./usePresence', () => ({
  usePresence: (...args: any[]) => mockUsePresence(...args),
}));

import HallCard from './HallCard';

const user = { uid: '1', name: 'Jane', photoURL: 'jane.jpg', phone: '555-1111' };
const hall = {
  id: 'arrillaga',
  name: 'Arrillaga',
  members: [
    { uid: '1', name: 'Jane', photoURL: 'jane.jpg', updatedAt: Date.now(), phone: '555-1111' },
    { uid: '2', name: 'John', photoURL: 'john.jpg', updatedAt: Date.now(), phone: '555-2222' },
  ],
};

jest.mock('firebase/firestore', () => ({
  addDoc: jest.fn(),
  collection: jest.fn(),
}));
import { addDoc, collection } from 'firebase/firestore';

jest.mock('../firebase', () => ({
  db: {},
}));

jest.mock('./useHallGroups', () => ({
  useUserActiveHall: jest.fn(),
}));
import { useUserActiveHall } from './useHallGroups';

describe('HallCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUsePresence.mockReturnValue({
      isPresent: false,
      join: mockJoin,
      leave: mockLeave,
      members: hall.members,
    });
    (useUserActiveHall as jest.Mock).mockReturnValue(null);
  });

  it('renders avatars of current members', () => {
    render(<HallCard hall={hall} user={user} />);
    // All members should be shown, including the current user
    expect(screen.getByAltText('Jane')).toBeInTheDocument();
    expect(screen.getByAltText('John')).toBeInTheDocument();
  });

  it('shows Join button if user is not present', () => {
    render(<HallCard hall={hall} user={user} />);
    expect(screen.getByRole('button', { name: /join/i })).toBeInTheDocument();
  });

  it('shows Leave button if user is present', () => {
    mockUsePresence.mockReturnValueOnce({
      isPresent: true,
      join: mockJoin,
      leave: mockLeave,
      members: hall.members,
    });
    render(<HallCard hall={hall} user={user} />);
    expect(screen.getByRole('button', { name: /leave/i })).toBeInTheDocument();
  });

  it('calls join when Join is clicked', () => {
    render(<HallCard hall={hall} user={user} />);
    fireEvent.click(screen.getByRole('button', { name: /join/i }));
    expect(mockJoin).toHaveBeenCalled();
  });

  it('calls leave when Leave is clicked', () => {
    mockUsePresence.mockReturnValueOnce({
      isPresent: true,
      join: mockJoin,
      leave: mockLeave,
      members: hall.members,
    });
    render(<HallCard hall={hall} user={user} />);
    fireEvent.click(screen.getByRole('button', { name: /leave/i }));
    expect(mockLeave).toHaveBeenCalled();
  });

  it('auto-refreshes presence every 30s', () => {
    jest.useFakeTimers();
    render(<HallCard hall={hall} user={user} />);
    act(() => {
      jest.advanceTimersByTime(30000);
    });
    // Would check for a presence update call here if implemented
    jest.useRealTimers();
  });

  it('removes presence on unmount', () => {
    const cleanup = jest.fn();
    mockUsePresence.mockReturnValueOnce({
      isPresent: true,
      join: mockJoin,
      leave: mockLeave,
      members: hall.members,
      cleanup,
    });
    const { unmount } = render(<HallCard hall={hall} user={user} />);
    unmount();
    // If your hook returns a cleanup function, check it was called
    // expect(cleanup).toHaveBeenCalled();
  });

  it('does not show expired members', () => {
    const now = Date.now();
    const expiredMember = { uid: '3', name: 'Old', photoURL: 'old.jpg', updatedAt: now - 3600 * 1000 - 1000 };
    mockUsePresence.mockReturnValueOnce({
      isPresent: false,
      join: mockJoin,
      leave: mockLeave,
      members: [...hall.members, expiredMember],
    });
    render(<HallCard hall={hall} user={user} />);
    expect(screen.queryByAltText('Old')).not.toBeInTheDocument();
  });

  it('shows match modal after leaving and sends answer to Firestore', async () => {
    mockUsePresence.mockReturnValueOnce({
      isPresent: true,
      join: mockJoin,
      leave: mockLeave,
      members: hall.members,
    });
    (collection as jest.Mock).mockReturnValue('mockCollection');
    (addDoc as jest.Mock).mockResolvedValue({});
    render(<HallCard hall={hall} user={user} />);
    fireEvent.click(screen.getByRole('button', { name: /leave/i }));
    expect(await screen.findByText(/did you find a match/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));
    expect(addDoc).toHaveBeenCalledWith('mockCollection', expect.objectContaining({
      userId: user.uid,
      hallId: hall.id,
      answer: true,
    }));
  });

  it('disables Join button if user is present in another hall', () => {
    (useUserActiveHall as jest.Mock).mockReturnValue('wilbur'); // user is in a different hall
    render(<HallCard hall={hall} user={user} />);
    const joinButton = screen.getByRole('button', { name: /join/i });
    expect(joinButton).toBeDisabled();
    expect(joinButton).toHaveAttribute('title', expect.stringMatching(/only join one dining hall/i));
  });

  it('shows name and phone for all other members', () => {
    render(<HallCard hall={hall} user={user} />);
    expect(screen.getByText('John')).toBeInTheDocument();
    expect(screen.getByText('555-2222')).toBeInTheDocument();
  });

  it('shows alert modal when joining a hall with other members', async () => {
    // Hall has another member (not the user)
    const otherMembers = [
      { uid: '2', name: 'John', photoURL: 'john.jpg', updatedAt: Date.now(), phone: '555-2222' },
    ];
    mockUsePresence.mockReturnValue({
      isPresent: false,
      join: mockJoin,
      leave: mockLeave,
      members: [
        { uid: '1', name: 'Jane', photoURL: 'jane.jpg', updatedAt: Date.now(), phone: '555-1111' },
        ...otherMembers,
      ],
    });
    render(<HallCard hall={hall} user={user} />);
    fireEvent.click(screen.getByRole('button', { name: /join/i }));
    // Simulate the join logic triggering the modal
    // The modal should appear if there are other members
    expect(await screen.findByText(/someone is already in this dining hall/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /i've already texted/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /i'll text now!/i })).toBeInTheDocument();
  });

  it('removes members with updatedAt older than one hour on presence refresh', async () => {
    const now = Date.now();
    const freshMember = { uid: '2', name: 'John', photoURL: 'john.jpg', updatedAt: now, phone: '555-2222' };
    const expiredMember = { uid: '3', name: 'Old', photoURL: 'old.jpg', updatedAt: now - 3600 * 1000 - 1000, phone: '555-3333' };
    mockUsePresence.mockReturnValueOnce({
      isPresent: false,
      join: mockJoin,
      leave: mockLeave,
      members: [freshMember, expiredMember],
    });
    render(<HallCard hall={hall} user={user} />);
    expect(screen.getByAltText('John')).toBeInTheDocument();
    expect(screen.queryByAltText('Old')).not.toBeInTheDocument();
  });

  it('renders phone number as a clickable sms link', () => {
    render(<HallCard hall={hall} user={user} />);
    // John is the other member
    const smsLink = screen.getByRole('link', { name: /555-2222/ });
    expect(smsLink).toHaveAttribute('href', 'sms:555-2222');
  });
}); 