import { createCsrfHeaders, ensureCsrfCookie } from '../../../lib/csrfClient';
import type { CreateArrangementRequest, UpdateArrangementRequest } from '../../../lib/types';

async function readErrorMessage(response: Response, fallback: string) {
  try {
    const body = (await response.json()) as { message?: string; detail?: string };
    if (body.message && body.detail) {
      return `${body.message}: ${body.detail}`;
    }

    return body.message || body.detail || fallback;
  } catch {
    return fallback;
  }
}

export async function createArrangement(payload: CreateArrangementRequest, signal?: AbortSignal) {
  await ensureCsrfCookie();
  const response = await fetch('/api/arrangements', {
    method: 'POST',
    headers: createCsrfHeaders({
      'Content-Type': 'application/json',
    }),
    body: JSON.stringify(payload),
    signal,
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response, 'Failed to save arrangement'));
  }

  return response.json();
}

export async function getMyArrangements(signal?: AbortSignal) {
  const response = await fetch('/api/arrangements', { signal });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response, 'Failed to fetch arrangements'));
  }

  return response.json();
}

export async function getArrangement(id: string, signal?: AbortSignal) {
  const response = await fetch(`/api/arrangements/${id}`, { signal });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response, 'Failed to fetch arrangement'));
  }

  return response.json();
}

export async function updateArrangement(
  id: string,
  payload: UpdateArrangementRequest,
  signal?: AbortSignal,
) {
  await ensureCsrfCookie();
  const response = await fetch(`/api/arrangements/${id}`, {
    method: 'PUT',
    headers: createCsrfHeaders({
      'Content-Type': 'application/json',
    }),
    body: JSON.stringify(payload),
    signal,
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response, 'Failed to update arrangement'));
  }

  return response.json();
}

export async function deleteArrangement(id: string, signal?: AbortSignal) {
  await ensureCsrfCookie();
  const response = await fetch(`/api/arrangements/${id}`, {
    method: 'DELETE',
    headers: createCsrfHeaders(),
    signal,
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response, 'Failed to delete arrangement'));
  }
}

export async function getSharedArrangement(shareId: string, signal?: AbortSignal) {
  const response = await fetch(`/api/shared-arrangements/${shareId}`, { signal });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response, 'Failed to fetch shared arrangement'));
  }

  return response.json();
}
