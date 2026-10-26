import { Pool } from 'pg';
import mysql from 'mysql2/promise';
import sql from 'mssql';
import { lookup } from 'node:dns/promises';
import { request as httpsRequest } from 'node:https';
import { isIP } from 'node:net';
export type Engine = 'postgresql'|'mysql'|'mssql'|'portal_api';
export interface SourceConfig { engine:Engine; host:string; port:number; database:string; user:string; password:string; ca:string; schema:string; views:string[]; endpoint?:string; bearer?:string }
export interface SourceAdapter { discover():Promise<{table:string;column:string}[]>; read(table:string,key:string,cursor:string):Promise<Record<string,unknown>[]>; close():Promise<void> }
export function identifier(value:string) { if(!/^[A-Za-z_][A-Za-z0-9_]{0,62}$/.test(value))throw Error('INVALID_SOURCE_IDENTIFIER');return value; }
export function publicAddress(ip:string) {
  if(isIP(ip)!==4)return false; // IPv6 is denied until an equivalent reviewed range policy exists.
  const [a,b]=ip.split('.').map(Number);
  return !(a===0||a===10||a===127||a>=224||a===169&&b===254||a===172&&b>=16&&b<=31||a===192&&b===168||a===100&&b>=64&&b<=127||a===198&&(b===18||b===19||b===51)||a===192&&b===0||a===192&&b===88||a===203&&b===0);
}
export function restURL(value:string) {
  const u=new URL(value);if(u.protocol!=='https:'||u.username||u.password||u.hash||u.search||u.port&&u.port!=='443'||isIP(u.hostname)||u.hostname==='localhost'||!u.hostname.includes('.'))throw Error('FORBIDDEN_REST_DESTINATION');return u;
}
/** Pins the verified address to the socket; redirects are never followed. */
export async function restPage(endpoint:string,cursor:string,bearer:string) {
  const u=restURL(endpoint);const addresses=await lookup(u.hostname,{all:true});
  if(!addresses.length||addresses.some(a=>!publicAddress(a.address)))throw Error('FORBIDDEN_REST_ADDRESS');
  u.searchParams.set('after',cursor);u.searchParams.set('limit','100');
  return new Promise<Record<string,unknown>[]>((resolve,reject)=>{
    const req=httpsRequest(u,{method:'GET',rejectUnauthorized:true,servername:u.hostname,lookup:(_host,_options,cb)=>cb(null,addresses[0].address,4),headers:{Authorization:`Bearer ${bearer}`,Accept:'application/json'},timeout:8000},res=>{
      if(res.statusCode!==200){res.resume();reject(Error('REST_STATUS_REJECTED'));return;}
      let size=0;const chunks:Buffer[]=[];res.on('data',(b:Buffer)=>{size+=b.length;if(size>262144){req.destroy(Error('SOURCE_RESPONSE_TOO_LARGE'));return;}chunks.push(b);});
      res.on('end',()=>{try{const data=JSON.parse(Buffer.concat(chunks).toString('utf8'));if(!Array.isArray(data)||data.length>100||data.some(r=>!r||typeof r!=='object'||Array.isArray(r)))throw Error();resolve(data);}catch{reject(Error('INVALID_SOURCE_RESPONSE'));}});
    });req.on('timeout',()=>req.destroy(Error('SOURCE_TIMEOUT')));req.on('error',()=>reject(Error('SOURCE_UNAVAILABLE')));req.end();
  });
}
export async function openSource(c:SourceConfig):Promise<SourceAdapter> {
  if(!['postgresql','mysql','mssql','portal_api'].includes(c.engine))throw Error('UNSUPPORTED_ENGINE');
  const schema=identifier(c.schema);const view=(v:string)=>{identifier(v);if(!c.views.includes(v))throw Error('SOURCE_NOT_APPROVED');return v;};
  if(c.engine==='portal_api')return {async discover(){return c.views.map(column=>({table:'contacts',column}));},async read(table,_key,cursor){if(table!=='contacts'||!c.endpoint||!c.bearer)throw Error('REST_NOT_CONFIGURED');return restPage(c.endpoint,cursor,c.bearer);},async close(){}};
  if(!c.ca||!c.password||!c.user)throw Error('VERIFIED_TLS_AND_RESTRICTED_CREDENTIAL_REQUIRED');
  if(c.engine==='postgresql'){
    const pool=new Pool({host:c.host,port:c.port,database:c.database,user:c.user,password:c.password,ssl:{ca:c.ca,rejectUnauthorized:true},max:1,connectionTimeoutMillis:8000,query_timeout:8000,options:'-c default_transaction_read_only=on -c statement_timeout=8000'});
    return {async discover(){return (await pool.query('SELECT table_name AS table,column_name AS column FROM information_schema.columns WHERE table_schema=$1 AND table_name=ANY($2::text[]) ORDER BY table_name,ordinal_position',[schema,c.views])).rows;},async read(table,key,cursor){return (await pool.query(`SELECT * FROM "${schema}"."${view(table)}" WHERE "${identifier(key)}"::text>$1 ORDER BY "${key}"::text LIMIT 100`,[cursor])).rows;},async close(){await pool.end();}};
  }
  if(c.engine==='mysql'){
    const db=await mysql.createConnection({host:c.host,port:c.port,database:c.database,user:c.user,password:c.password,ssl:{ca:c.ca,rejectUnauthorized:true},connectTimeout:8000,multipleStatements:false});
    await db.query('SET SESSION TRANSACTION READ ONLY');
    return {async discover(){const [rows]=await db.execute('SELECT TABLE_NAME AS `table`,COLUMN_NAME AS `column` FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=? ORDER BY TABLE_NAME,ORDINAL_POSITION',[schema]);return (rows as {table:string;column:string}[]).filter(r=>c.views.includes(r.table));},async read(table,key,cursor){const [rows]=await db.execute({sql:`SELECT * FROM \`${schema}\`.\`${view(table)}\` WHERE CAST(\`${identifier(key)}\` AS CHAR)>? ORDER BY CAST(\`${key}\` AS CHAR) LIMIT 100`,timeout:8000},[cursor]);return rows as Record<string,unknown>[];},async close(){await db.end();}};
  }
  const db=await new sql.ConnectionPool({server:c.host,port:c.port,database:c.database,user:c.user,password:c.password,connectionTimeout:8000,requestTimeout:8000,pool:{max:1,min:0},options:{encrypt:true,trustServerCertificate:false,readOnlyIntent:true,cryptoCredentialsDetails:{ca:c.ca}}}).connect();
  return {async discover(){return (await db.request().input('schema',sql.NVarChar,schema).query('SELECT TABLE_NAME AS [table],COLUMN_NAME AS [column] FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@schema ORDER BY TABLE_NAME,ORDINAL_POSITION')).recordset.filter((r:{table:string})=>c.views.includes(r.table));},async read(table,key,cursor){return (await db.request().input('cursor',sql.NVarChar,cursor).query(`SELECT TOP (100) * FROM [${schema}].[${view(table)}] WHERE CAST([${identifier(key)}] AS nvarchar(200))>@cursor ORDER BY CAST([${key}] AS nvarchar(200))`)).recordset;},async close(){await db.close();}};
}
export function offlineSource(engine:Engine,rows:Record<string,unknown>[]):SourceAdapter {
  if(!['postgresql','mysql','mssql','portal_api'].includes(engine))throw Error('UNSUPPORTED_ENGINE');
  return {async discover(){return Object.keys(rows[0]??{}).map(column=>({table:'contacts',column}));},async read(table,key,cursor){if(table!=='contacts')throw Error('SOURCE_NOT_APPROVED');identifier(key);return rows.filter(r=>String(r[key])>cursor).sort((a,b)=>String(a[key]).localeCompare(String(b[key]))).slice(0,100);},async close(){}};
}
