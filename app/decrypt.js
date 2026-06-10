const CODES = {
  SUCCESS: 0,
  NO_PASSWORD: 1,
  MISSING_GET_PARAM: 5,
  BAD_GET_PARAM: 6,
  WRONG_PASSWORD: 2,
  FETCH_ERROR: 3,
  FETCH_NOT_OK: 7,
  UNKNOWN_ERROR: 4
};

function getHashParams() {
  const fragment = window.location.hash;
  if (!fragment || fragment.length < 2) return null;
  return new URLSearchParams(fragment.slice(1));
}

function decodeBase64Utf8(input) {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}

const FILE_ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function getFileIdFromPath(pathname) {
  const pathMatch = pathname.match(/^\/[^/]+\/([^/]+)$/);
  if (!pathMatch) return null;
  const fileId = pathMatch[1];
  if (!FILE_ID_RE.test(fileId)) return null;
  return fileId;
}

async function isAllowedEncryptedFileUrl(parsedUrl) {
  if (parsedUrl.protocol !== "https:") return false;
  if (parsedUrl.username || parsedUrl.password) return false;
  if (parsedUrl.port) return false;
  if (!parsedUrl.hostname) return false;

  const fileId = getFileIdFromPath(parsedUrl.pathname);
  if (!fileId) return false;

  return true;
}

async function getEncryptedFileUrlFromHash() {
  const hashParams = getHashParams();
  if (!hashParams) return { ok: false, code: CODES.MISSING_GET_PARAM };

  const encodedGet = hashParams.get("get");
  if (!encodedGet) return { ok: false, code: CODES.MISSING_GET_PARAM };

  try {
    const decodedUrl = decodeBase64Utf8(encodedGet);
    const parsed = new URL(decodedUrl);
    if (!(await isAllowedEncryptedFileUrl(parsed))) {
      return { ok: false, code: CODES.BAD_GET_PARAM };
    }
    return { ok: true, url: parsed.toString() };
  } catch (e) {
    return { ok: false, code: CODES.BAD_GET_PARAM };
  }
}

async function decryptFile() {
  const pass = document.getElementById("pass").value;
  if (!pass) return CODES.NO_PASSWORD;

  const fileUrlResult = await getEncryptedFileUrlFromHash();
  if (!fileUrlResult.ok) return fileUrlResult.code;

  let ciphertext;
  try {
    const res = await fetch(fileUrlResult.url, { credentials: "omit" });
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
    a.download = "decrypted-file.zip";
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
  const passEl = document.getElementById("pass");
  const submitBtn = document.getElementById("decryptBtn");
  const statusEl = document.getElementById("status");
  let inProgress = false;
  const MIN_BUSY_MS = 300;

  function setBusy(isBusy) {
    passEl.disabled = isBusy;
    submitBtn.disabled = isBusy;
    form.setAttribute("aria-busy", isBusy ? "true" : "false");
  }

  form.onsubmit = async (e) => {
    e.preventDefault(); // prevent page reload
    if (inProgress) return;
    inProgress = true;
    const startedAt = Date.now();
    setBusy(true);

    // show decryption started message
    statusEl.textContent = "Decryption started, please wait...";
    statusEl.className = "status info";

    // give the browser a chance to render the message
    await new Promise(requestAnimationFrame);

    let result;
    try {
      result = await decryptFile();
    } finally {
      const elapsed = Date.now() - startedAt;
      if (elapsed < MIN_BUSY_MS) {
        await new Promise((resolve) => setTimeout(resolve, MIN_BUSY_MS - elapsed));
      }
      // avoid keeping passphrase around after each decrypt attempt
      passEl.value = "";
      inProgress = false;
      setBusy(false);
    }

    switch(result) {
      case CODES.NO_PASSWORD:
        statusEl.textContent = "Please enter a password";
        statusEl.className = "status error";
        break;
      case CODES.MISSING_GET_PARAM:
        statusEl.textContent = "Missing get parameter in URL fragment";
        statusEl.className = "status error";
        break;
      case CODES.BAD_GET_PARAM:
        statusEl.textContent = "Invalid get parameter in URL fragment";
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
