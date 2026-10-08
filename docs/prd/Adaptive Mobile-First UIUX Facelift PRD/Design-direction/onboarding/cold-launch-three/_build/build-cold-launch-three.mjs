/* BIGDROPS cold-launch-three generator.
   ONE template (CSS + module JS + scene) x 2 token sets x 2 form factors
   = 4 self-contained HTML files. Run: node _build/build-cold-launch-three.mjs */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUTDIR = join(HERE, '..');
const ROOT = join(HERE, '..', '..', '..', '..', '..', '..', '..');
const THREE_VER = '0.186.1';
const THREE_URL = 'https://cdn.jsdelivr.net/npm/three@' + THREE_VER + '/build/three.module.min.js';
/* Icon: mipmap-xhdpi (96x96) is the highest density that fits the 80KB/file
   budget alongside the full scene (xxhdpi b64 alone = 58KB). Production
   builds should swap in mipmap-xxxhdpi via the asset pipeline instead. */
const ICON_B64 = readFileSync(join(ROOT, 'android/app/src/main/res/mipmap-xhdpi/ic_launcher.png')).toString('base64');
const ICON_URI = 'data:image/png;base64,' + ICON_B64;

const TOKENS = {
  linear: { scheme: 'light', bg: '#fbfbfb', surface: '#ffffff', raised: '#ffffff', muted: '#ececef', ink: '#1b1b1b', ink2: '#71737a', ink3: '#aaada9', primary: '#6e78d5', secondary: '#1b1b1b', line: 'rgba(27,27,27,.07)', linestrong: 'rgba(27,27,27,.14)', grad: 'linear-gradient(135deg,#6e78d5,#1b1b1b)', label: 'Linear' },
  amber: { scheme: 'light', bg: '#faf7f2', surface: '#ffffff', raised: '#fdfcfa', muted: '#f5f0e8', ink: '#1c1612', ink2: '#7a6e62', ink3: '#b5a99a', primary: '#b45309', secondary: '#c2410c', line: 'rgba(28,22,18,.07)', linestrong: 'rgba(28,22,18,.14)', grad: 'linear-gradient(135deg,#b45309,#c2410c)', label: 'Amber Terracotta' },
  linearDark: { scheme: 'dark', bg: '#101011', surface: '#17181a', raised: '#17181a', muted: '#141415', ink: '#e3e4e6', ink2: '#a1a2a5', ink3: '#5f6064', primary: '#e6e6e6', secondary: '#7987e1', line: 'rgba(227,228,230,.08)', linestrong: 'rgba(227,228,230,.15)', grad: 'linear-gradient(135deg,#e6e6e6,#7987e1)', label: 'Linear Dark' },
  amberDark: { scheme: 'dark', bg: '#1a1714', surface: '#242019', raised: '#2c2720', muted: '#332d24', ink: '#f5f0e8', ink2: '#c4b8a8', ink3: '#7d7264', primary: '#f59e0b', secondary: '#fb923c', line: 'rgba(245,240,232,.08)', linestrong: 'rgba(245,240,232,.15)', grad: 'linear-gradient(135deg,#f59e0b,#fb923c)', label: 'Amber Terracotta Dark' }
};
const FORMS = {
  mobile: { shell: '432px', label: 'Mobile', title: 'Mobile Fold2' },
  desktop: { shell: '1080px', label: 'Desktop', title: 'Desktop' }
};

