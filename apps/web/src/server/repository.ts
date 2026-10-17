import type { AudienceOptions, DatabaseRecipientPage, Recipient, RecipientDetails, RecipientFilter } from "@bcs/contracts";
import type { Connection, Scope } from "./transaction";
import { ReadError, sortColumns } from "./validation";
const summary = `r.id::text, r.name, r.email, ''::text AS "groupId", r.recipient_group AS "group", r.category AS subgroup, coalesce(r.grade,'') AS stage, r.status, to_char(r.created_at,'YYYY-MM-DD') AS joined`;
const details = `r.target_id AS "targetId", r.grade, to_char(r.dob,'YYYY-MM-DD') AS dob, r.gender, r.mobile_no AS "mobileNo", r.whatsapp_no AS "whatsappNo", r.address_1 AS "address1", r.address_2 AS "address2", r.city, r.pin, r.state_name AS "stateName", r.district_name AS "districtName", r.st_id AS "stId", r.dt_id AS "dtId"`;
export class RecipientRepository {
  constructor(private db: Connection, private scope: Scope) {}
  async options(): Promise<AudienceOptions> {
    const values = [this.scope.company, this.scope.portal];
    const groups = await this.db.query("SELECT id::text, group_name AS name FROM bcs.audience_groups WHERE company_id=$1::uuid AND portal_id=$2::uuid AND status='active' ORDER BY group_name,id", values);
    const subgroups = await this.db.query("SELECT s.id::text, s.subgroup_name AS name, s.group_id::text AS \"groupId\" FROM bcs.audience_subgroups s JOIN bcs.audience_groups g ON g.company_id=s.company_id AND g.portal_id=s.portal_id AND g.id=s.group_id WHERE s.company_id=$1::uuid AND s.portal_id=$2::uuid AND s.status='active' AND g.status='active' ORDER BY s.subgroup_name,s.id", values);
    return { groups: groups.rows, subgroups: subgroups.rows };
  }
  async page(filter: RecipientFilter): Promise<DatabaseRecipientPage> {
    if (filter.groups.length || filter.subgroups.length) {
      const options = await this.options();
      if (filter.groups.some(id => !options.groups.some(g => g.id === id)) || filter.subgroups.some(id => !options.subgroups.some(s => s.id === id && (!filter.groups.length || filter.groups.includes(s.groupId))))) throw new ReadError(400, "INVALID_FILTER");
    }
    const values: unknown[] = [this.scope.company, this.scope.portal, filter.status === 'All statuses' ? null : filter.status, filter.search, [...filter.groups], [...filter.subgroups]];
    const where = `r.company_id=$1::uuid AND r.portal_id=$2::uuid AND ($3::text IS NULL OR r.status=$3)
 AND ($4::text='' OR position(lower($4) in lower(r.name))>0 OR position(lower($4) in lower(r.email))>0 OR position(lower($4) in lower(r.target_id))>0 OR position(lower($4) in lower(r.recipient_group))>0)
 AND ((cardinality($5::uuid[])=0 AND cardinality($6::uuid[])=0) OR EXISTS (SELECT 1 FROM bcs.recipient_group_memberships m
 WHERE m.company_id=r.company_id AND m.portal_id=r.portal_id AND m.recipient_id=r.id
 AND (cardinality($5::uuid[])=0 OR m.group_id=ANY($5::uuid[])) AND (cardinality($6::uuid[])=0 OR m.subgroup_id=ANY($6::uuid[]))))`;
    const count = await this.db.query(`SELECT count(*)::int AS total, count(*) FILTER (WHERE r.status='Active')::int AS eligible FROM bcs.recipients r WHERE ${where}`, values);
    const { total, eligible } = count.rows[0];
    const page = Math.min(filter.page, Math.max(0, Math.ceil(total / filter.size) - 1));
    const result = await this.db.query<Recipient>(`SELECT ${summary}, r.target_id AS "targetId" FROM bcs.recipients r WHERE ${where} ORDER BY ${sortColumns[filter.sort]} ${filter.descending ? 'DESC' : 'ASC'}, r.id ASC LIMIT $7 OFFSET $8`, [...values, filter.size, page * filter.size]);
    return { rows: result.rows, total, eligible, meta: { page, size: filter.size, total, eligible } };
  }
  async detail(id: string): Promise<RecipientDetails> {
    const result = await this.db.query<RecipientDetails>(`SELECT ${summary}, ${details} FROM bcs.recipients r WHERE r.company_id=$1::uuid AND r.portal_id=$2::uuid AND r.id=$3::uuid`, [this.scope.company, this.scope.portal, id]);
    if (!result.rows.length) throw new ReadError(404, "RECIPIENT_NOT_FOUND");
    return result.rows[0];
  }
}
