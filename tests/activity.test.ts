import {describe,it,expect} from 'vitest';
import {activityFilter} from '../apps/web/src/server/activity-validation';
describe('activity report filters',()=>{
 it('accepts bounded pagination and filters',()=>expect(activityFilter(new URLSearchParams('kind=queue&page=2&size=50&from=2026-01-01&to=2026-12-31'))).toMatchObject({kind:'queue',page:2,size:50}));
 it.each(['kind=admin','company_id=x','portal_id=x','size=1000','page=-1','sort=title;DELETE','from=2026-02-30','from=2026-12-01&to=2026-01-01','kind=queue&kind=messages','id=invalid'])('rejects unsafe filters: %s',value=>expect(()=>activityFilter(new URLSearchParams(value))).toThrow());
});
