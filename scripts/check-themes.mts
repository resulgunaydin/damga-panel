import { getTheme, THEME_LIST, DEFAULT_THEME_ID, themeHead } from "../lib/presentation/themes";
import assert from "node:assert";

assert.equal(getTheme(undefined).id, DEFAULT_THEME_ID, "boş id → varsayılan");
assert.equal(getTheme("yok-boyle-tema").id, DEFAULT_THEME_ID, "bilinmeyen id → varsayılan");
assert.equal(getTheme("cesur").id, "cesur", "geçerli id korunur");
assert.equal(THEME_LIST.length, 6, "6 tema olmalı");
for (const t of THEME_LIST) {
  const head = themeHead(t, "#17913a");
  assert.ok(head.includes("--accent:#17913a"), t.id + ": accent gömülü");
  assert.ok(head.includes(t.fontsHref), t.id + ": font linki gömülü");
}
console.log("check-themes OK");
