/* vendor-data.js
 * Single source of truth for vendor data-access grants and pending requests.
 * Loaded by eddata-console.html (tier-approval workflow), subscriptions.html
 * (seat-capacity view), groups.html, group-access-requests.html, trial-invites.html,
 * and vendor-portal.html, so all these pages can never show different headcounts or
 * membership for the same class/group — this was a recurring bug in earlier
 * iterations of this prototype, where each file kept its own hand-typed copy of
 * the same numbers.
 *
 * grants  = access already approved (counts toward seat consumption)
 * pending = requests awaiting a decision (do NOT count toward consumption until approved)
 * headcount is a plain number on every grant/pending entry, kept alongside the
 * human-readable group label, so consumption can be summed exactly instead of
 * parsed out of Chinese text like "（3 人）".
 */
/* Shared teaching-class/group roster. A teacher can teach more than one class
 * (same subject, per Eric's 2026-07-21 scoping call — multi-subject is a later
 * phase, not modeled here). CLASSES is keyed by classId (matching the ids
 * insights.html already uses: '2b' and '1c'), each with its own groups + students —
 * pedagogical groupings are per-class, not shared, since a reading-ability grouping
 * for one class has no reason to match another class's.
 * Every grant/pending/trial entry now carries BOTH classId and groupId, since
 * groupId alone ('stretch'/'core'/'support') is not a stable identity once more
 * than one class exists — 中二乙班's 核心組 and 中一丙班's 核心組 are different
 * students. Group scope in a grant/request is still a snapshot (memberSnapshot,
 * taken when the request was made), not a live-synced number — Eric's call: access
 * shouldn't silently change just because membership did. But we still need ONE
 * ground truth to detect that drift against, which is why the roster lives here
 * rather than staying local to groups.html. */
const CLASSES = {
  '2b': {
    className:'中二乙班', subjectLabel:'中文 · 32 人 · 任教中',
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
  },
  /* Thin/sparse on purpose (per insights.html's existing "本學期剛接手" story) — only
   * 2 groups exist so far, not 3, and the roster is small. This is a real second
   * dataset, not a cosmetic label swap, so switching classes actually changes what
   * every 課堂管理 page shows. */
  '1c': {
    className:'中一丙班', subjectLabel:'中文 · 29 人 · 本學期剛接手',
    groups:[
      {id:'core', name:'核心組', color:'var(--ec-blue)', goal:'跟隨主進度，做標準課業與練習'},
      {id:'support', name:'支援組', color:'var(--ec-green)', goal:'剛接手，仍在觀察哪些學生需要較多支援'},
    ],
    students:[
      {n:'馬顯宗', g:'core'},{n:'蘇文樂', g:'core'},{n:'鄧凱兒', g:'core'},{n:'黎子軒', g:'core'},
      {n:'方雅晴', g:'support'},{n:'温家豪', g:'support'},
    ],
  },
};
const CLASS_LIST = Object.keys(CLASSES).map(id=>({id, ...CLASSES[id]}));

/* Canonical subject list — SMS's job, same reasoning as CLASSES/TEACHERS: without
 * this, 教師名冊's "部門" and 任教編配's "科目" were two separate hardcoded strings
 * that happened to agree by coincidence ("中文科"), not because they shared a
 * source. Same drift-risk pattern this suite has already been bitten by twice
 * before (headcounts, then class rosters) — smaller in scope, same fix: one list,
 * everything else references it by id. */
const SUBJECTS = [
  {id:'chi', name:'中文科'},
  {id:'ls', name:'通識科'},
];
function subjectName(id){ const s = SUBJECTS.find(x=>x.id===id); return s ? s.name : id; }

/* Teacher identity/employment record — SMS's job, same reasoning as CLASSES: the
 * status/subject/contact facts here are what everything downstream (任教編配's
 * reassignment picker, vendor invites, tool requests) should be trusting, rather
 * than each teacher-tier page silently assuming every named teacher is still
 * active. Mutate objects' fields in place (never reassign the TEACHERS array
 * itself) — same gotcha as CLASS_LIST, since other code may hold a reference. */
