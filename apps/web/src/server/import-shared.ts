import 'server-only';
import type {PoolClient} from 'pg';
/** The API connector and session CSV importer share the same portal serialization key. */
export async function lockContactPortal(c:PoolClient,company:string,portal:string){await c.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[`${company}:portal:${portal}`]);}
export async function contactEmailCollision(c:PoolClient,company:string,portal:string,email:string,target:string){return (await c.query('SELECT id FROM bcs.recipients WHERE company_id=$1 AND portal_id=$2 AND email_normalized=$3 AND target_id<>$4 LIMIT 1',[company,portal,email,target])).rowCount!==0;}
