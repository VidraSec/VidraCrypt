const CODES = {
  SUCCESS: 0,
  NO_PASSWORD: 1,
  MISSING_FILENAME: 5,
  BAD_FILENAME: 6,
  WRONG_PASSWORD: 2,
  FETCH_ERROR: 3,
  FETCH_NOT_OK: 7,
  UNKNOWN_ERROR: 4
};

// matches UUID v4 format: 8-4-4-4-12 hex chars
const UUID_RE = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

function getEncryptedFilename() {
  const fragment = window.location.hash;
  if (!fragment || fragment.length < 2) return null;
  return fragment.slice(1);
}

function isUuidFilename(name) {
  return UUID_RE.test(name);
}

async function decryptFile() {
  const pass = document.getElementById("pass").value;
  if (!pass) return CODES.NO_PASSWORD;

  const filename = getEncryptedFilename();
  if (!filename) return CODES.MISSING_FILENAME;
  if (!isUuidFilename(filename)) return CODES.BAD_FILENAME;

  let ciphertext;
  try {
    const res = await fetch("files/" + filename, { credentials: "omit" });
    if (!res.ok) return CODES.FETCH_NOT_OK;
    ciphertext = new Uint8Array(await res.arrayBuffer());
  } catch (e) {
    return CODES.FETCH_ERROR;
  }

  const d = new age.Decrypter();
  d.addPassphrase(pass);

  let plaintext;
  try {
    plaintext = await d.decrypt(ciphertext, "binary");
  } catch (e) {
    return CODES.WRONG_PASSWORD;
  }

  try {
    const blob = new Blob([plaintext], { type: "application/zip" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);

    // output name is hardcoded for now, because we don't want the server to know
    const outName = "report.zip";
    a.download = outName;
    a.click();

    // free memory
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  } catch (e) {
    return CODES.UNKNOWN_ERROR;
  }

  return CODES.SUCCESS;
}

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("decryptForm");
  const statusEl = document.getElementById("status");

  form.onsubmit = async (e) => {
    e.preventDefault(); // prevent page reload

    // show decryption started message
    statusEl.textContent = "Decryption started, please wait...";
    statusEl.className = "status info";

    // give the browser a chance to render the message
    await new Promise(requestAnimationFrame);

    const result = await decryptFile();

    switch(result) {
      case CODES.NO_PASSWORD:
        statusEl.textContent = "Please enter a password";
        statusEl.className = "status error";
        break;
      case CODES.MISSING_FILENAME:
        statusEl.textContent = "No filename specified in URL fragment";
        statusEl.className = "status error";
        break;
      case CODES.BAD_FILENAME:
        statusEl.textContent = "Invalid filename. Expected UUIDv4-style name";
        statusEl.className = "status error";
        break;
      case CODES.FETCH_NOT_OK:
      case CODES.FETCH_ERROR:
        statusEl.textContent = "Encrypted file could not be loaded";
        statusEl.className = "status error";
        break;
      case CODES.WRONG_PASSWORD:
        statusEl.textContent = "The password is incorrect or file is corrupted";
        statusEl.className = "status error";
        break;
      case CODES.SUCCESS:
        statusEl.textContent = "File decrypted successfully!";
        statusEl.className = "status success";
        break;
      default:
        statusEl.textContent = "Unknown error";
        statusEl.className = "status error";
    }
  };
});
