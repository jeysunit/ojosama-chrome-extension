const MENU_PARENT_ID = "ojosama-parent";
const MENU_CHILD_ID = "ojosama-convert";

const storage = chrome.storage.session;

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: MENU_PARENT_ID,
      title: "お嬢様変換",
      contexts: ["selection"]
    });

    chrome.contextMenus.create({
      id: MENU_CHILD_ID,
      parentId: MENU_PARENT_ID,
      title: "選択範囲を変換",
      contexts: ["selection"]
    });
  });
});

chrome.contextMenus.onClicked.addListener(async (info) => {
  if (info.menuItemId !== MENU_CHILD_ID) {
    return;
  }

  const selectionText = info.selectionText ? info.selectionText.trim() : "";
  const requestId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  if (!selectionText) {
    await storage.set({
      [requestId]: {
        id: requestId,
        createdAt: Date.now(),
        status: "error",
        error: {
          message: "テキストを選択してから実行してください。"
        }
      }
    });
    await openResultTab(requestId);
    return;
  }

  await storage.set({
    [requestId]: {
      id: requestId,
      createdAt: Date.now(),
      status: "ready",
      text: selectionText
    }
  });

  await openResultTab(requestId);
});

async function openResultTab(requestId) {
  const url = chrome.runtime.getURL(`result.html#${requestId}`);
  await chrome.tabs.create({ url });
}
