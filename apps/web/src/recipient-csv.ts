import {displayCsvDate,parseCsvDate,type ExportDateFormat} from '../../../packages/contracts/src/csv-date';
import type { Recipient, RecipientDetails } from '@bcs/contracts';
import { csvDocument, csvHeaders } from '../../../packages/contracts/src/contact-csv';
export type ExportRecipient = Recipient & Partial<RecipientDetails> & { category?: string };
export function recipientCsv(rows: readonly ExportRecipient[], dateFormat:ExportDateFormat='ISO') {
  return csvDocument([csvHeaders, ...rows.map(r => [
    r.targetId ?? r.id, r.name, r.email, r.group, r.subgroup ?? '', r.category ?? '',
    r.grade ?? r.stage ?? '', displayCsvDate(parseCsvDate(r.dob??'').iso,dateFormat), r.gender ?? '', r.mobileNo ?? '',
    r.whatsappNo ?? '', r.address1 ?? '', r.address2 ?? '', r.city ?? '',
    r.pin ?? '', r.stateName ?? '', r.districtName ?? '', r.status,
  ])]);
}
