# Security policy

## Supported versions

Security fixes go into the latest release of `flickering-dots`. Please upgrade before reporting.

## Reporting a vulnerability

Please report vulnerabilities privately through [GitHub's private vulnerability reporting](https://github.com/p-nadeem/flickering-dots/security/advisories/new), not in a public issue.

Include the affected version, a minimal reproduction and the impact you see. You can expect a first reply within a few days. Once a fix is released, the advisory is published with credit to you unless you prefer otherwise.

## Scope

`flickering-dots` has no runtime dependencies and makes no network requests of its own, apart from the browser loading the package's own JavaScript chunks. Reports about how it handles untrusted set data (JSON passed to `decodeSet`, the `set` or `frames` attributes) are especially welcome.
