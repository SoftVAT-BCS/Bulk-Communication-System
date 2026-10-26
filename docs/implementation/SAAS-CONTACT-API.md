# SaaS contact API — local development contract

Endpoint: `http://127.0.0.1:3000/api/bcs/v1/contacts`.
This increment is development-only. It is not deployed or a publicly accessible SaaS endpoint.

## Server client identity

Provision a dedicated expiring `bcs.api_clients` identity for one authorized company and portal with only `contacts.write`. Generate 32 cryptographically random bytes encoded base64url (43 characters); store only its SHA-256 hash in PostgreSQL. Deliver the token privately to the calling server's ignored environment/secret store. Never use the PostgreSQL administrator password, Supabase service_role or browser environment as an API credential. No durable client token was created by the test probes; their isolated identities were removed.

Runtime uses the existing restricted backend connection and verified TLS. Token scope is derived in PostgreSQL through fixed-search-path `api_context` / `api_allows`; the caller cannot specify a tenant in the body. Browser Cookie or Origin requests are rejected. Client creation/rotation remains an administrator provisioning operation, not a browser form.

## Requests

POST requires `Authorization: Bearer <private token>` and `Idempotency-Key` (8–100 letters, digits, underscore or hyphen). Never paste a real token into documentation, command history or chat. Have a server script load it privately and construct headers in memory.

```json
{"contacts":[{"targetId":"demo-001","name":"Synthetic learner","email":"learner@example.invalid","group":"Course A","subgroup":"Batch A"}]}
```

Maximum 100 rows / request. Fields are strict; status, company and portal fields are rejected. New contacts start Inactive. Updates preserve Bounced/Unsubscribed; changing an active address makes it Inactive. Import does not create consent. Group/subgroup membership is normalized in the same transaction. Duplicate target/email rows and conflicting existing addresses produce recorded row errors.

Successful POST returns a batchId. Repeating an identical request with the same client/key returns the same batch without double-counting usage; changed payload returns 409. GET `?batch=<UUID>` returns status, accepted/rejected counts and safe row errors for the authorized portal. Records from another company/portal return 404.

Authenticated requests are limited to 60/minute/client. Errors use controlled codes (401 credential, 403 browser request, 400 validation, 409 idempotency conflict, 429 rate limit, controlled database-unavailable response). Accepted counts are persisted in monthly usage; this is not billing enforcement. Idempotency/rate-window retention cleanup is not scheduled in this increment.

## Verification

Dedicated isolated synthetic tenant probe passed 15 assertions covering import, retry, conflict, row errors, foreign batch denial, inactive defaults, normalized memberships, unsubscribe preservation, usage, rate limit and revoked token. Exact test records and token identity were removed. No email or AWS call occurred.

## Integration prerequisites

A privately provisioned scoped client token is required for a real calling server. Public deployment, external adapters, identity lifecycle UI, billing/quota enforcement and sending remain separate work. Native source validation is supported; no arbitrary external SQL is accepted.
