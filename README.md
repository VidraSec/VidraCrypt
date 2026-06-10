# VidraCrypt

Browser-based file decryption using [age](https://github.com/FiloSottile/age) (via the JavaScript implementation [typage](https://github.com/FiloSottile/typage)).

The server never sees the cleartext file or the passphrase — decryption happens entirely in the browser.

## Usage

### Encrypt a file

Use `add-to-files.sh` to encrypt a file with `age` (passphrase mode):

```bash
./add-to-files.sh <input-file>
```

The script generates a UUIDv4 filename, encrypts the file, and prints the passphrase and URL fragment to use.

Set `FILES_PUBLIC_BASE_URL` to your file host's base URL to get a ready-made `#get=<base64url>` fragment:

```bash
FILES_PUBLIC_BASE_URL=https://files.example.com ./add-to-files.sh my-archive.zip
```

`upsert-file-metadata.py` is called automatically to keep a local `file-metadata.json` index of encrypted files (original name, encrypted UUID, file URL).

### Decrypt a file

Open the app URL with a `#get=<base64url-encoded-file-url>` fragment:

```
https://your-host/app/#get=<base64url>
```

Enter the passphrase — the decrypted file downloads automatically.

## Live demo

<https://vidrasec.github.io/VidraCrypt/app/#get=aHR0cHM6Ly92aWRyYXNlYy5naXRodWIuaW8vVmlkcmFDcnlwdC8wNjg2MTU1Mi1kZWI2LTRmNzEtYjk2Mi0xN2ZmOWE1NWYzMDc>

Test password: `123`

## Security headers

`app/_headers` contains a strict set of security headers ready for [Cloudflare Pages](https://developers.cloudflare.com/pages/configuration/headers/) deployments. For other platforms, mirror the directives from that file as appropriate.

## Notes

- Works entirely in the browser; the passphrase is never sent to the server.
- Modern browsers only (Chrome, Firefox, Edge, Safari).
- Serve over HTTPS in production.

## Dependency integrity

This project ships a vendored `app/age-0.3.0.js`. Verify its checksum before deploying:

```bash
sha256sum app/age-0.3.0.js
```
