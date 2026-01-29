const API_CONFIG = {
  // API URLやヘッダーを変更する場合はここを更新してください。
  endpoint: "https://api.ojosama.jiro4989.com",
  headers: {
    "Content-Type": "application/json"
  },
  timeoutMs: 10000
};

const storage = chrome.storage.session;

const statusEl = document.getElementById("status");
const successEl = document.getElementById("success");
const errorEl = document.getElementById("error");
const originalEl = document.getElementById("original");
const convertedEl = document.getElementById("converted");
const errorMessageEl = document.getElementById("error-message");
const retryButton = document.getElementById("retry");
const retryErrorButton = document.getElementById("retry-error");
const copyButton = document.getElementById("copy");
const toastEl = document.getElementById("toast");

let currentRequestId = "";
let currentText = "";

init();

async function init() {
  currentRequestId = window.location.hash.replace("#", "");
  if (!currentRequestId) {
    showError("リクエストIDが見つかりません。再度実行してください。", "");
    return;
  }

  const result = await storage.get(currentRequestId);
  const payload = result[currentRequestId];

  if (!payload) {
    showError("データが見つかりません。もう一度変換を実行してください。", "");
    return;
  }

  if (payload.status === "error") {
    showError(payload.error?.message ?? "不明なエラーが発生しました。", payload.error?.details);
    return;
  }

  currentText = payload.text ?? "";
  if (!currentText) {
    showError("変換対象のテキストがありません。", "");
    return;
  }

  await convertText();
}

retryButton.addEventListener("click", () => {
  convertText();
});

retryErrorButton.addEventListener("click", () => {
  convertText();
});

copyButton.addEventListener("click", async () => {
  const text = convertedEl.textContent ?? "";
  if (!text) {
    showToast("コピーするテキストがありません。", true);
    return;
  }

  try {
    await navigator.clipboard.writeText(text);
    showToast("コピーしました。", false);
  } catch (error) {
    showToast("コピーに失敗しました。", true);
  }
});

async function convertText() {
  showStatus("変換中…");
  hidePanels();

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.timeoutMs);

  try {
    const response = await fetch(API_CONFIG.endpoint, {
      method: "POST",
      headers: API_CONFIG.headers,
      body: JSON.stringify({ Text: currentText }),
      signal: controller.signal
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const resultText = data?.Result ?? data?.result;
    if (typeof resultText !== "string") {
      throw new Error("レスポンス形式が不正です。");
    }

    showSuccess(currentText, resultText);
    await storage.set({
      [currentRequestId]: {
        id: currentRequestId,
        createdAt: Date.now(),
        status: "success",
        text: currentText,
        result: resultText
      }
    });
  } catch (error) {
    let message = "変換に失敗しました。";
    let details = "";
    if (error.name === "AbortError") {
      message = "タイムアウトしました。";
    } else if (error instanceof Error) {
      details = error.message;
    }

    showError(message, details);
    await storage.set({
      [currentRequestId]: {
        id: currentRequestId,
        createdAt: Date.now(),
        status: "error",
        text: currentText,
        error: {
          message,
          details
        }
      }
    });
  } finally {
    clearTimeout(timeoutId);
  }
}

function showStatus(message) {
  statusEl.textContent = message;
  statusEl.classList.remove("hidden");
}

function showSuccess(original, converted) {
  statusEl.classList.add("hidden");
  successEl.classList.remove("hidden");
  errorEl.classList.add("hidden");
  originalEl.textContent = original;
  convertedEl.textContent = converted;
}

function showError(message, details) {
  statusEl.classList.add("hidden");
  successEl.classList.add("hidden");
  errorEl.classList.remove("hidden");
  errorMessageEl.textContent = details ? `${message}\n${details}` : message;
}

function hidePanels() {
  successEl.classList.add("hidden");
  errorEl.classList.add("hidden");
}

function showToast(message, isError) {
  toastEl.textContent = message;
  toastEl.classList.toggle("error", isError);
  toastEl.classList.remove("hidden");

  clearTimeout(showToast.timeoutId);
  showToast.timeoutId = setTimeout(() => {
    toastEl.classList.add("hidden");
  }, 2000);
}
