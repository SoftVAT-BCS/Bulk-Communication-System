import { verify,createPublicKey } from 'node:crypto';
export interface EmbedAssertion { iss:string; aud:string; sub:string; company:string; portal:string; origin:string; redirect:string; jti:string; iat:number; exp:number }
export interface EmbedIssuer { issuer:string; audience:string; company:string; portals:string[]; origins:string[]; redirects:string[]; publicKey:string; permissions:string[] }
export function verifyEmbed(assertion:string,signature:string,issuer:EmbedIssuer,now=Math.floor(Date.now()/1000)):EmbedAssertion {
  if(createPublicKey(issuer.publicKey).asymmetricKeyType!=='ed25519')throw Error('ED25519_KEY_REQUIRED');
  if(assertion.length>4096||signature.length>256||!verify(null,Buffer.from(assertion),createPublicKey(issuer.publicKey),Buffer.from(signature,'base64url')))throw Error('INVALID_EMBED_SIGNATURE');
  const a=JSON.parse(Buffer.from(assertion,'base64url').toString('utf8')) as EmbedAssertion;
  if(a.iss!==issuer.issuer||a.aud!==issuer.audience||a.company!==issuer.company||!issuer.portals.includes(a.portal)||!issuer.origins.includes(a.origin)||!issuer.redirects.includes(a.redirect)||typeof a.sub!=='string'||!a.sub||typeof a.jti!=='string'||!/^[A-Za-z0-9_-]{16,100}$/.test(a.jti)||!Number.isSafeInteger(a.iat)||!Number.isSafeInteger(a.exp)||a.iat>now+5||a.iat<now-60||a.exp<=now||a.exp>a.iat+60)throw Error('EMBED_SCOPE_OR_EXPIRY_DENIED');
  return a;
}
