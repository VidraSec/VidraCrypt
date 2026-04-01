# VidraCrypt

Uses [age](https://github.com/FiloSottile/age) or actually the JavaScript implementation [typage](https://github.com/FiloSottile/typage) to decrypt files entirely on the client side.

The server never sees the cleartext file or the passphrase.

## Usage

### Create encrypted files

Encrypted files must use UUIDv4-style filenames. Place them in the `app/files/` subdirectory:

```bash
age -e -p -o $(uuidgen) <to-encrypt>.zip
```

#### Full Example

**for testing purposes only:**

* clear text should never touch the server
* python http.server should not be used in production

``` bash
echo 123 > to-encrypt.txt
zip to-encrypt.zip to-encrypt.txt
age -e -p -o $(uuidgen) to-encrypt.zip
# follow instruction to create a password
```

Now run a local web server in the root directory of this repository:

``` bash
python -m http.server
```

Browse to the decrypt page with the file UUID in the URL fragment:

``` plain
http://localhost:8000/app/#01234567-89ab-cdef-0123-456789abcdef
```

Enter the passphrase in the page. The decrypted zip will download automatically.

## Live demo

A GitHub Pages demo is available here:

[https://vidrasec.github.io/VidraCrypt/app/#06861552-deb6-4f71-b962-17ff9a55f307](https://vidrasec.github.io/VidraCrypt/app/#06861552-deb6-4f71-b962-17ff9a55f307)

Test password: `123`

## Notes

* Works entirely in the browser; the passphrase is never sent to the server.
* Modern browsers only (Chrome, Firefox, Edge, Safari).
* For production, serve over HTTPS.
* Status messages are shown inline below the passphrase input.

## Troubleshooting

* **"No filename specified in URL fragment"**: open the page with a UUIDv4 hash, e.g. `/app/#06861552-deb6-4f71-b962-17ff9a55f307`
* **"Invalid filename"**: the hash must be a strict UUIDv4 (`xxxxxxxx-xxxx-4xxx-[89ab]xxx-xxxxxxxxxxxx`)
* **"Encrypted file could not be loaded"**: confirm the encrypted file exists in `app/files/` and that your web server is running from the repository root
* **"The password is incorrect or file is corrupted"**: verify the passphrase and ensure the encrypted input file was produced by `age -e -p`

## Dependency Integrity

This project ships a vendored `app/age-0.3.0.js`. Before deploying, verify its checksum in your CI/CD or release process:

```bash
sha256sum app/age-0.3.0.js
```