const TEACHERS = [
  {name:'陳老師', subjectId:'chi', contact:'chan.teacher@school.edu.hk', status:'active'},
  {name:'黃老師', subjectId:'chi', contact:'wong.teacher@school.edu.hk', status:'active'},
  {name:'李老師', subjectId:'chi', contact:'li.teacher@school.edu.hk', status:'leave'},
  {name:'馬老師', subjectId:'ls', contact:'ma.teacher@school.edu.hk', status:'departed'},
];
function activeTeachers(){ return TEACHERS.filter(t=>t.status==='active'); }

function classGroups(classId){ return (CLASSES[classId] && CLASSES[classId].groups) || []; }
function groupMembers(classId, groupId){
  const c = CLASSES[classId]; if(!c) return [];
  return c.students.filter(s=>s.g===groupId && !s.left);
}
function groupHeadcount(classId, groupId){ return groupMembers(classId, groupId).length; }
function wholeClassMembers(classId){
  const c = CLASSES[classId]; if(!c) return [];
  return c.students.filter(s=>!s.left);
}
function groupLabel(classId, groupId){
  const c = CLASSES[classId]; if(!c) return groupId;
  if(groupId==='__whole_class__') return '全班 · '+c.className;
  const g = c.groups.find(x=>x.id===groupId);
  return g ? g.name+'（'+groupHeadcount(classId, groupId)+' 人）· '+c.className : groupId+' · '+c.className;
}

/* Compares a request/grant's memberSnapshot (names at the time it was made) against
 * the group's CURRENT live membership (same class). Returns null if nothing has
 * changed, otherwise {added, removed} name lists — surfaced as a "please reconfirm"
 * nudge, never used to silently change what's already been approved. */
function membershipDrift(entry){
  if(!entry.classId || !entry.groupId || !entry.memberSnapshot) return null;
  const current = entry.groupId==='__whole_class__'
    ? wholeClassMembers(entry.classId).map(s=>s.n)
    : groupMembers(entry.classId, entry.groupId).map(s=>s.n);
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
      {group:'增潤組（3 人）· 中二乙班', classId:'2b', groupId:'stretch', memberSnapshot:['王思穎','林一心','徐朗'], headcount:3, teacher:'陳老師', tier:'Tier 1 · 基本資料', since:'2026-06-20'},
    ],
    pending:[
      {id:'r1', teacher:'陳老師', group:'支援組（2 人）· 中二乙班', classId:'2b', groupId:'support', memberSnapshot:['李俊希','鄭家朗'], headcount:2, src:'來自教學分組（groups.html）', status:'pending', _pickedTier:null},
      {id:'r2', teacher:'黃老師', group:'核心組（6 人）· 中二乙班', classId:'2b', groupId:'core', memberSnapshot:['陳嘉欣','何梓晴','黃俊傑','吳詠芝','周天恩','簡愛琳'], headcount:6, src:'來自教學分組（groups.html）', status:'pending', _pickedTier:null},
    ],
  },
  {
    id:'diandu', name:'點讀教育', product:'中文分級閱讀庫',
    vetting:{status:'certified', label:'✓ 已通過基準認證', note:'合規閘 5/5 通過'},
    grants:[
      {group:'全班 · 中一甲班', classId:null, groupId:null, memberSnapshot:null, headcount:32, teacher:'黃老師', tier:'Tier 1 · 基本資料', since:'2026-07-15'},
    ],
    /* Second-class example: 陳老師 also teaches 中一丙班, and has a request pending
     * there — this is what makes multi-class support real rather than cosmetic. */
    pending:[
      {id:'r4', teacher:'陳老師', group:'核心組（4 人）· 中一丙班', classId:'1c', groupId:'core', memberSnapshot:['馬顯宗','蘇文樂','鄧凱兒','黎子軒'], headcount:4, src:'來自教學分組（groups.html）', status:'pending', _pickedTier:null},
    ],
  },
  {
    id:'unknownvendor', name:'字詞通 AI（新供應商）', product:'AI 詞彙診斷工具',
    vetting:{status:'none', label:'⚠ 尚未提交供應商審核', note:'未見於供應商審核佇列（vetting.html），按管治規則，任何層級都不應在此核准，須先完成合規閘'},
    grants:[],
    pending:[
      {id:'r3', teacher:'黃老師', group:'核心組（6 人）· 中二乙班', classId:'2b', groupId:'core', memberSnapshot:['陳嘉欣','何梓晴','黃俊傑','吳詠芝','周天恩','簡愛琳'], headcount:6, src:'來自教學分組（groups.html）', status:'pending', _pickedTier:null},
    ],
  },
];

