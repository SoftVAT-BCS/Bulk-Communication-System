import {describe,it,expect} from 'vitest';
import {parseCsvDate,normalizeDateRows,displayCsvDate} from '../packages/contracts/src/csv-date';
import {validateCsvContact,sampleContacts,parseContactCsv} from '../packages/contracts/src/contact-csv';
describe('locale-independent CSV calendar dates',()=>{
 it.each(['15-01-2000','01-15-2000','2000-01-15','15/01/2000','01/15/2000','2000/01/15','15.01.2000','2000.01.15','15/1/2000','15-Jan-2000','15-JAN-2000','2000-01-15T23:45:01.123-12:00','2000-01-15T00:15:00+14:00','2000-01-15T00:00Z'])('normalizes %s without timezone conversion',value=>expect(parseCsvDate(value).iso).toBe('2000-01-15'));
 it.each(['01/02/2000','1-2-2000','02.01.2000'])('requires a decision for %s',value=>expect(()=>parseCsvDate(value)).toThrow('AMBIGUOUS_DATE'));
 it('obeys explicit day/month order rather than machine locale',()=>{expect(parseCsvDate('1/2/2000','DMY').iso).toBe('2000-02-01');expect(parseCsvDate('1/2/2000','MDY').iso).toBe('2000-01-02');expect(()=>parseCsvDate('15/1/2000','MDY')).toThrow('INVALID_DATE');});
 it.each(['31/04/2000','29/02/1900','29/02/2023','2000-02-30','2000-00-15','2000-13-01','00/15/2000','15/01/00','Jan 15 2000','15-Foo-2000','2000-01/15','2000-01-15T24:00:00Z','2000-01-15T00:60:00Z','2000-01-15T00:00:00+14:30'])('rejects impossible or unsupported %s',value=>expect(()=>parseCsvDate(value)).toThrow());
 it.each(['29/02/2000','2000-02-29','2024/02/29'])('accepts actual leap days %s',value=>expect(parseCsvDate(value).iso).toMatch(/-02-29$/));
 it('uses explicit Excel epochs, skips the fake leap day, and ignores fractions as time of day',()=>{
  expect(()=>parseCsvDate('36540')).toThrow('EXCEL_DATE_SYSTEM_REQUIRED');expect(parseCsvDate('36540','EXCEL1900').iso).toBe('2000-01-15');expect(parseCsvDate('35078.75','EXCEL1904').iso).toBe('2000-01-15');
  expect(parseCsvDate('1','EXCEL1900').iso).toBe('1900-01-01');expect(parseCsvDate('59','EXCEL1900').iso).toBe('1900-02-28');expect(parseCsvDate('61','EXCEL1900').iso).toBe('1900-03-01');expect(()=>parseCsvDate('60','EXCEL1900')).toThrow('INVALID_DATE');expect(parseCsvDate('0','EXCEL1904').iso).toBe('1904-01-01');
 });
 it('handles mixed unambiguous formats but never infers ambiguous rows from their neighbors',()=>{
  const r=normalizeDateRows(['15/1/2000','1/15/2000','2000-01-15','1/2/2000',''].map(v=>({'Date of Birth':v})));
  expect(r.rows.slice(0,3).every(row=>row['Date of Birth']==='2000-01-15')).toBe(true);expect(r.errors).toEqual([{row:4,code:'AMBIGUOUS_DATE'}]);expect(r.rows[4]['Date of Birth']).toBe('');
 });
 it('keeps optional blanks and rejects future/pre-1900 DOB at the server contract',()=>{
  const r=parseContactCsv(sampleContacts())[0];expect(validateCsvContact({...r,'Date of Birth':''})['Date of Birth']).toBe('');expect(validateCsvContact({...r,'Date of Birth':'15-01-2000'})['Date of Birth']).toBe('2000-01-15');for(const d of ['1899-12-31','9999-01-01'])expect(()=>validateCsvContact({...r,'Date of Birth':d})).toThrow('INVALID_DATE');
 });
 it.each(['ISO','DMY','MDY','DMON'] as const)('round trips export %s exactly',format=>{for(const iso of ['2000-01-15','2000-02-01','2024-02-29']){const out=displayCsvDate(iso,format);expect(parseCsvDate(out,format==='ISO'?'YMD':format).iso).toBe(iso);}});
});
