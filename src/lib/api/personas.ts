import { Persona } from '../../types';
import { apiGet, apiPost, apiPut, apiDelete, apiPostFormData } from './client';

export async function fetchPersonas(): Promise<Persona[]> {
  return await apiGet<Persona[]>('/personas/');
}

export async function createPersona(persona: Partial<Persona>): Promise<Persona> {
  return await apiPost<Persona>('/personas/', persona);
}

export async function updatePersona(id: string, persona: Partial<Persona>): Promise<Persona> {
  return await apiPut<Persona>(`/personas/${id}`, persona);
}

export async function deletePersona(id: string): Promise<void> {
  return await apiDelete<void>(`/personas/${id}`);
}

export async function uploadPersonaAvatar(id: string, file: File): Promise<{avatar_url: string}> {
  const formData = new FormData();
  formData.append('file', file);
  return await apiPostFormData<{avatar_url: string}>(`/personas/${id}/avatar`, formData);
}
