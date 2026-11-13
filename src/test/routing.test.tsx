import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Sidebar from '../components/Sidebar';
import { UserProfile } from '../types';

describe('Frontend Navigation & Routing Integrity', () => {
  const mockUser: UserProfile = {
    id: 'usr-123',
    username: 'testauthor',
    displayName: 'Test Author',
    email: 'test@example.com',
    role: 'Writer',
    coins: 100,
    themePreference: 'dark',
    profileImage: '',
    bio: 'Author bio',
    isVerified: true,
    isActive: true,
    createdAt: '2026-01-01',
    lastLogin: '2026-01-01',
  };

  it('renders Sidebar with all primary navigation items', () => {
    const setView = vi.fn();
    const setIsExpanded = vi.fn();
    const onLogout = vi.fn();

    render(
      <Sidebar
        currentView="home"
        setView={setView}
        isExpanded={true}
        setIsExpanded={setIsExpanded}
        unreadNotifications={0}
        currentUser={mockUser}
        onLogout={onLogout}
      />
    );

    expect(screen.getAllByText('Home')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Communities')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Library')[0]).toBeInTheDocument();
    expect(screen.getAllByText('My Stories')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Personas')[0]).toBeInTheDocument();
  });

  it('clicking My Stories triggers setView to my-stories', () => {
    const setView = vi.fn();
    const setIsExpanded = vi.fn();
    const onLogout = vi.fn();

    render(
      <Sidebar
        currentView="home"
        setView={setView}
        isExpanded={true}
        setIsExpanded={setIsExpanded}
        unreadNotifications={0}
        currentUser={mockUser}
        onLogout={onLogout}
      />
    );

    const myStoriesBtn = document.getElementById('nav-my-stories') || screen.getAllByText('My Stories')[0];
    fireEvent.click(myStoriesBtn);
    expect(setView).toHaveBeenCalledWith('my-stories');
  });

  it('clicking Personas triggers setView to personas', () => {
    const setView = vi.fn();
    const setIsExpanded = vi.fn();
    const onLogout = vi.fn();

    render(
      <Sidebar
        currentView="home"
        setView={setView}
        isExpanded={true}
        setIsExpanded={setIsExpanded}
        unreadNotifications={0}
        currentUser={mockUser}
        onLogout={onLogout}
      />
    );

    const personasBtn = document.getElementById('nav-personas') || screen.getAllByText('Personas')[0];
    fireEvent.click(personasBtn);
    expect(setView).toHaveBeenCalledWith('personas');
  });

  it('highlights the active current view item in Sidebar', () => {
    const setView = vi.fn();
    const setIsExpanded = vi.fn();
    const onLogout = vi.fn();

    const { rerender } = render(
      <Sidebar
        currentView="my-stories"
        setView={setView}
        isExpanded={true}
        setIsExpanded={setIsExpanded}
        unreadNotifications={0}
        currentUser={mockUser}
        onLogout={onLogout}
      />
    );

    const myStoriesButton = document.getElementById('nav-my-stories');
    expect(myStoriesButton).toHaveClass('text-violet-400');

    rerender(
      <Sidebar
        currentView="personas"
        setView={setView}
        isExpanded={true}
        setIsExpanded={setIsExpanded}
        unreadNotifications={0}
        currentUser={mockUser}
        onLogout={onLogout}
      />
    );

    const personasButton = document.getElementById('nav-personas');
    expect(personasButton).toHaveClass('text-violet-400');
  });
});