function css(t, shell) {
  return ':root{--bg:' + t.bg + ';--surface:' + t.surface + ';--surface-raised:' + t.raised + ';--surface-muted:' + t.muted + ';--ink:' + t.ink + ';--ink-2:' + t.ink2 + ';--ink-3:' + t.ink3 + ';--primary:' + t.primary + ';--secondary:' + t.secondary + ';--line:' + t.line + ';--line-strong:' + t.linestrong + ';--gradient:' + t.grad + ';--shell-max:' + shell + ';--ease-out:cubic-bezier(.16,1,.3,1);--ease-in-out:cubic-bezier(.65,0,.35,1);--radius-card:18px;--touch:44px;--font-body:"Manrope",system-ui,sans-serif;--font-mono:"DM Mono",ui-monospace,monospace}'
    + '*{box-sizing:border-box}html,body{margin:0;min-height:100%;background:var(--bg);color:var(--ink);font-family:var(--font-body);-webkit-font-smoothing:antialiased;overflow-x:hidden}button{font:inherit}'
    + '.mockup{min-height:100svh;padding:calc(10px + env(safe-area-inset-top)) max(10px,env(safe-area-inset-left)) calc(10px + env(safe-area-inset-bottom)) max(10px,env(safe-area-inset-right));display:flex;justify-content:center}'
    + '.shell{width:min(100%,var(--shell-max));display:grid;gap:10px;align-content:start}'
    + '.topbar{display:flex;flex-wrap:wrap;align-items:center;gap:8px}.proto-label{font:500 9px/1 var(--font-mono);letter-spacing:.12em;color:var(--ink-2);text-transform:uppercase}'
    + '.switcher-wrap{margin-left:auto;display:flex;flex-wrap:wrap;gap:6px;align-items:center}'
    + '.switcher{display:flex;gap:4px;padding:4px;border:1px solid var(--line-strong);border-radius:14px;background:var(--surface)}'
    + '.switcher button{min-width:var(--touch);min-height:var(--touch);padding:0 10px;border:1px solid transparent;border-radius:10px;background:transparent;color:var(--ink-2);cursor:pointer;font:500 10px/1 var(--font-mono)}'
    + '.switcher button[aria-selected="true"]{background:var(--ink);color:var(--surface)}'
    + '.switcher button:focus-visible,.replay:focus-visible,.iconbtn:focus-visible{outline:2px solid var(--primary);outline-offset:2px}'
    + '.replay,.iconbtn{min-height:var(--touch);padding:0 12px;border:1px solid var(--line-strong);border-radius:10px;background:var(--surface);color:var(--ink);cursor:pointer;font:500 10px/1 var(--font-mono);letter-spacing:.08em;text-transform:uppercase}'
    + '.surface{border:1px solid var(--line-strong);border-radius:26px;background:var(--surface);display:grid;gap:12px;padding-bottom:16px}'
    + '.stage{position:relative;overflow:hidden;border-radius:25px 25px 0 0;background:var(--surface-muted);border-bottom:1px solid var(--line-strong);min-height:340px}'
    + '#gl{position:absolute;inset:0}#gl canvas{display:block;width:100%!important;height:100%!important}'
    + '#labels{position:absolute;inset:0;overflow:hidden;pointer-events:none}'
    + '.node-label{position:absolute;left:0;top:0;transform:translate(-50%,-130%);background:var(--surface);border:1px solid var(--line-strong);border-radius:10px;padding:5px 9px;text-align:center;white-space:nowrap;will-change:transform}'
    + '.node-label.hot{border-color:var(--secondary);border-width:2px}.node-label.grp{background:var(--surface-muted)}'
    + '.nl-code{display:block;font:500 12px/1.3 var(--font-mono);color:var(--ink)}.nl-name{display:block;font:700 11px/1.3 var(--font-body);color:var(--ink-2)}'
    + '.nl-chip{display:inline-block;margin-top:3px;font:500 9px/1 var(--font-mono);letter-spacing:.08em;padding:3px 7px;border-radius:99px;background:var(--surface-muted);color:var(--ink-2)}'
    + '.nl-chip.paid{background:var(--primary);color:#fff}.nl-amt{display:block;font:500 10px/1.4 var(--font-mono);color:var(--ink-2)}'
    + '.hero{position:absolute;left:0;right:0;bottom:14px;display:grid;justify-items:center;gap:8px;text-align:center;pointer-events:none;padding:0 16px}'
    + '.h-word{display:flex;font-weight:800;font-size:30px;letter-spacing:.02em;line-height:1}'
    + '.h-word span{display:inline-block;opacity:0;transform:translateY(12px);clip-path:inset(0 100% 0 0)}'
    + '.hero-on .h-word span{animation:wordIn .5s var(--ease-out) calc(var(--i)*.045s) both}'
    + '.h-copy{margin:0;max-width:300px;color:var(--ink-2);font-size:13px;font-weight:700;opacity:0}'
    + '.hero-on .h-copy{animation:copyIn .48s var(--ease-out) .45s both}'
    + '@keyframes wordIn{to{opacity:1;transform:none;clip-path:inset(0 0 0 0)}}@keyframes copyIn{to{opacity:1}}'
    + '.loading-strip{display:grid;gap:10px;padding:0 16px}.loading-brand{display:flex;align-items:center;gap:10px;min-height:var(--touch)}'
    + '.loading-brand .logo-img{width:34px;height:34px;animation:logoIdle 2.6s var(--ease-in-out) infinite}'
    + '.brand-text strong{font-size:14px;font-weight:800}.brand-text .status{display:block;margin-top:2px;font:500 10px/1.4 var(--font-mono);color:var(--ink-2)}'
    + '.status span{display:none}.mockup[data-phase="splash"] [data-status="splash"],.mockup[data-phase="loader"] [data-status="loader"],.mockup[data-phase="gate"] [data-status="gate"],.mockup[data-phase="ready"] [data-status="ready"]{display:inline}'
    + '@media(max-width:360px){.loading-brand{flex-direction:column;align-items:flex-start}}'
    + '.indicator{height:3px;border-radius:3px;background:var(--surface-muted);overflow:hidden;position:relative}'
    + '.indicator i{position:absolute;inset:0;background:var(--gradient);transform:scaleX(0);transform-origin:left}'
    + '.run-ind .indicator i{animation:barOnce 5.4s var(--ease-in-out) 0s both}'
    + '@keyframes barOnce{0%{transform:scaleX(0)}70%{transform:scaleX(.86)}100%{transform:scaleX(1)}}@keyframes logoIdle{0%,100%{transform:scale(1)}50%{transform:scale(1.04)}}'
    + '.tip-card{min-height:96px;position:relative;overflow:hidden;padding:14px 16px;border:1px solid var(--line-strong);border-radius:var(--radius-card);background:var(--surface)}'
    + '.tip-title{display:block;margin-bottom:6px;color:var(--ink-3);font:500 9px/1 var(--font-mono);letter-spacing:.12em;text-transform:uppercase}'
    + '.tip-card p{position:absolute;left:16px;right:16px;top:34px;margin:0;color:var(--ink);font-size:12.5px;line-height:1.45;font-weight:700}'
    + '.tip-card .tip1{animation:tipOne 8s steps(1,end) infinite}.tip-card .tip2{animation:tipTwo 8s steps(1,end) infinite;opacity:0}'
    + '@keyframes tipOne{0%,49.9%{opacity:1}50%,100%{opacity:0}}@keyframes tipTwo{0%,49.9%{opacity:0}50%,100%{opacity:1}}'
    + '.tip-card .tip3{display:none}.mockup[data-net="offline"] .tip-card .tip1,.mockup[data-net="offline"] .tip-card .tip2{display:none!important}.mockup[data-net="offline"] .tip-card .tip3{display:block!important}'
    + '.mockup[data-net="offline"] .status span{display:none!important}.mockup[data-net="offline"] .status span[data-status="offline"]{display:inline!important}'
    + '.mockup[data-net="offline"] .indicator i{animation-play-state:paused}'
    + '#fallback{display:none;position:absolute;inset:0;place-content:center;justify-items:center;padding:20px;text-align:center}'
    + '.mockup[data-renderer="fallback"] #fallback{display:grid}.mockup[data-renderer="fallback"] #gl,.mockup[data-renderer="fallback"] #labels{display:none}'
    + '.fb-logo{width:84px;height:84px;animation:logoIdle 2.8s var(--ease-in-out) infinite}'
    + '@media(prefers-reduced-motion:reduce){.loading-brand .logo-img,.fb-logo,.tip-card p,.indicator i{animation:none!important}.tip-card .tip2{display:none!important}.indicator i{transform:scaleX(1)!important}}';
}

