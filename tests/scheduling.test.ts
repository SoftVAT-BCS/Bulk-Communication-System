import {describe,it,expect} from 'vitest';
import {scheduleInstant,scheduleIds} from '../apps/web/src/server/schedule-validation';
describe('schedule validation',()=>{
 it('converts explicit local timezone to UTC',()=>expect(scheduleInstant('2027-01-01T10:00','Asia/Kolkata')).toBe('2027-01-01T04:30:00.000Z'));
 it('rejects nonexistent calendar dates',()=>expect(()=>scheduleInstant('2027-02-30T10:00','UTC')).toThrow());
 it('rejects invalid timezones',()=>expect(()=>scheduleInstant('2027-01-01T10:00','Invalid/Zone')).toThrow());
 it('rejects spring daylight-saving gaps',()=>expect(()=>scheduleInstant('2027-03-14T02:30','America/New_York')).toThrow('NONEXISTENT_LOCAL_TIME'));
 it('rejects ambiguous fall daylight-saving values',()=>expect(()=>scheduleInstant('2027-11-07T01:30','America/New_York')).toThrow('AMBIGUOUS_LOCAL_TIME'));
 it('validates scoped identifier syntax before database access',()=>{expect(()=>scheduleIds(['invalid'])).toThrow();expect(()=>scheduleIds(['00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000001'])).toThrow();expect(scheduleIds([])).toEqual([]);});
});
