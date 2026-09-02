/* School OS runtime fixes: cloud auth, dashboard ID collision, and OS navigation. */
(function(){
  const $=s=>document.querySelector(s);
  function toastFix(msg){ if(typeof toast==='function') toast(msg); }

  // The dashboard stat IDs used to collide with the actual page section IDs.
  [['tasks','tasksStat'],['exams','examsStat'],['study','studyStat'],['notes','notesStat']].forEach(([oldId,newId])=>{
    const stat=[...document.querySelectorAll('#'+oldId)].find(n=>n.closest('.os-stats'));
    if(stat) stat.id=newId;
  });

  // Put the dynamically-created Tools navigation before Settings/New.
  const sidebar=document.querySelector('.os-sidebar');
  if(sidebar){
    const lab=[...sidebar.querySelectorAll('.workspace-label')].find(x=>x.textContent.trim()==='TOOLS');
    if(lab){
      const nav=lab.nextElementSibling;
      const bottom=sidebar.querySelector('.os-sidebar-bottom');
      if(nav && nav.tagName==='NAV' && bottom){ sidebar.insertBefore(lab,bottom); sidebar.insertBefore(nav,bottom); }
    }
  }

  if(typeof titles!=='undefined'){
    Object.assign(titles,{assistant:'AI Study Assistant',flashcards:'Flashcards',quizzes:'Quiz Center',goals:'Goals',analytics:'Analytics',files:'Files',wellbeing:'Wellbeing',trash:'Recently Deleted'});
  }

  // Keep the legacy guest collections mapped so core features don't crash in guest mode.
  if(typeof state!=='undefined'){
    state.languageProfiles=state.languageProfiles||[];
    state.language_profiles=state.language_profiles||state.languageProfiles;
    state.study_sessions=state.study_sessions||state.sessions;
  }

  // Reliable Supabase email/password auth UI.
  async function cloudAuth(){
    if(typeof sb==='undefined'||!sb){ toastFix('Cloud is not configured.'); return; }
    if(typeof state!=='undefined' && state.user){ await sb.auth.signOut(); return; }
    const root=$('#modalRoot');
    root.innerHTML=`<div class="modal-backdrop"><div class="modal"><div class="modal-head"><div><div class="eyebrow">ACCOUNT / SYNC</div><h3>Sign in to School OS</h3></div><button class="dots" id="authClose">×</button></div><form id="authForm"><div class="form-body"><label>Email<input name="email" type="email" autocomplete="email" required placeholder="you@example.com"></label><label>Password<input name="password" type="password" autocomplete="current-password" minlength="6" required placeholder="At least 6 characters"></label><label class="checkline"><input name="create" type="checkbox"> Create a new account</label><p class="form-hint">Your data can sync through Supabase. School OS never stores your password.</p><p id="authError" class="form-hint"></p></div><div class="modal-actions"><button type="button" class="ghost" id="authCancel">Cancel</button><button class="primary" type="submit">Continue</button></div></form></div></div>`;
    const close=()=>root.innerHTML=''; $('#authClose').onclick=close; $('#authCancel').onclick=close;
    $('#authForm').onsubmit=async e=>{
      e.preventDefault();
      const fd=new FormData(e.currentTarget),email=String(fd.get('email')).trim(),password=String(fd.get('password')),create=fd.get('create')==='on',err=$('#authError');
      err.textContent='Connecting…';
      const r=create?await sb.auth.signUp({email,password,options:{emailRedirectTo:location.origin+location.pathname}}):await sb.auth.signInWithPassword({email,password});
      if(r.error){err.textContent=r.error.message;return;}
      if(create && !r.data.session){err.textContent='Account created. Check your email to confirm it, then sign in.';return;}
      close();
      if(r.data.session){ state.user=r.data.user; if(typeof loadData==='function') await loadData(); if(typeof updateAccountUI==='function') updateAccountUI(); toastFix('Signed in. Cloud sync is active.'); }
    };
  }
  const account=$('#account'),settings=$('#settingsAccount');
  if(account) account.onclick=cloudAuth;
  if(settings) settings.onclick=cloudAuth;

  // Repaint the repaired dashboard stat nodes after the core app finishes its async init.
  function repairStats(){
    if(typeof state==='undefined') return;
    const open=state.assignments.filter(x=>x.status!=='completed'),done=state.assignments.length-open.length;
    const mins=state.sessions.reduce((s,x)=>s+Number(x.actual_minutes||0),0);
    const set=(id,v)=>{const n=$('#'+id);if(n)n.textContent=v};
    set('tasksStat',open.length);set('examsStat',state.exams.length);set('notesStat',state.notes.length);set('studyStat',mins+'m');
  }
  setTimeout(repairStats,0);setTimeout(repairStats,500);setTimeout(repairStats,1500);
})();