/* ---- the shared module script (no backticks inside!) ---- */
function appjs(cdn) {
  return 'let T=null;const CDN=\'' + cdn + '\';const ICON_URI="' + ICON_URI + '";\n'
    + 'const $=s=>document.querySelector(s),$$=s=>Array.from(document.querySelectorAll(s));\n'
    + '$(\'#brandlogo\').src=ICON_URI;\n'
    + 'const MOCK=$(\'#mockup\'),STAGE=$(\'#stage\'),GL=$(\'#gl\'),LAB=$(\'#labels\'),HERO=$(\'#hero\'),HWORD=$(\'#hword\'),HCOPY=$(\'#hcopy\'),FB=$(\'#fallback\');\n'
    + 'const TABS=$$(\'#switcher button\'),REPLAY=$(\'#replay\'),MOTION=$(\'#motion\');\n'
    + 'const RM=matchMedia(\'(prefers-reduced-motion: reduce)\').matches, MQ=matchMedia(\'(max-width: 599px)\');\n'
    + 'let forceMotion=false;const liveMotion=()=>!RM||forceMotion;\n'
    + 'const P=()=>MQ.matches;\n'
    + 'let TH=null;\n'
    + '/* DATA: real IA. nav tabs+pickers src/components/layout/navData.ts; prefixes+format src/domain/prefixConstants.ts; auto receipt src/modules/invoices/services/paymentService.ts; chips src/domain/invoice/financialState.ts. */\n'
    + 'const GROUPS=[["Projects",[["PRJ-000001","Projects"]]],["Sales",[["INV-000001","Invoice",1],["QTN-000001","Quotation"],["CSR-000001","CSR"],["WBL-E-000001","Waybill"]]],["Clients",[["","Clients"]]],["More",[["RCP-000001","Receipt",2],["LTR-000001","Letter"],["RFQ-000001","RFQ"]]]];\n'
    + 'const COPY={A:"Every document you create, in one place.",B:"One workspace. Everything connected.",C:"From first quote to final receipt.",D:"Work passes between groups. Nothing gets lost.",E:"Everything gathers. One mark remains."};\n'
    + '/* MASTER TIMELINE (~6s one-shot, delta-time): P0 root 0-.5s spring from parent; P1 edges+tier springs .5-2.2s ease-out; P2 hot pulse+chips 2.2-3.6s (Unpaid>Partially Paid>Paid, amount counts); P3 camera dolly .3-5.5s ease-in-out; P4 converge 3.6-4.6s per-option end-state; P5 hero logo spring+ripple+ring 4.4s, wordmark mask 4.8s; HOLD idle (breath+drift+float). Easings: easeOut=1-(1-x)^3, easeInOut, spring under-damped. */\n'
    + 'const easeOut=x=>1-Math.pow(1-x,3),easeIO=x=>x<.5?4*x*x*x:1-Math.pow(-2*x+2,3)/2;\n'
    + 'function layout(opt,port){const N=[],E=[],AR=[];let inv=null,rcp=null,pay=null,seq=0;const id=s=>opt+s+(seq++);\n'
    + 'const addN=(code,name,o)=>{const n=Object.assign({id:id("n"),code:code,sub:name,born:0,k:90,c:14,sx:0,sy:0,hot:0,grp:"",die:0,di:0},o||{});N.push(n);return n;};\n'
    + 'const W_=port?6:10,H_=port?9:6;\n'
    + 'const root=addN("","BIGDROPS",{x:0,y:port?3.4:2.4,z:0,px:0,py:port?3.4:2.4,born:.05,grp:"root"});\n'
    + 'if(opt==="A"||opt==="D"){const xs=port?[0]:[-3.6,-1.2,1.2,3.6];const gy=port?2.2:1.0;\n'
    + 'GROUPS.forEach((g,gi)=>{const gx=port?0:xs[gi];let gy2=gy-(port?gi*1.9:0);const gr=addN("",g[0],{x:gx,y:gy2,z:0,px:root.x,py:root.y,born:.6+gi*.12,grp:"g"});E.push([root,gr,.55+gi*.06]);\n'
    + 'g[1].forEach((d,di)=>{let dx,dy;if(port){dx=(di%2?1.35:-1.35);dy=gy2-.85-Math.floor(di/2)*.95;}else{if(g[0]==="Sales"){dx=-1.05+(di%2)*2.1;dy=di<2?-.15:-1.2;}else if(g[0]==="More"){dx=-1.0+di*1.0;dy=-.35-(di===2?.85:0);}else{dx=0;dy=-.5;}}\n'
    + 'const hot=d[2]||0;const n=addN(d[0],d[1],{x:port?dx:gx+dx,y:port?dy:gy+dy,z:-.2,px:gx,py:gy2,born:1.15+gi*.12+di*.09,hot:hot,grp:""});E.push([gr,n,1.05+gi*.1+di*.08,hot===1]);\n'
    + 'if(hot===1)inv=n;if(hot===2)rcp=n;});});\n'
    + 'if(opt==="D"){const gs=N.filter(n=>n.grp==="g");for(let i=0;i<gs.length-1;i++)AR.push([gs[i],gs[i+1]]);}}\n'
    + 'if(opt==="B"){const R1=port?1.5:1.9,R2=port?2.9:3.9;const an=[-90,0,90,180];\n'
    + 'GROUPS.forEach((g,gi)=>{const a=an[gi]*Math.PI/180;const gx=Math.cos(a)*R1,gy=Math.sin(a)*R1*.8;const gr=addN("",g[0],{x:gx,y:gy,z:0,px:0,py:root.y,born:.6+gi*.1,grp:"g"});E.push([root,gr,.55+gi*.06]);\n'
    + 'const sp=g[1].length>1?24:0;g[1].forEach((d,di)=>{const da=(an[gi]+(di-(g[1].length-1)/2)*sp)*Math.PI/180;const hot=d[2]||0;\n'
    + 'const n=addN(d[0],d[1],{x:Math.cos(da)*R2,y:Math.sin(da)*R2*.78,z:-.2,px:gx,py:gy,born:1.15+gi*.1+di*.09,hot:hot,grp:""});E.push([gr,n,1.05+gi*.08+di*.08,hot===1]);\n'
    + 'if(hot===1)inv=n;if(hot===2)rcp=n;});});}\n'
    + 'if(opt==="C"){const cy=port?1.2:.5;const ch=[["QTN-000001","Quotation"],["INV-000001","Invoice",1],["RCP-000001","Receipt",2]];\n'
    + 'let prev=root;ch.forEach((c,i)=>{let x,y;if(port){x=0;y=cy-i*1.7;}else{x=-3.3+i*2.2;y=cy;}\n'
    + 'const n=addN(c[0],c[1],{x:x,y:y,z:0,px:prev.x,py:prev.y,born:.9+i*.35,hot:c[2]||0,grp:""});E.push([prev,n,.8+i*.3,c[2]===1]);prev=n;\n'
    + 'if(c[2]===1)inv=n;if(c[2]===2)rcp=n;});\n'
    + 'pay=addN("PAY","recorded",{x:port?0:1.05,y:port?cy-3.4+.85:cy,z:.1,px:inv.x,py:inv.y,born:1.9,hot:0,grp:"s"});\n'
    + '[["CSR-000001","CSR"],["WBL-E-000001","Waybill"],["RFQ-000001","RFQ"],["LTR-000001","Letter"]].forEach((c,i)=>{let x,y;if(port){x=i%2?1.5:-1.5;y=-3.4+i*.9;}else{x=-2.4+i*1.6;y=-1.9;}\n'
    + 'const n=addN(c[0],c[1],{x:x,y:y,z:-.3,px:0,py:root.y,born:1.5+i*.1,hot:0,grp:""});E.push([root,n,1.25+i*.08]);});}\n'
    + 'if(opt==="E"){const R1=port?1.5:1.9,R2=port?2.6:3.6;let dc=0;\n'
    + 'GROUPS.forEach((g,gi)=>{const a0=gi/4*Math.PI*2;const gr=addN("",g[0],{x:Math.cos(a0)*R1,y:Math.sin(a0)*R1*.7,z:0,px:0,py:root.y,born:.5+gi*.1,grp:"g"});gr.orb={r:R1,ry:R1*.7,a:a0,sp:gi%2?.42:-.42};gr.di=dc++;\n'
    + 'g[1].forEach((d,dj)=>{const hot=d[2]||0;const b0=(gi*3+dj)/10*Math.PI*2;const n=addN(d[0],d[1],{x:Math.cos(b0)*R2,y:Math.sin(b0)*R2*.7,z:-.2,px:0,py:root.y,born:.8+dc*.05,hot:hot,grp:""});n.orb={r:R2,ry:R2*.7,a:b0,sp:dj%2?.3:-.3};n.di=dc++;\n'
    + 'E.push([root,gr,.55+gi*.08]);E.push([gr,n,1.0+gi*.08+dj*.05,hot===1]);\n'
    + 'if(hot===1)inv=n;if(hot===2)rcp=n;});});\n'
    + 'L.ORB=[R1,R2];}\n'
    + 'if(!pay&&inv&&rcp){pay=addN("PAY","recorded",{x:(inv.x+rcp.x)/2,y:(inv.y+rcp.y)/2+(port?-.4:.35),z:.15,px:inv.x,py:inv.y,born:1.9,hot:0,grp:"s"});}\n'
    + 'N.forEach(n=>{n.tx=n.x;n.ty=n.y;n.tz=n.z;});\n'
    + 'return{N:N,E:E,AR:AR,inv:inv,rcp:rcp,pay:pay,root:root,W:W_,H:H_};}\n'
    + 'function endTargets(L,opt,port){const T={};const cx=0,cy=port?.4:0;\n'
    + 'if(opt==="E"){return {};}\n'
    + 'if(opt==="A"){L.N.forEach(n=>{if(n.grp==="g"||n===L.root)return;T[n.id]=n.hot?[n.x,n.y,n.z]:[(n.x-cx)*.25+cx,(n.y-cy)*.25+cy-.3,n.z];});T[L.root.id]=[0,cy+.4,0];}\n'
    + 'if(opt==="B"){L.N.forEach(n=>{if(n===L.root||n.grp==="g")return;T[n.id]=[n.x*1.02,n.y*1.02,n.z];});T[L.root.id]=[0,cy,0];}\n'
    + 'if(opt==="C"){L.N.forEach(n=>{if(n.grp==="g"||n===L.root)return;T[n.id]=[n.x,n.y-.3,n.z];});T[L.root.id]=[0,cy+.6,0];}\n'
    + 'if(opt==="D"){L.N.forEach(n=>{if(n===L.root)return;T[n.id]=[(n.x-cx)*.3+cx,(n.y-cy)*.3+cy,n.z];});T[L.root.id]=[0,cy,0];}\n'
    + 'return T;}\n'
    + 'let renderer,scene,camera,field,fieldU,logoMesh,logoTex,ringMesh,hotTube,hotU,travelDot,edgeLines=[],nodeMeshes=[],plan=null,ripIdx=0;\n'
    + 'const RIPN=6;\n'
    + 'let ripples=[];\n'
    + 'let sphereGeo=null,matNode=null,matHot=null,matGrp=null,matPay=null;\n'
    + 'function initRes(){const g=n=>getComputedStyle(document.documentElement).getPropertyValue(n).trim();TH={primary:new T.Color(g(\'--primary\')),secondary:new T.Color(g(\'--secondary\')),ink:new T.Color(g(\'--ink\')),muted:new T.Color(\'#888888\')};for(let i=0;i<RIPN;i++)ripples.push(new T.Vector4(0,0,-99,0));sphereGeo=new T.SphereGeometry(.09,20,14);matNode=new T.MeshBasicMaterial({color:TH.primary});matHot=new T.MeshBasicMaterial({color:TH.secondary});matGrp=new T.MeshBasicMaterial({color:TH.ink});matPay=new T.MeshBasicMaterial({color:TH.secondary});}\n'
    + 'function initGL(){renderer=new T.WebGLRenderer({antialias:true,alpha:true,powerPreference:"low-power"});renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));renderer.setClearColor(0x000000,0);GL.appendChild(renderer.domElement);scene=new T.Scene();camera=new T.PerspectiveCamera(45,1,.1,100);buildField();resize();}\n'
    + 'function buildField(){const n=P()?42*42:64*40;const pos=new Float32Array(n*3);let i=0;const Wx=P()?9:15,Hz=P()?12:9;\n'
    + 'for(let k=0;k<n;k++){const gx=k%Math.round(Math.sqrt(n*Wx/Hz)),gz=Math.floor(k/Math.round(Math.sqrt(n*Wx/Hz)));pos[i++]=gx/(Math.round(Math.sqrt(n*Wx/Hz))-1)*Wx-Wx/2;pos[i++]=-2.6;pos[i++]=gz/(Math.ceil(n/Math.round(Math.sqrt(n*Wx/Hz)))-1)*Hz-Hz/2;}\n'
    + 'const g=new T.BufferGeometry();g.setAttribute("position",new T.BufferAttribute(pos,3));\n'
    + 'fieldU={uTime:{value:0},uRip:{value:ripples},uCol:{value:new T.Color(TH.primary)},uPx:{value:renderer.getPixelRatio()}};\n'
    + 'const m=new T.ShaderMaterial({uniforms:fieldU,transparent:true,depthWrite:false,vertexShader:"uniform float uTime;uniform vec4 uRip[6];varying float vA;void main(){vec3 p=position;float a=.35+.3*sin(uTime*.7+p.x*1.3+p.z*1.1);for(int i=0;i<6;i++){vec4 r=uRip[i];float age=uTime-r.z;if(age>0.&&age<3.){float d=distance(p.xz,r.xy);float w=sin(d*3.-age*7.)*exp(-d*1.1)*exp(-age*1.6)*r.w;a+=w;}}vA=a;p.y+=a*.22;vec4 mv=modelViewMatrix*vec4(p,1.);gl_PointSize=(140.*uPx/ -mv.z)*(.05+.05*a);gl_Position=projectionMatrix*mv;}",fragmentShader:"uniform vec3 uCol;varying float vA;void main(){vec2 c=gl_PointCoord-.5;if(dot(c,c)>.25)discard;gl_FragColor=vec4(uCol,.25+.5*clamp(vA,0.,1.));}"});\n'
    + 'field=new T.Points(g,m);field.frustumCulled=false;scene.add(field);}\n'
    + 'function ripple(x,z,amp){ripples[ripIdx].set(x,z,fieldU.uTime.value,amp||1);ripIdx=(ripIdx+1)%RIPN;}\n'
    + 'function disposePlan(){if(!plan)return;plan.group.traverse(o=>{if(o.geometry&&o.geometry!==sphereGeo)o.geometry.dispose();if(o.material&&o.material._own)o.material.dispose();});scene.remove(plan.group);edgeLines.length=0;while(LAB.firstChild)LAB.removeChild(LAB.firstChild);}\n'
    + 'function buildPlan(opt){disposePlan();const L=layout(opt,P());const grp=new T.Group();scene.add(grp);\n'
    + 'const END=endTargets(L,opt,P());\n'
    + 'L.N.forEach(n=>{let mesh;\n'
    + 'const mat=n.hot===1||n.hot===2?matHot:(n.grp==="g"?matGrp:(n.grp==="s"?matPay:matNode));\n'
    + 'mesh=new T.Mesh(sphereGeo,mat);mesh.position.set(n.px,n.py,n.pz||0);mesh.scale.setScalar(.0001);grp.add(mesh);\n'
    + 'n.mesh=mesh;n.vx=0;n.vy=0;n.vz=0;n.vs=0;n.s=.0001;n.bornAt=n.born;n.end=END[n.id]||null;\n'
    + 'const d=document.createElement("div");d.className="node-label"+(n.hot?" hot":"")+(n.grp==="g"||n.grp==="root"?" grp":"");\n'
    + 'let inner="";if(n.grp==="root")inner="<span class=\'nl-code\'>BIGDROPS</span>";\n'
    + 'else if(n.grp==="g")inner="<span class=\'nl-name\'>"+n.sub+"</span>";\n'
    + 'else inner="<span class=\'nl-code\'>"+n.code+"</span><span class=\'nl-name\'>"+n.sub+"</span>"+(n.hot===1?"<span class=\'nl-chip\' id=\'chip-"+opt+"\'>UNPAID</span><span class=\'nl-amt\' id=\'amt-"+opt+"\'>&#8358;184,500 DUE</span>":"");\n'
    + 'd.innerHTML=inner;d.style.display="none";LAB.appendChild(d);n.el=d;});\n'
    + 'L.E.forEach(e=>{const a=e[0],b=e[1];const pts=[];for(let i=0;i<=16;i++){const f=i/16;pts.push(new T.Vector3(a.x+(b.x-a.x)*f,a.y+(b.y-a.y)*f,(a.z||0)+((b.z||0)-(a.z||0))*f));}\n'
    + 'const g=new T.BufferGeometry().setFromPoints(pts);const m=new T.LineBasicMaterial({color:e[3]?TH.secondary:TH.primary,transparent:true,opacity:.75});m._own=true;\n'
    + 'const line=new T.Line(g,m);line.frustumCulled=false;grp.add(line);line.geometry.setDrawRange(0,0);plan_edgePush(line,e[2],a,b);});\n'
    + 'function plan_edgePush(line,at,a,b){edgeLines.push({line:line,at:at,a:a,b:b});}\n'
    + 'if(L.inv&&L.rcp&&opt!=="E"){const pts=[new T.Vector3(L.inv.x,L.inv.y,.1)];if(L.pay)pts.push(new T.Vector3(L.pay.x,L.pay.y,.15));pts.push(new T.Vector3(L.rcp.x,L.rcp.y,.1));\n'
    + 'const curve=new T.CatmullRomCurve3(pts);const tg=new T.TubeGeometry(curve,64,.028,6,false);\n'
    + 'hotU={uP:{value:-.2},uA:{color:TH.secondary},uB:{color:TH.primary}};\n'
    + 'const hm=new T.ShaderMaterial({uniforms:hotU,transparent:true,depthWrite:false,vertexShader:"varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}",fragmentShader:"uniform float uP;uniform vec3 uA;uniform vec3 uB;varying vec2 vUv;void main(){float d=abs(vUv.x-uP);float b=smoothstep(.12,.0,d);vec3 c=mix(uB,uA,b);gl_FragColor=vec4(c,.35+.65*b);}"});hm._own=true;\n'
    + 'hotTube=new T.Mesh(tg,hm);hotTube.visible=false;hotTube.frustumCulled=false;grp.add(hotTube);}\n'
    + 'else hotTube=null;\n'
    + 'if(L.ORB)L.ORB.forEach((r,i)=>{const pts=[];for(let k=0;k<=72;k++){const a=k/72*Math.PI*2;pts.push(new T.Vector3(Math.cos(a)*r,Math.sin(a)*r*.7,0));}\n'
    + 'const g=new T.BufferGeometry().setFromPoints(pts);const m=new T.LineBasicMaterial({color:TH.primary,transparent:true,opacity:.3});m._own=true;\n'
    + 'const line=new T.Line(g,m);line.frustumCulled=false;grp.add(line);line.geometry.setDrawRange(0,0);edgeLines.push({line:line,at:.5+i*.3});});\n'
    + 'L.AR.forEach(a=>{const pts=new T.QuadraticBezierCurve3(new T.Vector3(a[0].x,a[0].y,0),new T.Vector3((a[0].x+a[1].x)/2,Math.max(a[0].y,a[1].y)+.8,0),new T.Vector3(a[1].x,a[1].y,0)).getPoints(20);\n'
    + 'const g=new T.BufferGeometry().setFromPoints(pts);const m=new T.LineDashedMaterial({color:TH.primary,dashSize:.12,gapSize:.09,transparent:true,opacity:.7});m._own=true;\n'
    + 'const line=new T.Line(g,m);line.computeLineDistances();line.frustumCulled=false;grp.add(line);line.geometry.setDrawRange(0,0);edgeLines.push({line:line,at:3.2});});\n'
    + 'if(opt==="C"&&L.inv&&L.rcp){travelDot=new T.Mesh(sphereGeo,matPay);travelDot.scale.setScalar(.8);travelDot.visible=false;travelDot.frustumCulled=false;grp.add(travelDot);travelDot.userData={a:new T.Vector3(L.inv.x,L.inv.y,.2),b:new T.Vector3(L.rcp.x,L.rcp.y,.2)};}\n'
    + 'else travelDot=null;\n'
    + 'if(!logoTex){new T.TextureLoader().load(ICON_URI,tx=>{tx.colorSpace=T.SRGBColorSpace;logoTex=tx;if(logoMesh)logoMesh.material.map=tx,logoMesh.material.needsUpdate=true;});}\n'
    + 'const lg=new T.PlaneGeometry(1.5,1.5);const lm=new T.MeshBasicMaterial({map:logoTex||null,transparent:true});lm._own=true;\n'
    + 'logoMesh=new T.Mesh(lg,lm);logoMesh.position.set(L.root.x,L.root.y,.5);logoMesh.scale.setScalar(.0001);grp.add(logoMesh);\n'
    + 'const rg=new T.RingGeometry(.95,1.02,48);const rm2=new T.MeshBasicMaterial({color:TH.primary,transparent:true,opacity:0,side:T.DoubleSide});rm2._own=true;\n'
    + 'ringMesh=new T.Mesh(rg,rm2);ringMesh.position.set(L.root.x,L.root.y,.45);ringMesh.scale.setScalar(.4);ringMesh.visible=false;grp.add(ringMesh);\n'
    + 'plan={group:grp,L:L,END:END,t:0,chipStage:0,heroDone:false,ringDone:false,ripDone:false,opt:opt};\n'
    + 'HCOPY.textContent=COPY[opt];STAGE.setAttribute("aria-label","Option "+opt+" scene");}\n'
    + 'let cur="A",raf=0,lastT=0,ftAcc=0,ftN=0,ftT=0,degraded=false,phaseTimers=[];\n'
    + 'let netOn=true;const NET=$(\'#net\');\n'
    + 'function setNet(v){netOn=v;MOCK.setAttribute("data-net",v?"online":"offline");NET.textContent=v?"Go offline":"Reconnect";if(logoMesh){if(!v){logoMesh.userData.bs=logoMesh.scale.x;logoMesh.material.color.set(TH.ink2);logoMesh.material.opacity=.6;}else{logoMesh.material.color.set("#ffffff");logoMesh.material.opacity=1;}}}\n'
    + 'function setPhase(p){MOCK.setAttribute("data-phase",p);}\n'
    + 'function startPhases(){phaseTimers.forEach(clearTimeout);phaseTimers=[setTimeout(()=>setPhase("loader"),1800),setTimeout(()=>setPhase("gate"),3600),setTimeout(()=>setPhase("ready"),5200)];}\n'
    + 'function spring(n,dt,tx,ty,tz){const k=90,c=13;n.vx+=(k*(tx-n.mesh.position.x)-c*n.vx)*dt;n.vy+=(k*(ty-n.mesh.position.y)-c*n.vy)*dt;n.vz+=(k*(tz-n.mesh.position.z)-c*n.vz)*dt;n.mesh.position.x+=n.vx*dt;n.mesh.position.y+=n.vy*dt;n.mesh.position.z+=n.vz*dt;const ts=(n.born>plan.t||(n.die&&plan.t>n.die))?0:1;n.vs+=(k*(ts-n.s)-c*n.vs)*dt;n.s+=n.vs*dt;n.mesh.scale.setScalar(Math.max(.0001,n.s));}\n'
    + 'function fmt(n){return "&#8358;"+Math.round(n).toString().replace(/\\B(?=(\\d{3})+(?!\\d))/g,",");}\n'
    + 'function tick(now){raf=requestAnimationFrame(tick);if(document.hidden)return;const dt=Math.min(.05,(now-lastT)/1000||.016);lastT=now;\n'
    + 'ftAcc+=dt;ftN++;ftT+=dt;if(ftT>1){if(ftAcc/ftN>.024&&!degraded){degraded=true;renderer.setPixelRatio(1);if(field){field.geometry.setDrawRange(0,Math.floor(field.geometry.attributes.position.count/2));}}ftAcc=0;ftN=0;ftT=0;}\n'
    + 'if(!plan)return;if(!netOn){if(logoMesh){const bs=logoMesh.userData.bs||1;logoMesh.scale.setScalar(bs*(1+.035*Math.sin(now*.0011)));}if(ringMesh){ringMesh.visible=true;ringMesh.material.opacity=.2+.15*Math.sin(now*.0008);}renderer.render(scene,camera);return;}plan.t+=dt;const t=plan.t,L=plan.L;\n'
    + 'fieldU.uTime.value+=dt;\n'
    + 'const conv=t>3.6;\n'
    + 'L.N.forEach(n=>{if(!n.mesh)return;if(plan.opt==="E"&&n.orb){if(t<4.2){n.tx=Math.cos(n.orb.a+t*n.orb.sp)*n.orb.r;n.ty=Math.sin(n.orb.a+t*n.orb.sp)*n.orb.ry;n.tz=0;}else{if(!n.ex){n.ex=[n.mesh.position.x*3.4,n.mesh.position.y*3.4+1.2,n.mesh.position.z];n.die=4.55+n.di*.05;}n.tx=n.ex[0];n.ty=n.ex[1];n.tz=n.ex[2];}}const e2=n.end&&conv?n.end:null;spring(n,dt,e2?e2[0]:n.tx,e2?e2[1]:n.ty,e2?e2[2]:n.tz);\n'
    + 'n.el.style.display="block";\n'
    + 'const v=new T.Vector3(n.mesh.position.x,n.mesh.position.y,n.mesh.position.z).project(camera);\n'
    + 'const r=GL.getBoundingClientRect();const sx=(v.x*.5+.5)*r.width,sy=(-v.y*.5+.5)*r.height;\n'
    + 'n.el.style.transform="translate(-50%,-130%) translate("+sx.toFixed(1)+"px,"+sy.toFixed(1)+"px)";\n'
    + 'n.el.style.opacity=(t>n.bornAt&&v.z<1&&n.s>.05)?"1":"0";});\n'
    + 'if(plan.opt==="E")edgeLines.forEach(o=>{if(!o.a||!o.b||!o.a.mesh||!o.b.mesh)return;const p=o.line.geometry.attributes.position,n2=o.a.mesh.position,m2=o.b.mesh.position;for(let i=0;i<p.count;i++){const f=i/(p.count-1);p.setXYZ(i,n2.x+(m2.x-n2.x)*f,n2.y+(m2.y-n2.y)*f,n2.z+(m2.z-n2.z)*f);}p.needsUpdate=true;});\n'
    + 'edgeLines.forEach(o=>{const f=Math.min(1,Math.max(0,(t-o.at)/.7));const c=o.line.geometry.attributes.position.count;o.line.geometry.setDrawRange(0,Math.max(2,Math.floor(c*easeOut(f))));});\n'
    + 'if(hotTube){hotTube.visible=t>2.15;if(t>2.15)hotU.uP.value=-.15+easeIO(Math.min(1,(t-2.2)/1.2))*1.3;}\n'
    + 'if(travelDot){travelDot.visible=t>2.2&&t<3.7;if(travelDot.visible){const f=easeIO(Math.min(1,(t-2.2)/1.4));travelDot.position.lerpVectors(travelDot.userData.a,travelDot.userData.b,f);}}\n'
    + 'const chip=document.getElementById("chip-"+plan.opt),amt=document.getElementById("amt-"+plan.opt);\n'
    + 'if(t>2.6&&plan.chipStage<1&&chip){chip.textContent="PARTIALLY PAID";plan.chipStage=1;}\n'
    + 'if(t>3.0&&plan.chipStage<2&&chip){chip.textContent="PAID";chip.classList.add("paid");plan.chipStage=2;}\n'
    + 'if(amt&&t>2.6&&t<3.8){amt.innerHTML=fmt(184500*(1-easeIO((t-2.6)/1.2)))+" DUE";}else if(amt&&t>=3.8){amt.innerHTML="&#8358;0 PAID";}\n'
    + 'if(logoMesh){const E5=plan.opt==="E",lb0=E5?.3:4.4;\n'
    + 'if(E5&&t>4.9){const f=easeIO(Math.min(1,(t-4.9)/1.3));logoMesh.scale.setScalar(1.07+f*15);logoMesh.position.x=0;logoMesh.position.y=.2;logoMesh.position.z=.5;}\n'
    + 'else if(t>lb0){const f=Math.min(1,(t-lb0)/.7);const s=easeOut(f);logoMesh.scale.setScalar(Math.max(.0001,.6+.47*s+.07*Math.sin(f*Math.PI)));logoMesh.position.z=.5+Math.sin(t*1.4)*.03;const bs=1+Math.sin(t*1.8)*.02;if(t>5.9)logoMesh.scale.multiplyScalar(bs);}}\n'
    + 'if(ringMesh){const r0=plan.opt==="E"?4.2:4.55,r1=plan.opt==="E"?5.4:5.7;ringMesh.visible=t>r0&&t<r1;if(ringMesh.visible){const f=(t-r0)/(r1-r0);ringMesh.scale.setScalar(.4+f*.9);ringMesh.material.opacity=.7*(1-f);}}\n'
    + 'const rt=plan.opt==="E"?4.25:4.45;if(!plan.ripDone&&t>rt){plan.ripDone=true;ripple(L.root.x,L.root.y,plan.opt==="E"?2:1.4);}\n'
    + 'const ht=plan.opt==="E"?4.6:4.8;if(!plan.heroDone&&t>ht){plan.heroDone=true;HERO.classList.add("hero-on");}\n'
    + 'L.N.forEach(n=>{if(!n.mesh||t<n.bornAt)return;n.mesh.position.y+=Math.sin(t*1.6+n.mesh.position.x)*.0009;});\n'
    + 'px+=(tpx-px)*Math.min(1,dt*3);py+=(tpy-py)*Math.min(1,dt*3);const dist=P()?11:12.5;const dz=dist+Math.sin(t*.35)*.5;\n'
    + 'camera.position.set(px*1.1,py*.8+ (P()?.4:0),dz);camera.lookAt(0,P()?-.2:0,0);\n'
    + 'if(plan.opt==="E"&&t>6.5){renderer.render(scene,camera);cancelAnimationFrame(raf);raf=0;return;}\n'
    + 'renderer.render(scene,camera);}\n'
    + 'let px=0,py=0,tpx=0,tpy=0;\n'
    + 'function resize(){if(!renderer)return;const w=STAGE.clientWidth||300,h=STAGE.clientHeight||340;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();}\n'
    + 'function rebuild(){if(!renderer||!plan)return;const t=plan.t,cs=plan.chipStage,hd=plan.heroDone;buildPlan(plan.opt);plan.t=Math.min(t,99);plan.chipStage=cs;const ch=document.getElementById("chip-"+plan.opt),am=document.getElementById("amt-"+plan.opt);if(ch&&t>2.6){ch.textContent=t>3?"PAID":"PARTIALLY PAID";if(t>3)ch.classList.add("paid");}if(am&&t>=3.8)am.innerHTML="&#8358;0 PAID";if(hd)HERO.classList.add("hero-on");resize();}\n'
    + 'function show(opt){if(!T)return;if(plan&&plan.opt===opt&&!RM)return;cur=opt;HERO.classList.remove("hero-on");\n'
    + 'TABS.forEach(b=>{const on=b.dataset.panel===opt;b.setAttribute("aria-selected",on?"true":"false");if(on)b.removeAttribute("tabindex");else b.setAttribute("tabindex","-1");});\n'
    + 'if(!liveMotion()){buildPlan(opt);snapEnd();return;}\n'
    + 'buildPlan(opt);setPhase("splash");startPhases();MOCK.classList.add("run-ind");lastT=performance.now();}\n'
    + 'function snapEnd(){if(!plan)return;plan.t=99;const t=99,L=plan.L;plan.chipStage=2;\n'
    + 'L.N.forEach(n=>{if(!n.mesh)return;const e2=n.end||[n.tx,n.ty,n.tz];n.mesh.position.set(e2[0],e2[1],e2[2]);if(plan.opt==="E"&&n.orb)n.mesh.scale.setScalar(.0001);else n.mesh.scale.setScalar(1);});\n'
    + 'edgeLines.forEach(o=>{o.line.geometry.setDrawRange(0,o.line.geometry.attributes.position.count);});\n'
    + 'if(hotTube){hotTube.visible=true;hotU.uP.value=1.1;}\n'
    + 'const chip=document.getElementById("chip-"+plan.opt),amt=document.getElementById("amt-"+plan.opt);\n'
    + 'if(chip){chip.textContent="PAID";chip.classList.add("paid");}if(amt)amt.innerHTML="&#8358;0 PAID";\n'
    + 'if(logoMesh){if(plan.opt==="E"){logoMesh.scale.setScalar(13);logoMesh.position.set(0,.2,.5);}else logoMesh.scale.setScalar(1.07);}\n'
    + 'HERO.classList.add("hero-on");setPhase("ready");\n'
    + 'const r=GL.getBoundingClientRect();L.N.forEach(n=>{if(!n.el)return;const v=new T.Vector3(n.mesh.position.x,n.mesh.position.y,n.mesh.position.z).project(camera);n.el.style.transform="translate(-50%,-130%) translate("+((v.x*.5+.5)*r.width).toFixed(1)+"px,"+((-v.y*.5+.5)*r.height).toFixed(1)+"px)";n.el.style.opacity="1";});\n'
    + 'renderer.render(scene,camera);}\n'
    + 'function fallback(){MOCK.setAttribute("data-renderer","fallback");\n'
    + 'FB.innerHTML="<img class=\'fb-logo\' src=\'"+ICON_URI+"\' alt=\'BIGDROPS app icon\'><div class=\'h-word\' style=\'font-size:26px;font-weight:800\'><span>BIGDROPS</span></div><p class=\'h-copy\' style=\'opacity:1\'>"+COPY[cur]+"</p>";\n'
    + 'setPhase("ready");}\n'
    + 'async function boot(){MOCK.setAttribute("data-renderer","webgl");\n'
    + 'TABS.forEach((b,i)=>{b.addEventListener("click",()=>show(b.dataset.panel));\n'
    + 'b.addEventListener("keydown",e=>{let j=-1;if(e.key==="ArrowRight")j=(i+1)%TABS.length;if(e.key==="ArrowLeft")j=(i-1+TABS.length)%TABS.length;if(e.key==="Home")j=0;if(e.key==="End")j=TABS.length-1;if(j>-1){e.preventDefault();TABS[j].focus();show(TABS[j].dataset.panel);}});});\n'
    + 'REPLAY.addEventListener("click",()=>{if(!T)return;HERO.classList.remove("hero-on");if(!liveMotion()){buildPlan(cur);snapEnd();return;}buildPlan(cur);setPhase("splash");startPhases();MOCK.classList.add("run-ind");plan.t=0;});\n'
    + 'MOTION.addEventListener("click",()=>{if(!T)return;forceMotion=!forceMotion;MOTION.textContent=forceMotion?"Motion on":"Force motion";MOTION.setAttribute("aria-pressed",forceMotion?"true":"false");if(forceMotion){cancelAnimationFrame(raf);buildPlan(cur);setPhase("splash");startPhases();lastT=performance.now();raf=requestAnimationFrame(tick);} });\n'
    + 'STAGE.addEventListener("pointermove",e=>{const r=STAGE.getBoundingClientRect();tpx=((e.clientX-r.left)/r.width-.5)*2;tpy=((e.clientY-r.top)/r.height-.5)*2;});\n'
    + 'STAGE.addEventListener("pointerdown",e=>{ripple(tpx*3,-tpy*2,.8);});\n'
    + 'MQ.addEventListener?MQ.addEventListener("change",rebuild):MQ.addListener(rebuild);\n'
    + 'window.addEventListener("resize",resize);\n'
    + 'NET.addEventListener("click",()=>setNet(!netOn));\n'
    + 'window.addEventListener("online",()=>setNet(true));\n'
    + 'window.addEventListener("offline",()=>setNet(false));\n'
    + 'if(typeof navigator!=="undefined"&&navigator.onLine===false)setNet(false);\n'
    + 'try{T=await import(CDN);}catch(e){T=null;}\n'
    + 'if(!T||!window.WebGLRenderingContext){fallback();return;}\n'
    + 'initRes();initGL();\n'
    + 'await document.fonts.ready;\n'
    + 'buildPlan("A");resize();setPhase("splash");startPhases();MOCK.classList.add("run-ind");\n'
    + 'if(!liveMotion()){snapEnd();return;}\n'
    + 'lastT=performance.now();raf=requestAnimationFrame(tick);}\n'
    + 'boot();\n';
}

