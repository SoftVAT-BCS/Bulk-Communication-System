BEGIN;
SET LOCAL search_path=pg_catalog;
DO $$ BEGIN IF current_database()<>'bcs_consolidated_isolated' OR NOT COALESCE((SELECT shobj_description(oid,'pg_database')='BCS_DISPOSABLE_SYNTHETIC_ONLY' FROM pg_database WHERE datname=current_database()),false) OR NOT COALESCE((SELECT rolsuper FROM pg_roles WHERE rolname=current_user),false) OR NOT EXISTS(SELECT 1 FROM bcs.schema_migrations WHERE version=24) OR EXISTS(SELECT 1 FROM bcs.schema_migrations WHERE version=25) THEN RAISE EXCEPTION '025 order/target mismatch'; END IF; END $$;
ALTER TABLE bcs.campaigns ADD COLUMN approved_revision integer;
CREATE FUNCTION bcs.review_campaign(campaign uuid,expected integer,decision text,reason text) RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE row bcs.campaigns; actor uuid; rev integer;
BEGIN
 SELECT * INTO STRICT row FROM bcs.campaigns WHERE id=campaign FOR UPDATE;
 IF NOT bcs.session_allows(row.company_id,row.portal_id,'campaigns.approve') THEN RAISE EXCEPTION 'Review not authorized'; END IF;
 SELECT principal_id INTO STRICT actor FROM bcs.application_sessions WHERE token_hash=current_setting('bcs.session_hash',true) AND expires_at>now() AND revoked_at IS NULL;
 IF row.created_by=actor OR row.revision<>expected OR row.state<>'review' OR decision NOT IN ('approve','reject') THEN RAISE EXCEPTION 'Independent reviewer/current revision required'; END IF;
 IF decision='approve' AND NOT EXISTS(SELECT 1 FROM bcs.audience_selections WHERE company_id=row.company_id AND portal_id=row.portal_id AND id=row.selection_id AND selection_status='locked' AND expires_at>now()) THEN RAISE EXCEPTION 'Audience snapshot unavailable'; END IF;
 IF decision='reject' AND nullif(btrim(reason),'') IS NULL THEN RAISE EXCEPTION 'Rejection reason required'; END IF;
 UPDATE bcs.campaigns SET state=CASE WHEN decision='approve' THEN 'approved' ELSE 'draft' END,revision=revision+1,approved_revision=CASE WHEN decision='approve' THEN revision+1 ELSE NULL END,approved_by=CASE WHEN decision='approve' THEN actor ELSE NULL END,approved_at=CASE WHEN decision='approve' THEN now() ELSE NULL END WHERE id=campaign RETURNING revision INTO rev;
 INSERT INTO bcs.audit_events(company_id,portal_id,actor_principal_id,action,entity_type,entity_reference,safe_metadata) VALUES(row.company_id,row.portal_id,actor,'campaign.'||decision,'campaign',campaign::text,jsonb_build_object('revision',rev,'reason',left(reason,500)));
 RETURN rev;
END $$;
REVOKE ALL ON FUNCTION bcs.review_campaign(uuid,integer,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION bcs.review_campaign(uuid,integer,text,text) TO bcs_app_backend;
CREATE FUNCTION bcs.enforce_resource_quota() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE cap bigint; used bigint; metric text; duplicate boolean;
BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended(NEW.company_id::text,25));
 IF TG_TABLE_NAME='recipients' THEN metric='contacts';SELECT EXISTS(SELECT 1 FROM bcs.recipients WHERE company_id=NEW.company_id AND portal_id=NEW.portal_id AND target_id=NEW.target_id) INTO duplicate;
 ELSIF TG_TABLE_NAME='principals' THEN metric='users';SELECT EXISTS(SELECT 1 FROM bcs.principals WHERE company_id=NEW.company_id AND identity_issuer=NEW.identity_issuer AND external_subject=NEW.external_subject) INTO duplicate;
 ELSE metric='portals';SELECT EXISTS(SELECT 1 FROM bcs.portals WHERE company_id=NEW.company_id AND portal_code=NEW.portal_code) INTO duplicate; END IF;
 IF duplicate THEN RETURN NEW; END IF;
 SELECT (p.plan_limits->>metric)::bigint INTO cap FROM bcs.company_subscriptions s JOIN bcs.saas_plans p ON p.plan_code=s.plan_code AND p.status='active' WHERE s.company_id=NEW.company_id AND s.state IN ('trial','active') AND s.begins_at<=now() AND s.ends_at>now();
 IF cap IS NULL OR cap<1 THEN RAISE EXCEPTION 'Approved subscription quota required'; END IF;
 EXECUTE format('SELECT count(*) FROM bcs.%I WHERE company_id=$1',TG_TABLE_NAME) INTO used USING NEW.company_id;
 IF used>=cap THEN RAISE EXCEPTION 'Tenant resource quota exhausted'; END IF;RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION bcs.enforce_resource_quota() FROM PUBLIC;
CREATE TRIGGER quota_recipients BEFORE INSERT ON bcs.recipients FOR EACH ROW EXECUTE FUNCTION bcs.enforce_resource_quota();
CREATE TRIGGER quota_principals BEFORE INSERT ON bcs.principals FOR EACH ROW EXECUTE FUNCTION bcs.enforce_resource_quota();
CREATE TRIGGER quota_portals BEFORE INSERT ON bcs.portals FOR EACH ROW EXECUTE FUNCTION bcs.enforce_resource_quota();
-- Provisioning inserts a subscription before its first portal/user. Existing companies
-- require approved plans before this migration is deployed; no implicit unlimited plan.
INSERT INTO bcs.schema_migrations(version,description) VALUES(25,'Independent campaign review and atomic company resource quotas');
COMMIT;
