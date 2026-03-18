import type { CreateProgressionRequest, UpdateProgressionRequest } from '../types';

async function readErrorMessage(response: Response, fallback: string) {
  try {
    const body = (await response.json()) as { message?: string };
    return body.message || fallback;
  } catch {
    return fallback;
  }
}

export async function createProgression(payload: CreateProgressionRequest) {
  const response = await fetch('/api/progressions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response, 'Failed to save progression'));
  }

  return response.json();
}

export async function getMyProgressions() {
  const response = await fetch('/api/progressions');

  if (!response.ok) {
    throw new Error(await readErrorMessage(response, 'Failed to fetch progressions'));
  }

  return response.json();
}

export async function getProgression(id: string) {
  const response = await fetch(`/api/progressions/${id}`);

  if (!response.ok) {
    throw new Error(await readErrorMessage(response, 'Failed to fetch progression'));
  }

  return response.json();
}

export async function updateProgression(id: string, payload: UpdateProgressionRequest) {
  const response = await fetch(`/api/progressions/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response, 'Failed to update progression'));
  }

  return response.json();
}

export async function deleteProgression(id: string) {
  const response = await fetch(`/api/progressions/${id}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response, 'Failed to delete progression'));
  }
}

export async function getSharedProgression(shareId: string) {
  const response = await fetch(`/api/shared/${shareId}`);

  if (!response.ok) {
    throw new Error(await readErrorMessage(response, 'Failed to fetch shared progression'));
  }

  return response.json();
}

export async function getPublicProgressions(filters?: { tag?: string; key?: string }) {
  const searchParams = new URLSearchParams();

  if (filters?.tag?.trim()) {
    searchParams.set('tag', filters.tag.trim());
  }

  if (filters?.key?.trim()) {
    searchParams.set('key', filters.key.trim());
  }

  const query = searchParams.toString();
  const response = await fetch(query ? `/api/shared?${query}` : '/api/shared');

  if (!response.ok) {
    throw new Error(await readErrorMessage(response, 'Failed to fetch public progressions'));
  }

  return response.json();
}
