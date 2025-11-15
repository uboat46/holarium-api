# JWT Key Material

This directory stores the RSA key pairs used to sign and verify JWT access and refresh tokens. Real keys must **never** be committed to source control; they are ignored via `.gitignore`.

Use the helper script to create development keys:

```bash
yarn generate:keys
```

Re-run with `--force` to overwrite existing files. The script writes:

- `keys/access-private.pem` / `keys/access-public.pem`
- `keys/refresh-private.pem` / `keys/refresh-public.pem`

Ensure the resulting files stay readable only by trusted users on the host machine.

## Key Rotation Guidance

- **Production/Staging storage**: never commit real keys. Store them in a managed secrets system (Cloud KMS, Secret Manager, or encrypted bucket) and mount/inject them at deploy time.
- **Multiple generations**: keep both current and next key pairs available. Embed a `kid` claim in JWTs so verifiers know which public key to use.
- **Rotation steps**:
  1. Generate a fresh key pair via KMS or this script (run locally then upload securely).
  2. Update secrets/env to sign new tokens with the new private key while still exposing the old public key for verification.
  3. After all short-lived access tokens signed with the old key expire, remove the old access public key; repeat later for refresh keys once their TTL passes.
- **Automation**: schedule rotation (e.g., CI job) and restart services after secrets update so the new keys load cleanly. Monitor logs for verification errors to catch stragglers.