/* Vendor-initiated trial requests — shared between trial-invites.html (teacher's
 * confirm/decline inbox), eddata-console.html (IT's confirm/decline queue), and
 * vendor-portal.html (where a vendor sends the invite), so all three pages show
 * the same trial at the same stage instead of each assuming a different state.
 *
 * Lifecycle: awaiting_teacher → pending_it → active → graduated
 *                            ↘ declined              ↗ (graduate button)
 *                                        pending_it ↗
 * A decline at either stage sets declinedBy, a reason, and a cooldownUntil date;
 * during the cooldown the same vendor cannot re-pitch the same class+group. */
const TRIALS = [
  {id:'t1', vendor:'點讀教育', vendorId:'diandu', teacher:'陳老師', classId:'2b', groupId:'stretch', group:'增潤組（3 人）· 中二乙班', headcount:3,
   tool:'中文分級閱讀庫 · 進階版試用', status:'pending_it', expiresAt:'2026-08-04',
   declineReason:null, cooldownUntil:null, declinedBy:null},
  {id:'t2', vendor:'語音通 AI', vendorId:null, teacher:'黃老師', classId:'2b', groupId:'core', group:'核心組（5 人）· 中二乙班', headcount:5,
   tool:'AI 朗讀評測（試用版）', status:'declined', expiresAt:null,
   declineReason:'試用期內評語準確度不足，未能分辨聲調錯誤與地道口音差異。', cooldownUntil:'2026-11-05', declinedBy:'it'},
  {id:'t3', vendor:'智寫科技', vendorId:'zhixie', teacher:'陳老師', classId:'2b', groupId:'support', group:'支援組（2 人）· 中二乙班', headcount:2,
   tool:'AI 詞彙診斷追蹤（試用版）', status:'awaiting_teacher', expiresAt:null,
   declineReason:null, cooldownUntil:null, declinedBy:null},
  /* Second-class example, so trial-invites.html's class-switcher has something
   * real to show under 中一丙班 too. */
  {id:'t4', vendor:'點讀教育', vendorId:'diandu', teacher:'陳老師', classId:'1c', groupId:'support', group:'支援組（2 人）· 中一丙班', headcount:2,
   tool:'中文分級閱讀庫 · 入門版試用', status:'awaiting_teacher', expiresAt:null,
   declineReason:null, cooldownUntil:null, declinedBy:null},
];

/* Does requesting `groupId` in `classId` for `vendorId` overlap with access that
 * vendor already has (granted or pending) for THIS class? Whole-class vs.
 * per-group is the one overlap this prototype checks, and it's scoped to a single
 * class — a whole-class request in 中一丙班 has nothing to do with per-group grants
 * in 中二乙班. Returns a human note to show the requester and (via the pending
 * entry's overlapNote field) the approver, or null if no overlap. */
function scopeOverlapNote(vendorId, classId, groupId){
  const v = VENDORS.find(x=>x.id===vendorId);
  if(!v) return null;
  const subGroupIds = classGroups(classId).map(g=>g.id);
  const inClass = e => e.classId===classId;
  const covered = new Set([
    ...v.grants.filter(inClass).map(g=>g.groupId).filter(Boolean),
    ...v.pending.filter(p=>p.status==='pending' && inClass(p)).map(p=>p.groupId).filter(Boolean),
  ]);
  if(groupId==='__whole_class__'){
    const already = subGroupIds.filter(id=>covered.has(id));
    if(already.length){
      const names = already.map(id=>classGroups(classId).find(g=>g.id===id).name).join('、');
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
 * can be joined against it from either page. Seat caps are school-wide (a
 * commercial contract with the school), not per-class, so usage sums grants
 * across ALL classes for that vendor — no classId parameter needed here. */
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
