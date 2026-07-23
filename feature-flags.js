/* Feature flags — a fast, reversible way to hide parts of the prototype from
 * a walkthrough WITHOUT deleting or touching the underlying build. Flip a flag
 * to false and its nav entries + inline UI disappear; flip back to true and
 * everything is exactly as it was. Nothing here removes code or data.
 *
 * Load this file BEFORE demo-nav.js (and before any page's own inline script
 * that checks a flag) on every page — see the <script> order at the bottom of
 * each .html file. featureOn() is the only thing pages/demo-nav.js should call;
 * don't read FEATURE_FLAGS directly, in case this ever needs the fallback
 * default (missing key = on) applied in one place.
 *
 * Granularity note: some features are a whole standalone page (nav-level
 * hide, e.g. records-console.html) — for those, demo-nav.js filters the nav
 * entry AND the page itself shows a "hidden" placeholder if opened directly.
 * Others are a slice embedded inside a page that also covers other, unrelated
 * concerns (e.g. the 🧪試用 buttons living inside 學生工具申請, which is
 * mostly not about trials) — for those, only the specific DOM section is
 * hidden; the rest of that page is unaffected. */
const FEATURE_FLAGS = {
  // 工具試用機制 — 供應商或教師發起試用、資訊科技統籌核實、冷靜期。
  // 涉及頁面：trial-invites.html（整頁）、dept-trial-evaluations.html（整頁）、
  // vendor-portal.html 的「邀請老師試用」分頁、eddata-console.html 的「試用請求」分頁、
  // group-access-requests.html 裏的 🧪 申請試用按鈕。
  toolTrial: true,

  // 跨班學習小組（2026-07-22 新增，Story 1）。
  // 涉及頁面：groups.html 的「學習小組（跨班）」區塊、
  // group-access-requests.html 的「學習小組（跨班）」申請區。
  studyGroups: true,

  // SMS 角色與權限／RBAC（2026-07-22 新增，Story 3）。
  // 涉及頁面：roster.html 的「角色與權限」分頁。
  rolesPermissions: true,

  // 校務紀錄組身分審批（2026-07-22 新增，取代誤植於 EdData 的同一職能）。
  // 涉及頁面：records-console.html（整頁）。
  recordsApproval: true,
};

function featureOn(key){
  return FEATURE_FLAGS[key] !== false; // missing key defaults to on
}

/* Whole-page guard — call at the very top of a flagged page's own inline
 * script (before any render calls) if that ENTIRE page is behind one flag.
 * Swaps the page's main content for a plain "hidden for this walkthrough"
 * notice, without deleting any of the markup underneath (it's just display:none'd,
 * not removed from the DOM) — flip the flag back and the page is untouched. */
function guardWholePage(flagKey, mainSelector){
  if (featureOn(flagKey)) return;
  document.addEventListener('DOMContentLoaded', () => {
    const main = document.querySelector(mainSelector);
    if (!main) return;
    main.style.display = 'none';
    const notice = document.createElement('div');
    notice.style.cssText = 'max-width:640px;margin:80px auto;padding:24px 28px;background:#fff;border:1px solid #e6ebf0;border-radius:12px;font-family:"PingFang TC","Microsoft JhengHei","Noto Sans TC",sans-serif;color:#55636f;font-size:.85rem;line-height:1.7;';
    notice.innerHTML = '<b style="color:#1e2a35;display:block;margin-bottom:6px;">此畫面目前不在本輪示範範圍內</b>此頁的建置內容完全保留，只是暫時從導覽中隱藏（feature-flags.js 內的設定）。';
    main.insertAdjacentElement('afterend', notice);
  });
}
