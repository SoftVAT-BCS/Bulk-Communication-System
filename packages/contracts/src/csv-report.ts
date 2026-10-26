import type {CsvError} from './contact-csv';
export type CsvOutcome={row:number;result:'Inserted'|'Updated'|'Skipped'|'Rejected';code?:string};
export interface CsvReceipt {batchId:string;upload?:string;chunk?:number;chunks?:number;mode?:string;total:number;validated:number;inserted:number;updated:number;skipped:number;rejected:number;emailCollisions:number;groupErrors:number;completedAt:string;errors:CsvError[];outcomes?:CsvOutcome[]}
export const csvErrorGuide:Record<string,{field:string;description:string;correction:string}>={
 TARGET_EXISTS:{field:'Contact ID',description:'Contact ID already exists in this Company/Portal.',correction:'Choose Skip Existing or Update Existing intentionally, or supply a new Contact ID.'},
 UNKNOWN_OR_AMBIGUOUS_SUBGROUP:{field:'Group / Subgroup',description:'The supplied Group/Subgroup does not uniquely match an active entry in the current portal.',correction:'Verify the authenticated portal and use its active Group/Subgroup names.'},
 EMAIL_COLLISION:{field:'Email',description:'Email already belongs to another Contact ID within the authorized portal.',correction:'Correct the email or Contact ID; existing contacts will not be merged.'},
 DUPLICATE_TARGET:{field:'Contact ID',description:'The file repeats this Contact ID.',correction:'Keep one row per Contact ID.'},
 INVALID_DATE:{field:'Date of Birth',description:'The date could not be interpreted safely.',correction:'Choose the correct date format and correct impossible dates.'},
 AMBIGUOUS_DATE:{field:'Date of Birth',description:'Day and month are ambiguous.',correction:'Select the source date format explicitly.'},
 INVALID_EMAIL:{field:'Email',description:'The email address is invalid.',correction:'Correct the email address.'},
};
export function explainCsvError(code:string){return csvErrorGuide[code]??{field:code.includes('DATE')?'Date of Birth':'Row',description:code.replaceAll('_',' '),correction:'Correct the indicated value and validate again.'};}
export function receiptTotals(receipts:CsvReceipt[]){return receipts.reduce((a,r)=>{for(const k of Object.keys(a) as (keyof typeof a)[])a[k]+=r[k]??0;return a;},{total:0,validated:0,inserted:0,updated:0,skipped:0,rejected:0,emailCollisions:0,groupErrors:0});}
/** Legacy totals cannot identify individual mixed successes. Never infer them. */
export function receiptOutcome(receipt:CsvReceipt,row:number):string{
 const explicit=receipt.outcomes?.find(r=>r.row===row);if(explicit)return explicit.result;
 if(receipt.errors.some(e=>e.row===row))return 'Rejected';
 return 'Committed — row outcome unavailable';
}
export function importStatus({busy,loading,failed,cancelled,processed,total,rejected}:{busy:boolean;loading:boolean;failed:boolean;cancelled:boolean;processed:number;total:number;rejected:number}){
 if(loading)return 'Validating';if(busy)return 'Importing';if(failed)return processed?'Partially Completed':'Failed';if(cancelled&&processed<total)return processed?'Partially Completed':'Cancelled';if(total&&processed===total)return rejected?'Completed with Errors':'Completed';return total?'Ready':'File Selected';
}
