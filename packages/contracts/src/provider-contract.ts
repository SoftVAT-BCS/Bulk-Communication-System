export interface ProviderMessage { to:string; subject:string; html:string; text:string; attachments:{name:string;bytes:number}[] }
export interface SenderContract { region:string; email:string; verified:boolean; rate:number; daily:number }
export function validateProviderMessage(m:ProviderMessage,s:SenderContract){
  if(!/^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+$/.test(m.to)||/[\r\n]/.test(m.subject)||!m.text||!m.html||!s.verified||!s.region||!Number.isFinite(s.rate)||s.rate<=0||!Number.isSafeInteger(s.daily)||s.daily<1||m.attachments.some(a=>!Number.isSafeInteger(a.bytes)||a.bytes<0)||m.attachments.reduce((n,a)=>n+a.bytes,0)>10*1024*1024)throw Error('INVALID_PROVIDER_MESSAGE_OR_SENDER');
}
export const disabledSesAdapter={async submit(_message:ProviderMessage):Promise<never>{throw Error('SES_DISABLED_BY_RELEASE');}};
export interface VerifiedProviderEvent { eventId:string; companyId:string; messageId:string; accountId:string; signatureVerified:boolean; type:'delivery'|'bounce'|'complaint'; occurredAt:string }
export function providerEventEffect(e:VerifiedProviderEvent,scope:{companyId:string;accountId:string}){
  if(!e.signatureVerified||!e.eventId||e.companyId!==scope.companyId||e.accountId!==scope.accountId||!Number.isFinite(Date.parse(e.occurredAt)))throw Error('UNVERIFIED_PROVIDER_EVENT');
  return {deduplicationKey:`${e.companyId}:${e.accountId}:${e.eventId}`,suppress:e.type==='bounce'||e.type==='complaint',state:e.type==='delivery'?'delivered':e.type==='bounce'?'bounced':'complained'};
}
export function classifyProviderError(code:string){return ['Throttling','ServiceUnavailable'].includes(code)?'retryable':code==='Timeout'?'unknown':'permanent';}