function page(themeKey, formKey) {
  const t = TOKENS[themeKey], f = FORMS[formKey];
  const head = '<!doctype html><html lang="en"><head><meta charset="utf-8">'
    + '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">'
    + '<meta name="color-scheme" content="' + (t.scheme || 'light') + '">'
    + '<title>BIGDROPS Cold Launch — Tree 3D · ' + t.label + ' · ' + f.title + '</title>'
    + '<link href="https://fonts.googleapis.com/css2?family=Manrope:wght@500;600;700;800&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet">'
    + '<style>' + css(t, f.shell).replace(/\n/g, '') + '</style></head><body>';
  const tabs = ['A|Hierarchy', 'B|Radial', 'C|Flow', 'D|Handoff', 'E|Singularity'].map((s, i) => {
    const p = s.split('|');
    return '<button role="tab" id="tab-' + p[0] + '" aria-selected="' + (i === 0 ? 'true' : 'false') + '"' + (i === 0 ? '' : ' tabindex="-1"') + ' data-panel="' + p[0] + '" type="button">' + p[0] + ' · ' + p[1] + '</button>';
  }).join('');
  const word = 'BIGDROPS'.split('').map((c, i) => '<span style="--i:' + i + '">' + c + '</span>').join('');
  const body = '<div class="mockup" id="mockup" data-phase="splash" data-net="online" data-renderer="webgl"><div class="shell">'
    + '<div class="topbar"><span class="proto-label">Prototype · Tree 3D · ' + t.label + ' · ' + f.label + '</span>'
    + '<div class="switcher-wrap"><div class="switcher" id="switcher" role="tablist" aria-label="Cold launch options">' + tabs + '</div>'
    + '<button class="replay" id="replay" type="button">Replay</button><button class="iconbtn" id="net" type="button">Go offline</button>'
    + '<button class="iconbtn" id="motion" type="button" aria-pressed="false">Force motion</button></div></div>'
    + '<div class="surface"><div class="stage" id="stage" aria-label="Option A scene">'
    + '<div id="gl"></div><div id="labels"></div>'
    + '<div class="hero" id="hero" aria-hidden="true"><div class="h-word" id="hword">' + word + '</div><p class="h-copy" id="hcopy"></p></div>'
    + '<div id="fallback"></div></div>'
    + '<div class="loading-strip"><div class="loading-brand">'
    + '<img class="logo-img" id="brandlogo" alt="BIGDROPS app icon">'
    + '<div class="brand-text"><strong>BIGDROPS</strong><span class="status"><span data-status="splash">Securing your session</span><span data-status="loader">Loading your workspace</span><span data-status="gate">Preparing your dashboard</span><span data-status="ready">Workspace ready</span><span data-status="offline">Connect to the internet to continue</span></span></div>'
    + '</div><div class="indicator" aria-hidden="true"><i></i></div>'
    + '<div class="tip-card" role="status" aria-live="polite"><span class="tip-title">Tip</span>'
    + '<p class="tip1">Receipts are created automatically when you record a payment.</p>'
    + '<p class="tip2">Add an expiry date to a quotation and BIGDROPS flags it when a response is overdue.</p>'
    + '<p class="tip3">On Android, quotation and CSR drafts made offline sync when you reconnect.</p>'
    + '</div></div></div></div></div>'
    + '<script type="module">' + appjs(THREE_URL).replace(/\n/g, '') + '</script></body></html>';
  return head + body;
}

