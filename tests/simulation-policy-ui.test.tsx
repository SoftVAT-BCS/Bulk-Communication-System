import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { SimulationPolicyPanel } from '../apps/web/src/simulation-policy-panel';
import { BcsAdminLogin } from '../apps/web/src/bcs-admin-login';
it('requires explicit company input only after the existing login reports multiple memberships',async()=>{
  const fetch=vi.spyOn(globalThis,'fetch').mockResolvedValueOnce(Response.json({}, {status:401}))
    .mockResolvedValueOnce(Response.json({error:{code:'COMPANY_SELECTION_REQUIRED'}},{status:409}))
    .mockResolvedValueOnce(Response.json({error:{code:'ACCOUNT_NOT_AUTHORIZED'}},{status:403}));
  try {
    render(<BcsAdminLogin />);
    await screen.findByLabelText('Email address');expect(screen.queryByLabelText('Authorized company ID')).toBeNull();
    fireEvent.change(screen.getByLabelText('Email address'),{target:{value:'synthetic@example.invalid'}});
    fireEvent.change(screen.getByLabelText('Password'),{target:{value:'synthetic-test-input'}});
    fireEvent.click(screen.getByRole('button',{name:'Sign in →'}));
    await screen.findByLabelText('Authorized company ID');
    fireEvent.change(screen.getByLabelText('Authorized company ID'),{target:{value:'11111111-1111-4111-8111-111111111111'}});
    fireEvent.change(screen.getByLabelText('Password'),{target:{value:'synthetic-test-input'}});
    fireEvent.click(screen.getByRole('button',{name:'Sign in →'}));
    await waitFor(()=>expect(fetch).toHaveBeenCalledTimes(3));
    expect(JSON.parse(String(fetch.mock.calls[2][1]?.body)).companyId).toBe('11111111-1111-4111-8111-111111111111');
  }finally{fetch.mockRestore();}
});
it('adds shared policy controls without fake progress or active dispatch actions',()=>{
  render(<SimulationPolicyPanel campaigns={[]} count={11} onSaved={async()=>{}} />);
  expect(screen.getByRole('region',{name:'Simulation dispatch policy'})).toBeTruthy();
  expect(screen.getByRole('combobox',{name:'Simulation batch size'})).toBeTruthy();
  expect(screen.getByRole('combobox',{name:'Batch interval (seconds)'})).toBeTruthy();
  expect(screen.queryByRole('button',{name:'Resume'})).toBeNull();
  expect((screen.getByRole('button',{name:'Save simulation policy'}) as HTMLButtonElement).disabled).toBe(true);
  fireEvent.change(screen.getByRole('textbox',{name:'Simulation start instant'}),{target:{value:'2026-10-20T10:00:00Z'}});
  expect(screen.getByText(/60 seconds minimum/)).toBeTruthy();
});
it('invalid timezone remains a validation error and never issues a request',()=>{
  const fetch=vi.spyOn(globalThis,'fetch');
  try {
    render(<SimulationPolicyPanel campaigns={[]} count={0} onSaved={async()=>{}} />);
    fireEvent.change(screen.getByRole('textbox',{name:'Simulation start instant'}),{target:{value:'2026-10-20T10:00:00Z'}});
    fireEvent.change(screen.getByRole('textbox',{name:'Simulation timezone'}),{target:{value:'Invalid/Zone'}});
    expect(screen.getByText('INVALID_TIMEZONE')).toBeTruthy();expect(fetch).not.toHaveBeenCalled();
  }finally{fetch.mockRestore();}
});
