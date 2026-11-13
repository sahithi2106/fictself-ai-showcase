import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import PersonasView from '../components/PersonasView';
import * as personasApi from '../lib/api/personas';

vi.mock('../lib/api/personas', () => ({
  fetchPersonas: vi.fn(),
  createPersona: vi.fn(),
  updatePersona: vi.fn(),
  deletePersona: vi.fn(),
  uploadPersonaAvatar: vi.fn(),
}));

describe('Persona Manager (PersonasView) Component', () => {
  const mockPersonas = [
    {
      id: 'persona-1',
      user_id: 'user-123',
      display_name: 'Noble Inquisitor',
      background_text: 'A scholar of ancient arcana and forbidden secrets.',
      is_default: true,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    },
    {
      id: 'persona-2',
      user_id: 'user-123',
      display_name: 'Wandering Mercenary',
      background_text: 'Hardened warrior from the borderlands.',
      is_default: false,
      created_at: '2026-01-02T00:00:00Z',
      updated_at: '2026-01-02T00:00:00Z',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders persona cards and default persona indicator', async () => {
    vi.mocked(personasApi.fetchPersonas).mockResolvedValue(mockPersonas);

    render(<PersonasView />);

    await waitFor(() => {
      expect(screen.getByText('Noble Inquisitor')).toBeInTheDocument();
      expect(screen.getByText('Wandering Mercenary')).toBeInTheDocument();
    });

    expect(screen.getByText('Default')).toBeInTheDocument();
    expect(screen.getByText(/A scholar of ancient arcana/i)).toBeInTheDocument();
  });

  it('renders empty state when user has no personas', async () => {
    vi.mocked(personasApi.fetchPersonas).mockResolvedValue([]);

    render(<PersonasView />);

    await waitFor(() => {
      expect(screen.getByText(/No Personas Yet/i)).toBeInTheDocument();
    });
  });

  it('clicking New Persona opens the modal form', async () => {
    vi.mocked(personasApi.fetchPersonas).mockResolvedValue(mockPersonas);

    render(<PersonasView />);

    await waitFor(() => {
      expect(screen.getByText('Noble Inquisitor')).toBeInTheDocument();
    });

    const createButton = screen.getByText(/New Persona/i);
    fireEvent.click(createButton);

    expect(screen.getByPlaceholderText(/The Creator/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Set as default persona/i)).toBeInTheDocument();
  });

  it('submitting create persona form calls createPersona API', async () => {
    vi.mocked(personasApi.fetchPersonas).mockResolvedValue(mockPersonas);
    vi.mocked(personasApi.createPersona).mockResolvedValue({
      id: 'persona-3',
      user_id: 'user-123',
      display_name: 'Cybernetic Nomad',
      background_text: 'Roamer of the neon wasteland.',
      is_default: false,
      created_at: '2026-01-03T00:00:00Z',
      updated_at: '2026-01-03T00:00:00Z',
    });

    render(<PersonasView />);

    await waitFor(() => {
      expect(screen.getByText('Noble Inquisitor')).toBeInTheDocument();
    });

    // Open modal
    fireEvent.click(screen.getByText(/New Persona/i));

    // Fill form
    const nameInput = screen.getByPlaceholderText(/The Creator/i);
    fireEvent.change(nameInput, { target: { value: 'Cybernetic Nomad' } });

    const backgroundInput = screen.getByPlaceholderText(/Describe this persona/i);
    fireEvent.change(backgroundInput, { target: { value: 'Roamer of the neon wasteland.' } });

    // Submit
    const saveButton = screen.getByText('Save Persona');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(personasApi.createPersona).toHaveBeenCalledWith({
        display_name: 'Cybernetic Nomad',
        background_text: 'Roamer of the neon wasteland.',
        is_default: false,
      });
    });
  });
});
