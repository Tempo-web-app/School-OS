/* School OS production layer: authentication, cloud-first data, migration and reliability. */
(()=>{
  const $=s=>document.querySelector(s);
  const GUEST_KEY='school-os-guest-v2';
  const PREMIUM_KEY='school-os-premium-v1';
  const tables=['subjects','assignments','exams','notes','study_sessions','classes','grades','tempo_plans','vocabulary','flashcard_decks','goals','habits','notifications'];
  const escP=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let gate;
  const notify=m=>typeof toast==='function'?toast(m):null;
  function styleGate(){
    if(document.getElementById('productionCSS'))return;
    const l=document.createElement('link');l.id='productionCSS';l.rel='stylesheet';l.href='css/production.css';document.head.appendChild(l);
  }
  function guestSnapshot(){try{return JSON.parse(localStorage.getItem(GUEST_KEY)||'{}')}catch{return {}}}
  function hasLocalData(){const d=guestSnapshot();return tables.some(t=>Array.isArray(d[t])&&d[t].length)}
  function gateHTML(message=''){return `<div class="auth-gate" id="authGate"><div class="auth-shell"><div class="auth-brand"><span>S</span><div><b>School OS</b><small>Your school life. One system.</small></div></div><div class="auth-copy"><div class="eyebrow gold">PRIVATE WORKSPACE</div><h1>Everything for school.<br><em>In one place.</em></h1><p>Tasks, notes, exams, focus, grades and Tempo planning stay synced to your account.</p></div><div class="auth-card"><div class="auth-tabs"><button class="active" data-auth-mode="signin">Sign in</button><button data-auth-mode="signup">Create account</button></div><form id="productionAuthForm"><label>Email<input name="email" type="email" autocomplete="email" required placeholder="you@example.com"></label><label>Password<input name="password" type="password" autocomplete="current-password" minlength="6" required placeholder="At least 6 characters"></label><button type="submit" class="primary auth-submit">Continue</button><button type="button" class="auth-reset" id="resetPassword">Forgot password?</button><p class="auth-message" id="authMessage">${escP(message)}</p></form></div><div class="auth-foot"><span>Secure account sync</span><span>·</span><span>Supabase Auth + RLS</span></div></div></div>`}
  function showGate(message=''){
    styleGate(); if(gate)gate.remove();document.body.classList.add('auth-locked');document.body.insertAdjacentHTML('afterbegin',gateHTML(message));gate=$('#authGate');
    $$('.auth-tabs button').forEach(b=>b.onclick=()=>{$$('.auth-tabs button').forEach(x=>x.classList.remove('active'));b.classList.add('active');gate.dataset.mode=b.dataset.authMode;$('#productionAuthForm').querySelector('.auth-submit').textContent=b.dataset.authMode==='signup'?'Create account':'Sign in';});
    gate.dataset.mode='signin';
    $('#productionAuthForm').onsubmit=submitAuth;$('#resetPassword').onclick=resetPassword;
  }
  const $$=s=>[...document.querySelectorAll(s)];
  async function submitAuth(e){
    e.preventDefault();const form=e.currentTarget,fd=new FormData(form),email=String(fd.get('email')).trim(),password=String(fd.get('password')),mode=gate.dataset.mode||'signin',msg=$('#authMessage');msg.textContent='Connecting…';
    const r=mode==='signup'?await sb.auth.signUp({email,password,options:{emailRedirectTo:location.origin+location.pathname}}):await sb.auth.signInWithPassword({email,password});
    if(r.error){msg.textContent=r.error.message;return}
    if(mode==='signup'&&!r.data.session){msg.textContent='Account created. Check your email, confirm it, then sign in.';return}
    if(r.data.session)await activateSession(r.data.session);
  }
  async function resetPassword(){const email=String($('#productionAuthForm').elements.email.value||'').trim(),msg=$('#authMessage');if(!email){msg.textContent='Enter your email first.';return}msg.textContent='Sending reset email…';const r=await sb.auth.resetPasswordForEmail(email,{redirectTo:location.origin+location.pathname+'#settings'});msg.textContent=r.error?r.error.message:'Password reset email sent.'}
  async function migrateLocalData(user){
    const local=guestSnapshot();if(!tables.some(t=>Array.isArray(local[t])&&local[t].length))return false;
    const marker='school-os-migrated-'+user.id;if(localStorage.getItem(marker))return false;
    let total=0;
    for(const table of tables){const rows=Array.isArray(local[table])?local[table]:[];if(!rows.length)continue;for(const row of rows){const copy={...row,user_id:user.id};delete copy._local;const r=await sb.from(table).upsert(copy,{onConflict:'id'});if(!r.error)total++;}}
    localStorage.setItem(marker,String(Date.now()));
    if(total){localStorage.removeItem(GUEST_KEY);notify(`Migrated ${total} local records to your cloud account.`);return true}
    return false;
  }
  async function activateSession(session){
    state.user=session.user;
    try{await migrateLocalData(session.user);if(typeof loadData==='function')await loadData();}catch(e){console.error(e);notify('Signed in, but cloud data could not finish loading.')} 
    document.body.classList.remove('auth-locked');if(gate){gate.remove();gate=null}updateAccount();
    try{localStorage.setItem('school-os-last-auth',Date.now().toString())}catch{}
  }
  function updateAccount(){const a=$('#account'),s=$('#settingsAccount'),status=$('#syncStatus');if(!a)return;const email=state.user?.email||'';a.textContent=email?email.split('@')[0]+' · Sign out':'Sign in';if(status)status.textContent=email?'Cloud sync active · '+email:'Sign in to enable cloud sync';if(s)s.textContent=email?'Sign out':'Sign in / create account';a.onclick=async()=>{if(state.user){await sb.auth.signOut()}else showGate()};if(s)s.onclick=async()=>{if(state.user){await sb.auth.signOut()}else showGate()}}
  async function boot(){
    styleGate();
    if(!window.supabase||!window.SCHOOL_OS_SUPABASE_URL||!window.SCHOOL_OS_SUPABASE_KEY){showGate('Cloud configuration is missing.');return}
    sb=window.supabase.createClient(window.SCHOOL_OS_SUPABASE_URL,window.SCHOOL_OS_SUPABASE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
    const {data}=await sb.auth.getSession();
    if(data.session){await activateSession(data.session)}else showGate(hasLocalData()?'Local data found on this device. Sign in to migrate it to your cloud account.':'');
    sb.auth.onAuthStateChange((event,session)=>{if(event==='SIGNED_OUT'){state.user=null;showGate('You are signed out. Your cloud data is safe.')}else if(session&&event!=='INITIAL_SESSION')activateSession(session)});
    window.addEventListener('online',()=>document.body.classList.remove('offline'));window.addEventListener('offline',()=>document.body.classList.add('offline'));
    updateAccount();
  }
  window.SchoolOSProduction={activateSession,showGate,migrateLocalData};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
