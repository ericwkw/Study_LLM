/* vendor-data.js
 * Single source of truth for vendor data-access grants and pending requests.
 * Loaded by BOTH eddata-console.html (tier-approval workflow) and subscriptions.html
 * (seat-capacity view), so the two pages can never show different headcounts for
 * the same vendor relationship — this was a recurring bug in earlier iterations of
 * this prototype, where each file kept its own hand-typed copy of the same numbers.
 *
 * grants  = access already approved (counts toward seat consumption)
 * pending = requests awaiting a decision (do NOT count toward consumption until approved)
 * headcount is a plain number on every grant/pending entry, kept alongside the
 * human-readable group label, so consumption can be summed exactly instead of
 * parsed out of Chinese text like "（3 人）".
 */
const VENDORS = [
  {
    id:'zhixie', name:'智寫科技', product:'寫作回饋工具',
    vetting:{status:'certified', label:'✓ 已通過基準認證', note:'合規閘 5/5 通過（見供應商審核 vetting.html）'},
    grants:[
      {group:'增潤組（3 人）· 中二乙班', headcount:3, teacher:'陳老師', tier:'Tier 1 · 基本資料', since:'2026-06-20'},
    ],
    pending:[
      {id:'r1', teacher:'陳老師', group:'支援組（2 人）· 中二乙班', headcount:2, src:'來自教學分組（groups.html）', status:'pending', _pickedTier:null},
      {id:'r2', teacher:'黃老師', group:'核心組（5 人）· 中二乙班', headcount:5, src:'來自教學分組（groups.html）', status:'pending', _pickedTier:null},
    ],
  },
  {
    id:'diandu', name:'點讀教育', product:'中文分級閱讀庫',
    vetting:{status:'certified', label:'✓ 已通過基準認證', note:'合規閘 5/5 通過'},
    grants:[
      {group:'全班 · 中一甲班', headcount:32, teacher:'黃老師', tier:'Tier 1 · 基本資料', since:'2026-07-15'},
    ],
    pending:[],
  },
  {
    id:'unknownvendor', name:'字詞通 AI（新供應商）', product:'AI 詞彙診斷工具',
    vetting:{status:'none', label:'⚠ 尚未提交供應商審核', note:'未見於供應商審核佇列（vetting.html），按管治規則，任何層級都不應在此核准，須先完成合規閘'},
    grants:[],
    pending:[
      {id:'r3', teacher:'黃老師', group:'核心組（5 人）· 中二乙班', headcount:5, src:'來自教學分組（groups.html）', status:'pending', _pickedTier:null},
    ],
  },
];

/* Vendor-initiated trial requests — shared between trial-invites.html (teacher's
 * confirm/decline inbox) and eddata-console.html (IT's confirm/decline queue), so
 * both pages show the same trial at the same stage instead of each assuming a
 * different state.
 *
 * Lifecycle: awaiting_teacher → pending_it → active → graduated
 *                            ↘ declined              ↗ (graduate button)
 *                                        pending_it ↗
 * A decline at either stage sets declinedBy, a reason, and a cooldownUntil date;
 * during the cooldown the same vendor cannot re-pitch the same group. */
const TRIALS = [
  {id:'t1', vendor:'點讀教育', vendorId:'diandu', teacher:'陳老師', group:'增潤組（3 人）· 中二乙班', headcount:3,
   tool:'中文分級閱讀庫 · 進階版試用', status:'pending_it', expiresAt:'2026-08-04',
   declineReason:null, cooldownUntil:null, declinedBy:null},
  {id:'t2', vendor:'語音通 AI', vendorId:null, teacher:'黃老師', group:'核心組（5 人）· 中二乙班', headcount:5,
   tool:'AI 朗讀評測（試用版）', status:'declined', expiresAt:null,
   declineReason:'試用期內評語準確度不足，未能分辨聲調錯誤與地道口音差異。', cooldownUntil:'2026-11-05', declinedBy:'it'},
  {id:'t3', vendor:'智寫科技', vendorId:'zhixie', teacher:'陳老師', group:'支援組（2 人）· 中二乙班', headcount:2,
   tool:'AI 詞彙診斷追蹤（試用版）', status:'awaiting_teacher', expiresAt:null,
   declineReason:null, cooldownUntil:null, declinedBy:null},
];

/* Commercial plan caps — a separate fact from the data-tier grants above.
 * Owned conceptually by subscriptions.html (this is a contract/seat fact, not
 * a data-access fact), but kept in this shared file so the same VENDORS ids
 * can be joined against it from either page. */
const VENDOR_PLANS = {
  zhixie:  {plan:'Basic 方案',    teacherCap:4, studentCap:7,   renewal:'2026-09-30'},
  diandu:  {plan:'Standard 方案', teacherCap:8, studentCap:40,  renewal:'2026-08-15'},
};

/* Sums approved grants only — pending requests are not consumption until approved. */
function vendorUsage(vendorId){
  const v = VENDORS.find(x=>x.id===vendorId);
  if(!v) return {teachers:0, students:0};
  const teacherSet = new Set(v.grants.map(g=>g.teacher));
  const students = v.grants.reduce((sum,g)=>sum+g.headcount, 0);
  return {teachers:teacherSet.size, students};
}

/* Given a vendor's usage and its plan cap, is a would-be addition (e.g. approving
 * a pending request) going to exceed the student seat cap? Returns null if the
 * vendor has no seat-capped plan (e.g. unlimited full-school licences). */
function capacityCheck(vendorId, addStudents){
  const plan = VENDOR_PLANS[vendorId];
  if(!plan) return null;
  const usage = vendorUsage(vendorId);
  const projected = usage.students + addStudents;
  return {
    plan, usage, projected,
    overBy: Math.max(0, projected - plan.studentCap),
    pctStudents: Math.round((usage.students/plan.studentCap)*100),
    pctTeachers: Math.round((usage.teachers/plan.teacherCap)*100),
  };
}
