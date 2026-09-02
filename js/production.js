/* School OS production layer: passwordless anonymous workspace sessions, cloud-first data, migration and reliability. */
(()=>{
  const $=s=>document.querySelector(s);
  const GUEST_KEY='school-os-guest-v2', PREMIUM_KEY='school-os-premium-v1', RESTORED_KEY='school-os-premium-restored';
  const tables=['subjects','assignments','exams','notes','study_sessions','classes','grades','tempo_plans','vocabulary','flashcard_decks','goals','habits','notifications'];
  let premiumSyncTimer,premiumSyncing=false;
  const notify=m=>typeof toast==='function'?toast(m):null;
  function styleGate(){const old=document.getElementById('productionCSS');if(old)return;const l=document.createElement('link');l.id='productionCSS';l.rel='stylesheet';l.href='css/production.css';document.head.appendChild(l)}
  function guestSnapshot(){try{return JSON.parse(localStorage.getItem(GUEST_KEY)||'{}')}catch{return {}}}
  function hasLocalData(){const d=guestSnapshot();return tables.some(t=>Array.isArray(d[t])&&d[t].length)}
  function showStatus(message){const el=$('#syncStatus');if(el)el.textContent=message}
  async function migrateLocalData(user){
    const local=guestSnapshot();
    if(!tables.some(t=>Array.isArray(local[t])&&local[t].length))return false;
    const marker='school-os-migrated-'+user.id;
    if(localStorage.getItem(marker))return false;
    let total=0;
    for(const table of tables){
      const rows=Array.isArray(local[table])?local[table]:[];
      for(const row of rows){
        const copy={...row,user_id:user.id};
        delete copy._local;
        const r=await sb.from(table).upsert(copy,{onConflict:'id'});
        if(!r.error)total++;
      }
    }
    localStorage.setItem(marker,String(Date.now()));
    if(total){localStorage.removeItem(GUEST_KEY);notify(`Migrated ${total} local records to your cloud workspace.`);return true}
    return false;
  }
  async function syncPremiumFromCloud(){
    if(!state.user||premiumSyncing)return;
    premiumSyncing=true;
    try{
      const {data,error}=await sb.from('premium_state').select('state,updated_at').eq('user_id',state.user.id).maybeSingle();
      if(error)throw error;
      let local={};try{local=JSON.parse(localStorage.getItem(PREMIUM_KEY)||'{}')}catch{}
      if(data?.state&&Object.keys(data.state).length){
        const cloud=JSON.stringify(data.state),same=cloud===JSON.stringify(local);
        localStorage.setItem(PREMIUM_KEY,cloud);
        if(!same&&!sessionStorage.getItem(RESTORED_KEY)){sessionStorage.setItem(RESTORED_KEY,'1');location.reload();return}
      }else if(Object.keys(local).length){await sb.from('premium_state').upsert({user_id:state.user.id,state:local,updated_at:new Date().toISOString()},{onConflict:'user_id'})}
    }catch(e){console.warn('Premium cloud sync:',e.message)}finally{premiumSyncing=false}
  }
  async function syncPremiumToCloud(){
    if(!state.user||premiumSyncing)return;
    try{const parsed=JSON.parse(localStorage.getItem(PREMIUM_KEY)||'{}');await sb.from('premium_state').upsert({user_id:state.user.id,state:parsed,updated_at:new Date().toISOString()},{onConflict:'user_id'})}catch(e){console.warn('Premium cloud save:',e.message)}
  }
  function watchPremium(){clearInterval(premiumSyncTimer);premiumSyncTimer=setInterval(syncPremiumToCloud,5000);window.addEventListener('beforeunload',syncPremiumToCloud)}
  async function activateSession(session){
    state.user=session.user;
    try{
      await migrateLocalData(session.user);
      await syncPremiumFromCloud();
      if(typeof loadData==='function')await loadData();
    }catch(e){console.error(e);notify('Cloud sync could not finish. Your workspace is still available locally.')}
    document.body.classList.remove('auth-locked');
    showStatus('Cloud sync active · passwordless workspace');
    updateAccount();
    watchPremium();
  }
  function updateAccount(){
    const a=$('#account'),s=$('#settingsAccount');
    if(a){a.textContent='Workspace · synced';a.onclick=()=>{location.hash='#settings';}}
    if(s){s.textContent='Workspace is active';s.disabled=true;}
  }
  async function boot(){
    styleGate();
    if(!window.supabase||!window.SCHOOL_OS_SUPABASE_URL||!window.SCHOOL_OS_SUPABASE_KEY){
      state.user=null;
      document.body.classList.remove('auth-locked');
      showStatus('Device-only mode · Supabase configuration missing');
      if(typeof guestLoad==='function')guestLoad();
      return;
    }
    try{
      sb=window.supabase.createClient(window.SCHOOL_OS_SUPABASE_URL,window.SCHOOL_OS_SUPABASE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}});
      const {data}=await sb.auth.getSession();
      if(data.session){
        await activateSession(data.session);
      }else{
        const r=await sb.auth.signInAnonymously();
        if(r.error)throw r.error;
        await activateSession(r.data.session);
      }
      sb.auth.onAuthStateChange((event,session)=>{
        if(session&&event!=='INITIAL_SESSION'&&event!=='TOKEN_REFRESHED')activateSession(session);
      });
      window.addEventListener('online',()=>{document.body.classList.remove('offline');showStatus('Cloud sync active · passwordless workspace')});
      window.addEventListener('offline',()=>{document.body.classList.add('offline');showStatus('Offline · changes saved on this device')});
    }catch(e){
      console.error('Anonymous workspace:',e);
      document.body.classList.remove('auth-locked');
      showStatus('Device-only mode · enable Anonymous Sign-Ins in Supabase to sync');
      if(typeof guestLoad==='function')guestLoad();
      notify('Started in device-only mode.');
    }
  }
  window.SchoolOSProduction={activateSession,syncPremiumFromCloud,syncPremiumToCloud,hasLocalData};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
