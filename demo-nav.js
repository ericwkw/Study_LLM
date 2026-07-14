/* EdCity prototype — floating demo navigator (for walking managers through all surfaces). */
(function(){
const CSS = `
.dn-pill{position:fixed;bottom:22px;right:22px;z-index:90;background:#1e2a35;color:#fff;border:none;
  border-radius:99px;padding:11px 18px;font-size:.8rem;font-weight:600;cursor:pointer;
  font-family:"PingFang TC","Microsoft JhengHei","Noto Sans TC",sans-serif;box-shadow:0 8px 24px rgba(20,30,40,.25);}
.dn-panel{position:fixed;bottom:70px;right:22px;z-index:91;background:#fff;border:1px solid #e6ebf0;
  border-radius:16px;box-shadow:0 18px 48px rgba(20,30,40,.2);width:300px;padding:14px;display:none;
  font-family:"PingFang TC","Microsoft JhengHei","Noto Sans TC",sans-serif;}
.dn-panel.show{display:block;}
.dn-panel h6{font-size:.64rem;letter-spacing:.14em;color:#8a97a3;font-weight:700;margin:10px 4px 6px;}
.dn-panel h6:first-child{margin-top:0;}
.dn-panel a{display:flex;align-items:center;gap:8px;padding:8px 10px;border-radius:9px;
  font-size:.8rem;color:#55636f;text-decoration:none;}
.dn-panel a:hover{background:#f2f6f9;}
.dn-panel a.here{background:#e6f4fb;color:#0072ab;font-weight:600;}
.dn-panel .tag{margin-left:auto;font-size:.58rem;font-weight:700;border-radius:99px;padding:2px 7px;}
.dn-panel .tag.y{color:#8a6d00;background:#fdf1c7;}
.dn-panel .tag.r{color:#b91c1c;background:#fee2e2;}
.dn-panel .legend{font-size:.62rem;color:#8a97a3;margin-top:10px;padding:8px 4px 0;border-top:1px solid #e6ebf0;line-height:1.6;}
`;
const PAGES = [
  {group:'教師 — 現有原型', items:[
    ['index.html','AI 工具首頁',''],
    ['chat.html','AI 對話（科目助理）',''],
    ['agents.html','Apps／代理庫',''],
    ['marking.html','AI 批改（故事 1）','y'],
    ['groups.html','教學分組','y'],
    ['materials.html','教材準備（三大用例）','y'],
    ['insights.html','班級學習面貌（核心價值）','r'],
  ]},
  {group:'其他角色 — 故事場景', items:[
    ['dept.html','科主任統計視圖（故事 7）','y'],
    ['subscriptions.html','訂閱管理（故事 4）','y'],
    ['student.html','學生／家長入口（故事 8）','r'],
    ['roster.html','校管系統名冊（故事 2）','y'],
  ]},
  {group:'平台營運與供應商', items:[
    ['tags.html','標籤審核與管理（故事 6）','r'],
    ['vetting.html','供應商審核（故事 3）','y'],
    ['vendor-portal.html','供應商入口（無故事支撐）','y'],
  ]},
];
function init(){
  const style=document.createElement('style');style.textContent=CSS;document.head.appendChild(style);
  const pill=document.createElement('button');pill.className='dn-pill';pill.textContent='🧭 示範導覽';
  const panel=document.createElement('div');panel.className='dn-panel';
  const here=location.pathname.split('/').pop()||'index.html';
  panel.innerHTML = PAGES.map(g=>'<h6>'+g.group+'</h6>'+g.items.map(([f,n,t])=>
    '<a href="'+f+'"'+(f===here?' class="here"':'')+'>'+n+(t?'<span class="tag '+t+'">'+(t==='y'?'🟡 提案中':'🔴 待決策')+'</span>':'')+'</a>'
  ).join('')).join('')
  + '<div class="legend">🟡 提案中＝設計方案，未建置　🔴 待決策＝尚待管治／領導層決定<br>正式產品不會顯示此導覽。</div>';
  pill.onclick=()=>panel.classList.toggle('show');
  document.addEventListener('click',e=>{if(!e.target.closest('.dn-pill')&&!e.target.closest('.dn-panel'))panel.classList.remove('show');});
  document.body.appendChild(pill);document.body.appendChild(panel);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
