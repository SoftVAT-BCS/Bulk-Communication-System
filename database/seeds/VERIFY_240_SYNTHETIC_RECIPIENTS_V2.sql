-- READ ONLY. Execute in bcs-dev after both SQL files report success.
WITH demo AS (
  SELECT r.* FROM bcs.recipients r
  JOIN bcs.companies c ON c.id = r.company_id
  JOIN bcs.portals p ON p.id = r.portal_id AND p.company_id = r.company_id
  WHERE c.company_code = 'softvat-bcs-demo'
    AND p.portal_code = 'skillmonk-demo'
)
SELECT
 (SELECT count(*) FROM bcs.schema_migrations WHERE version = 9) AS geography_migration_applied,
 (SELECT count(*) FROM demo) AS recipients,
 (SELECT count(*) FROM demo WHERE status = 'Active') AS active,
 (SELECT count(*) FROM demo WHERE status = 'Inactive') AS inactive,
 (SELECT count(*) FROM demo WHERE status = 'Bounced') AS bounced,
 (SELECT count(*) FROM demo WHERE status = 'Unsubscribed') AS unsubscribed,
 (SELECT count(*) FROM demo WHERE grade IS NOT NULL AND dob IS NOT NULL
    AND gender IS NOT NULL AND mobile_no IS NOT NULL AND whatsapp_no IS NOT NULL
    AND address_1 IS NOT NULL AND address_2 IS NOT NULL AND city IS NOT NULL
    AND pin IS NOT NULL AND state_name IS NOT NULL AND district_name IS NOT NULL) AS enriched_records,
 (SELECT count(DISTINCT recipient_group) FROM demo) AS groups,
 (SELECT count(DISTINCT (recipient_group,category)) FROM demo) AS group_subgroups;

-- Safe sample display; do not export and distribute even synthetic contact placeholders as real contacts.
SELECT r.target_id, r.name, r.grade, r.dob, r.gender,
       r.mobile_no, r.whatsapp_no, r.address_1, r.address_2,
       r.city, r.pin, r.district_name, r.state_name, r.status
FROM bcs.recipients r
JOIN bcs.companies c ON c.id = r.company_id
JOIN bcs.portals p ON p.id = r.portal_id AND p.company_id = r.company_id
WHERE c.company_code = 'softvat-bcs-demo'
  AND p.portal_code = 'skillmonk-demo'
ORDER BY r.target_id
LIMIT 12;
