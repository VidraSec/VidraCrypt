# VidraCrypt

Uses [age](https://github.com/FiloSottile/age) or actually the JavaScript implementation [typage](https://github.com/FiloSottile/typage) to decrypt files entirely on the client side.

The server never sees the cleartext file or the passphrase.

## Usage

### Create encrypted files

Encrypted files must use UUIDv4-style filenames. Place them in the `files/` subdirectory:

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

Now run a local web server in the root directory of this repository

``` bash
python -m http.server
```

Browse to the decrypt page with the file UUID in the URL fragment:

``` plain
http://localhost:8080/#01234567-89ab-cdef-0123-456789abcdef
```

Enter the passphrase in the page. The decrypted zip will download automatically.

## Notes

* Works entirely in the browser; the passphrase is never sent to the server.
* Modern browsers only (Chrome, Firefox, Edge, Safari).
* For production, serve over HTTPS.
* Status messages are shown inline below the passphrase input.
