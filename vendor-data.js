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
/* Shared teaching-group roster — single source for groups.html's drag-and-drop board
 * AND for detecting membership drift on vendor requests/grants. Group scope in a
 * grant/request is a snapshot (memberSnapshot, taken when the request was made), not
 * a live-synced number — Eric's call: access shouldn't silently change just because
 * membership did. But we still need ONE ground truth to detect that drift against,
 * which is why the roster itself lives here rather than staying local to groups.html. */
const ROSTER = {
  className:'中二乙班',
  groups:[
    {id:'stretch', name:'增潤組', color:'var(--ec-purple)', goal:'進度較快，適合延伸閱讀與較深的寫作任務'},
    {id:'core', name:'核心組', color:'var(--ec-blue)', goal:'跟隨主進度，做標準課業與練習'},
    {id:'support', name:'支援組', color:'var(--ec-green)', goal:'需要多些時間，由你親自帶領'},
  ],
  students:[
    {n:'王思穎', g:'stretch'},{n:'林一心', g:'stretch'},{n:'徐朗', g:'stretch'},
    {n:'陳嘉欣', g:'core'},{n:'何梓晴', g:'core'},{n:'黃俊傑', g:'core'},{n:'吳詠芝', g:'core'},{n:'周天恩', g:'core'},
    {n:'李俊希', g:'support'},{n:'鄭家朗', g:'support'},
    {n:'簡愛琳', g:'core', left:true},
  ],
};
function groupMembers(groupId){ return ROSTER.students.filter(s=>s.g===groupId && !s.left); }
function groupHeadcount(groupId){ return groupMembers(groupId).length; }
function wholeClassMembers(){ return ROSTER.students.filter(s=>!s.left); }
function groupLabel(groupId){
  if(groupId==='__whole_class__') return '全班 · '+ROSTER.className;
  const g = ROSTER.groups.find(x=>x.id===groupId);
  return g ? g.name+'（'+groupHeadcount(groupId)+' 人）· '+ROSTER.className : groupId;
}

/* Compares a request/grant's memberSnapshot (names at the time it was made) against
 * the group's CURRENT live membership. Returns null if nothing has changed, otherwise
 * {added, removed} name lists — surfaced as a "please reconfirm" nudge, never used to
 * silently change what's already been approved. */
function membershipDrift(entry){
  if(!entry.groupId || !entry.memberSnapshot) return null;
  const current = entry.groupId==='__whole_class__' ? wholeClassMembers().map(s=>s.n) : groupMembers(entry.groupId).map(s=>s.n);
  const before = entry.memberSnapshot;
  const added = current.filter(n=>!before.includes(n));
  const removed = before.filter(n=>!current.includes(n));
  if(!added.length && !removed.length) return null;
  return {added, removed};
}

const VENDORS = [
  {
    id:'zhixie', name:'智寫科技', product:'寫作回饋工具',
    vetting:{status:'certified', label:'✓ 已通過基準認證', note:'合規閘 5/5 通過（見供應商審核 vetting.html）'},
    grants:[
      {group:'增潤組（3 人）· 中二乙班', groupId:'stretch', memberSnapshot:['王思穎','林一心','徐朗'], headcount:3, teacher:'陳老師', tier:'Tier 1 · 基本資料', since:'2026-06-20'},
    ],
    pending:[
      {id:'r1', teacher:'陳老師', group:'支援組（2 人）· 中二乙班', groupId:'support', memberSnapshot:['李俊希','鄭家朗'], headcount:2, src:'來自教學分組（groups.html）', status:'pending', _pickedTier:null},
      {id:'r2', teacher:'黃老師', group:'核心組（6 人）· 中二乙班', groupId:'core', memberSnapshot:['陳嘉欣','何梓晴','黃俊傑','吳詠芝','周天恩','簡愛琳'], headcount:6, src:'來自教學分組（groups.html）', status:'pending', _pickedTier:null},
    ],
  },
  {
    id:'diandu', name:'點讀教育', product:'中文分級閱讀庫',
    vetting:{status:'certified', label:'✓ 已通過基準認證', note:'合規閘 5/5 通過'},
    grants:[
      {group:'全班 · 中一甲班', groupId:null, memberSnapshot:null, headcount:32, teacher:'黃老師', tier:'Tier 1 · 基本資料', since:'2026-07-15'},
    ],
    pending:[],
  },
  {
    id:'unknownvendor', name:'字詞通 AI（新供應商）', product:'AI 詞彙診斷工具',
    vetting:{status:'none', label:'⚠ 尚未提交供應商審核', note:'未見於供應商審核佇列（vetting.html），按管治規則，任何層級都不應在此核准，須先完成合規閘'},
    grants:[],
    pending:[
      {id:'r3', teacher:'黃老師', group:'核心組（6 人）· 中二乙班', groupId:'core', memberSnapshot:['陳嘉欣','何梓晴','黃俊傑','吳詠芝','周天恩','簡愛琳'], headcount:6, src:'來自教學分組（groups.html）', status:'pending', _pickedTier:null},
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

/* Does requesting `groupId` for `vendorId` overlap with access that vendor already
 * has (granted or pending) for this class? Whole-class vs. per-group is the one
 * overlap this prototype checks — returns a human note to show the requester and
 * (via the pending entry's overlapNote field) the approver, or null if no overlap. */
function scopeOverlapNote(vendorId, groupId){
  const v = VENDORS.find(x=>x.id===vendorId);
  if(!v) return null;
  const subGroupIds = ROSTER.groups.map(g=>g.id);
  const covered = new Set([
    ...v.grants.map(g=>g.groupId).filter(Boolean),
    ...v.pending.filter(p=>p.status==='pending').map(p=>p.groupId).filter(Boolean),
  ]);
  if(groupId==='__whole_class__'){
    const already = subGroupIds.filter(id=>covered.has(id));
    if(already.length){
      const names = already.map(id=>ROSTER.groups.find(g=>g.id===id).name).join('、');
      return '此供應商已就 '+names+' 持有存取或待審批請求，全班申請會與此重疊，建議由資訊科技統籌一併檢視。';
    }
  } else if(covered.has('__whole_class__')){
    return '此供應商已持有全班存取或待審批請求，這個分組申請可能重疊，建議由資訊科技統籌一併檢視。';
  }
  return null;
}

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
