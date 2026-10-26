// @vitest-environment jsdom
import { StrictMode } from 'react';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { BcsActivateAccount } from '../apps/web/src/bcs-activate-account';

afterEach(() => {
  cleanup();
  window.history.replaceState(null, '', '/');
});

describe('invitation URL captured once under React Strict Mode', () => {
  it('retains the email invite token after clearing the URL fragment', async () => {
    const tokenHash = 'a'.repeat(64);
    window.history.replaceState(null, '', `/activate#token_hash=${tokenHash}&type=invite`);
    render(<StrictMode><BcsActivateAccount /></StrictMode>);
    await waitFor(() => expect(screen.getByLabelText('Create password *')).toBeTruthy());
    expect(screen.getByLabelText('Confirm password *')).toBeTruthy();
    expect(window.location.hash).toBe('');
    expect(screen.queryByText(/Invitation link is missing or invalid/i)).toBeNull();
  });

  it('accepts a token in query parameters for compatibility with redirect links', async () => {
    window.history.replaceState(null, '', `/activate?token_hash=${'b'.repeat(64)}&type=invite`);
    render(<StrictMode><BcsActivateAccount /></StrictMode>);
    await waitFor(() => expect(screen.getByLabelText('Create password *')).toBeTruthy());
    expect(window.location.search).toBe('');
  });

  it('does not permit password setup without an invitation', async () => {
    window.history.replaceState(null, '', '/activate');
    render(<StrictMode><BcsActivateAccount /></StrictMode>);
    await waitFor(() => expect(screen.getByRole('alert').textContent).toMatch(/Invitation link is missing or invalid/i));
    expect(screen.queryByLabelText('Create password *')).toBeNull();
  });
});
