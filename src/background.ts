// Toolbar icon → own popup window bound to the clicked tab. Stateless, safe to be suspended.
chrome.action.onClicked.addListener(async (tab) => {
  if (tab.id == null) return;
  const url = chrome.runtime.getURL(`app.html?tab=${tab.id}`);
  const wins = await chrome.windows.getAll({ populate: true });
  const existing = wins.find((w) => w.tabs?.some((t) => t.url === url));
  if (existing) await chrome.windows.update(existing.id!, { focused: true });
  else await chrome.windows.create({ url, type: 'popup', width: 380, height: 680 });
});
