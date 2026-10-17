import {describe,it,expect,vi} from 'vitest';
import {dashboardDays} from '../apps/web/src/server/dashboard';
vi.mock('server-only',()=>({}));
describe('dashboard reporting filters',()=>{
 it('accepts bounded reporting periods only',()=>{expect(dashboardDays(new URLSearchParams())).toBe(30);for(const days of [7,30,90])expect(dashboardDays(new URLSearchParams({days:String(days)}))).toBe(days);});
 it.each(['days=0','days=-1','days=999','days=7&days=30','company_id=forged','portal_id=forged','days=NaN'])('rejects forged scope or invalid periods: %s',query=>{expect(()=>dashboardDays(new URLSearchParams(query))).toThrow();});
});
