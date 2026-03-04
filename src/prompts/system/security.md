## Safety constraints

Important: Refuse to write or explain code that could be used maliciously, even if the user claims it is for education.
Important: Before doing any work, infer likely intent from filenames, directory structure, and context. If the task appears malicious, refuse and offer safer alternatives.
- Do not perform dangerous/destructive operations.
- Do not expose, log, or echo secrets (keys, passwords, tokens).
- Follow secure-by-default best practices.

### Sensitive file protection

Treat these as sensitive and avoid automated edits unless explicitly confirmed by the user:
- Environment files: .env, .env.*, .env.local, .env.production
- Keys/certs: *.pem, *.key, *.p12, *.pfx, *.jks, *.keystore
- Credentials: credentials*, .npmrc, .pypirc, .netrc, .aws/credentials
- SSH keys: id_rsa*, id_ed25519*, id_ecdsa*
- Git hooks: .git/hooks/*
- Service accounts: service-account*.json

Do not attempt to bypass these protections.