/* ---------------- machine checks ---------------- */
function check(file, html) {
  const errs = [];
  const bytes = Buffer.byteLength(html, 'utf8');
  if (bytes > 80 * 1024) errs.push('SIZE ' + bytes + ' > 81920');
  if (!html.trimEnd().endsWith('</html>')) errs.push('missing </html>');
  const icons = (html.match(/data:image\/png;base64,/g) || []).length;
  if (icons !== 1) errs.push('icon data-URI count=' + icons + ' (want 1)');
  if (!html.includes('three@' + THREE_VER + '/')) errs.push('three version not pinned');
  const m = html.match(/<script type="module">([\s\S]*)<\/script>/);
  if (!m) errs.push('no module script');
  else {
    const tmp = join(HERE, '_check_tmp.mjs');
    writeFileSync(tmp, m[1]);
    try { execSync('node --check "' + tmp + '"', { stdio: 'pipe' }); }
    catch (e) { errs.push('node --check failed: ' + String(e.stderr || e.message).slice(0, 400)); }
  }
  const cssm = html.match(/<style>([\s\S]*)<\/style>/);
  const cssText = cssm ? cssm[1] : '';
  const kf = new Set([...cssText.matchAll(/@keyframes\s+([\w-]+)/g)].map(x => x[1]));
  for (const a of [...cssText.matchAll(/animation:\s*([\w-]+)/g)].map(x => x[1])) {
    if (a !== 'none' && !kf.has(a)) errs.push('animation-name without keyframes: ' + a);
  }
  const ids = new Set([...html.matchAll(/id="([\w-]+)"/g)].map(x => x[1]));
  const js = m ? m[1] : '';
  for (const q of [...js.matchAll(/\$\('#([\w-]+)'\)/g)].map(x => x[1])) {
    if (!q.endsWith('-') && !ids.has(q)) errs.push('JS queries missing id: ' + q);
  }
  for (const q of [...js.matchAll(/getElementById\("([\w-]+?)"?\+/g)].map(x => x[1])) {
    if (!q.endsWith('-') && !/^(chip|amt)-[A-D]$/.test(q) && !ids.has(q)) errs.push('JS queries missing id: ' + q);
  }
  const classes = new Set([...html.matchAll(/class="([^"]+)"/g)].flatMap(x => x[1].split(/\s+/)));
  for (const c of [...js.matchAll(/classList\.(?:add|remove)\("([\w-]+)"\)/g)].map(x => x[1])) {
    if (!classes.has(c) && !cssText.includes('.' + c)) errs.push('JS toggles unknown class: ' + c);
  }
  return { errs, bytes };
}

mkdirSync(OUTDIR, { recursive: true });
const DARK = process.argv.includes('--dark');
const jobs = DARK ? [
  ['BIGDROPS Cold Launch - Mobile Fold2 - Linear Dark.html', 'linearDark', 'mobile'],
  ['BIGDROPS Cold Launch - Mobile Fold2 - Amber Terracotta Dark.html', 'amberDark', 'mobile'],
  ['BIGDROPS Cold Launch - Desktop - Linear Dark.html', 'linearDark', 'desktop'],
  ['BIGDROPS Cold Launch - Desktop - Amber Terracotta Dark.html', 'amberDark', 'desktop']
] : [
  ['BIGDROPS Cold Launch - Mobile Fold2 - Linear.html', 'linear', 'mobile'],
  ['BIGDROPS Cold Launch - Mobile Fold2 - Amber Terracotta.html', 'amber', 'mobile'],
  ['BIGDROPS Cold Launch - Desktop - Linear.html', 'linear', 'desktop'],
  ['BIGDROPS Cold Launch - Desktop - Amber Terracotta.html', 'amber', 'desktop']
];
let fail = 0;
for (const [name, tk, fm] of jobs) {
  const html = page(tk, fm);
  writeFileSync(join(OUTDIR, name), html);
  const { errs, bytes } = check(name, html);
  console.log(name + ' :: ' + bytes + ' bytes :: ' + (errs.length ? 'FAIL: ' + errs.join(' | ') : 'PASS'));
  if (errs.length) fail++;
}
if (fail) { console.error(fail + ' file(s) failed checks'); process.exit(1); }
console.log('ALL CHECKS PASSED');
