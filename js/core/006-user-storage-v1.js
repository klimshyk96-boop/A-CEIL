(function(){
  'use strict';
  if(window.A_CEIL_UserStorage)return;

  var PRIMARY_OWNER_ID='08d419a3-2fa5-4c40-92f4-ad72b627e734';
  var nativeGet=Storage.prototype.getItem;
  var nativeSet=Storage.prototype.setItem;
  var nativeRemove=Storage.prototype.removeItem;
  var nativeKey=Storage.prototype.key;
  var currentUserId='';
  var listeners=[];
  var tenantKeys={
    'ceiling_projects':true,
    'ceiling_projects_backup_v35':true,
    'ceiling_pendingSync':true,
    'A_CEIL_nomenclature_offline_v1':true,
    'A·CEIL_cloud_cache_v330':true,
    'A·CEIL_wall_presets_v32':true,
    'A·CEIL_wallPresetColors_v1':true,
    'wallElementPresets_v1':true,
    'A·CEIL_wallPresets_custom_v3':true,
    'A·CEIL_wallPresets_custom_v2':true,
    'A·CEIL_wallPresets_custom':true,
    'lightTypes_v1':true,
    'ceiling_v18':true,
    'ceiling_recovery_draft_v1':true,
    'ceiling_recovery_clean_v1':true
  };

  function cleanId(value){
    value=String(value||'').trim();
    return /^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(value)?value:'';
  }
  function cachedUserId(){
    try{
      var row=JSON.parse(nativeGet.call(localStorage,'A_CEIL_offline_user_v1')||'null');
      return cleanId(row&&row.id);
    }catch(_){return ''}
  }
  function runtimeUserId(){
    try{
      var user=(typeof _sbUser!=='undefined'&&_sbUser)||window._sbUser||null;
      return cleanId(user&&user.id)||currentUserId||cachedUserId();
    }catch(_){return currentUserId||cachedUserId()}
  }
  function baseKey(key){
    key=String(key||'');
    var marker=key.lastIndexOf('::user:');
    return marker>=0?key.slice(0,marker):key;
  }
  function isTenantKey(key){return tenantKeys[baseKey(key)]===true}
  function scopedKey(key,userId){
    key=String(key||'');
    if(!isTenantKey(key)||key.indexOf('::user:')>=0)return key;
    var uid=cleanId(userId)||runtimeUserId();
    return uid?key+'::user:'+uid:key+'::user:guest';
  }
  function migrateLegacy(key,userId){
    var uid=cleanId(userId);
    if(uid!==PRIMARY_OWNER_ID||!isTenantKey(key))return;
    var scoped=scopedKey(key,uid);
    try{
      if(nativeGet.call(localStorage,scoped)==null){
        var legacy=nativeGet.call(localStorage,key);
        if(legacy!=null)nativeSet.call(localStorage,scoped,legacy);
      }
    }catch(_){}
  }
  function setUser(userOrId){
    var uid=cleanId(userOrId&&userOrId.id||userOrId);
    if(!uid||uid===currentUserId)return false;
    var previous=currentUserId;
    currentUserId=uid;
    Object.keys(tenantKeys).forEach(function(key){migrateLegacy(key,uid)});
    listeners.slice().forEach(function(fn){try{fn(uid,previous)}catch(_){}});
    try{window.dispatchEvent(new CustomEvent('aceil:user-storage-changed',{detail:{userId:uid,previousUserId:previous}}))}catch(_){}
    return true;
  }
  function onChange(fn){if(typeof fn==='function')listeners.push(fn)}

  Storage.prototype.getItem=function(key){
    if(this===localStorage&&isTenantKey(key))return nativeGet.call(this,scopedKey(key));
    return nativeGet.call(this,key);
  };
  Storage.prototype.setItem=function(key,value){
    if(this===localStorage&&isTenantKey(key))return nativeSet.call(this,scopedKey(key),value);
    return nativeSet.call(this,key,value);
  };
  Storage.prototype.removeItem=function(key){
    if(this===localStorage&&isTenantKey(key))return nativeRemove.call(this,scopedKey(key));
    return nativeRemove.call(this,key);
  };

  window.A_CEIL_UserStorage={
    version:'1.0.0',
    primaryOwnerId:PRIMARY_OWNER_ID,
    getUserId:runtimeUserId,
    setUser:setUser,
    onChange:onChange,
    scopedKey:scopedKey,
    isTenantKey:isTenantKey,
    native:{getItem:nativeGet,setItem:nativeSet,removeItem:nativeRemove,key:nativeKey}
  };
  setUser(cachedUserId());
  setInterval(function(){var uid=runtimeUserId();if(uid&&uid!==currentUserId)setUser(uid)},500);
})();
