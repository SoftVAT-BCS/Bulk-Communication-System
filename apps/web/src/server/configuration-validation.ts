import {ReadError} from './validation';
import {text} from './campaign-validation';
export function alias(value:unknown,optional=false){if(optional&&(value===''||value===undefined))return null;const v=text(value,120);if(!/^[a-z][a-z0-9_-]*(?:\/[a-z0-9_-]+)*$/.test(v))throw new ReadError(400,'SERVER_ALIAS_REQUIRED');return v;}
export function identifier(value:unknown){const v=text(value,80);if(!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(v))throw new ReadError(400,'INVALID_IDENTIFIER');return v;}
export function choice(value:unknown,allowed:string[]){if(!allowed.includes(String(value)))throw new ReadError(400,'INVALID_CHOICE');return String(value);}
export function timezone(value:unknown){const v=text(value,80);try{new Intl.DateTimeFormat('en',{timeZone:v}).format();}catch{throw new ReadError(400,'INVALID_TIMEZONE');}return v;}
export function bounded(value:unknown,min:number,max:number){const n=Number(value);if(!Number.isFinite(n)||n<min||n>max)throw new ReadError(400,'INVALID_NUMBER');return n;}
