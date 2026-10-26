import { it,expect,vi,afterEach } from 'vitest';
import { render,screen,fireEvent,waitFor } from '@testing-library/react';
vi.mock('../apps/web/src/session-gate',()=>({useSessionRights:()=>['reports.view','reports.export','queue.manage']}));
import { TenantAdministration,ConnectorConsole,ReviewConsole,SimulationConsole } from '../apps/web/src/saas-console';
afterEach(()=>vi.unstubAllGlobals());
it('does not request new administration data until explicitly opened',()=>{const fetch=vi.fn();vi.stubGlobal('fetch',fetch);render(<TenantAdministration/>);expect(screen.getByRole('button',{name:'Load my companies & portals'})).toBeTruthy();expect(fetch).not.toHaveBeenCalled();});
it('shows server denial without fake success or synthetic records',async()=>{vi.stubGlobal('fetch',vi.fn().mockResolvedValue({ok:false,json:async()=>({error:{code:'CONNECTOR_NOT_APPROVED'}})}));render(<ConnectorConsole/>);fireEvent.click(screen.getByRole('button',{name:'Load registered mappings'}));await waitFor(()=>expect(screen.getByRole('alert').textContent).toContain('CONNECTOR_NOT_APPROVED'));expect(screen.queryByText('Saved by the server.')).toBeNull();});
it('independent review has no recipient export control',()=>{render(<ReviewConsole/>);expect(screen.getByRole('button',{name:'Load campaigns awaiting review'})).toBeTruthy();expect(screen.queryByText(/export recipients/i)).toBeNull();});
it('simulation UI distinguishes outcomes and authorized CSV export',()=>{render(<SimulationConsole/>);expect(screen.getByText('Simulated submissions are not sent or delivered emails')).toBeTruthy();expect(screen.getByRole('link',{name:'Export simulation summary'}).getAttribute('href')).toBe('/api/bcs/app/simulation?format=csv');});
