import {describe,it,expect} from 'vitest';
import {recipientCsv} from '../apps/web/src/recipient-csv';
import type {Recipient} from '@bcs/contracts';
describe('authorized recipient CSV encoding',()=>{it.each(['=1+1',' +CMD','@formula','-1','\tformula'])('neutralizes spreadsheet formulas: %s',name=>{const csv=recipientCsv([{id:'1',name,email:'test@example.invalid',group:'A',subgroup:'B',status:'Active',stage:'',joined:'',groupId:''} as Recipient]);expect(csv).toContain(`"'${name}"`);});it('quotes commas and quotation marks',()=>{const csv=recipientCsv([{id:'1',name:'A, "B"',email:'test@example.invalid',group:'A',subgroup:'B',status:'Active',stage:'',joined:'',groupId:''}]);expect(csv).toContain('"A, ""B"""');expect(csv.startsWith('\ufeff')).toBe(true);});});
