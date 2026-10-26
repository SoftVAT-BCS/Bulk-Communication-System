import {describe,it,expect} from 'vitest';
import {ids,nextCampaignState,campaignClass} from '../apps/web/src/server/campaign-validation';
import {alias,identifier,timezone} from '../apps/web/src/server/configuration-validation';
import {contact,importBody} from '../apps/web/src/server/contact-validation';
describe('campaign transitions and selections',()=>{
 it('only allows review before approval and approval before queue preparation',()=>{expect(nextCampaignState('draft','review')).toBe('review');expect(nextCampaignState('review','approve')).toBe('approved');expect(nextCampaignState('approved','prepare')).toBe('queued');expect(()=>nextCampaignState('draft','prepare')).toThrow();expect(()=>nextCampaignState('queued','prepare')).toThrow();expect(()=>nextCampaignState('cancelled','edit')).toThrow();});
 it('editing invalidates approval',()=>expect(nextCampaignState('approved','edit')).toBe('draft'));
 it('bounds and deduplicates IDs',()=>{const id='00000000-0000-4000-8000-000000000001';expect(ids([id,id])).toEqual([id]);expect(()=>ids(['foreign'])).toThrow();expect(()=>ids(Array(1001).fill(id))).toThrow();});
 it('requires a known consent category',()=>expect(()=>campaignClass('any')).toThrow());
});
describe('configuration boundaries',()=>{
 it.each(['postgres://user:password@host/db','https://internal/','SELECT * FROM users','secret?token=abc'])('rejects raw destinations or credentials %s',v=>expect(()=>alias(v)).toThrow());
 it('accepts only symbolic aliases and discovered identifier syntax',()=>{expect(alias('bcs-native')).toBe('bcs-native');expect(identifier('target_id')).toBe('target_id');expect(()=>identifier('a; DROP TABLE')).toThrow();});
 it('rejects unknown timezone',()=>expect(()=>timezone('bad/zone')).toThrow());
});
describe('client contacts validation',()=>{
 const row={targetId:'test',name:'Synthetic',email:'TEST@example.invalid',group:'Course',subgroup:'Batch'};
 it('normalizes email and rejects unauthorized fields',()=>{expect(contact(row).email).toBe('test@example.invalid');expect(()=>contact({...row,status:'Active'})).toThrow();expect(()=>contact({...row,company_id:'forged'})).toThrow();});
 it.each([null,[],{}, {contacts:[]},{contacts:Array(101).fill(row)},{contacts:[row],company_id:'forged'}])('rejects malformed or oversized batches',v=>expect(()=>importBody(v as Record<string,unknown>)).toThrow());
 it('rejects malformed contacts without echoing their contents',()=>{expect(()=>contact(null)).toThrow('INVALID_CONTACT');expect(()=>contact({...row,email:'secret'})).toThrow('INVALID_EMAIL');});
});
