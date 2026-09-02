/* School OS bootstrap: run before app.js so legacy core renderers and newer OS markup agree. */
(function(){
  // app.js still references the original dashboard stat IDs. Map the new IDs
  // back before app initialization; fixes.js will restore the canonical IDs later.
  [['tasks','tasksStat'],['exams','examsStat'],['study','studyStat'],['notes','notesStat']].forEach(function(pair){
    var oldId=pair[0], newId=pair[1];
    var oldNode=document.getElementById(oldId), newNode=document.getElementById(newId);
    if(!oldNode && newNode) newNode.id=oldId;
  });

  // Reuse a single GoTrue client when multiple School OS modules initialize Supabase.
  // This prevents multiple clients from competing over the same auth storage key.
  if(window.supabase && typeof window.supabase.createClient==='function' && !window.__schoolOSSupabasePatched){
    var originalCreateClient=window.supabase.createClient;
    var cachedClient=null, cachedUrl=null, cachedKey=null;
    window.supabase.createClient=function(url,key,options){
      if(cachedClient && cachedUrl===url && cachedKey===key) return cachedClient;
      cachedClient=originalCreateClient.call(this,url,key,options);
      cachedUrl=url; cachedKey=key;
      return cachedClient;
    };
    window.__schoolOSSupabasePatched=true;
  }
})();
