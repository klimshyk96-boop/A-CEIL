(function(){
  "use strict";

  window.signInWithGoogle=async function(){
    var btn=document.getElementById("googleAuthBtn");
    if(typeof _sb==="undefined"||!_sb){
      if(typeof setAuthError==="function")setAuthError("Немає підключення до сервера.");
      return;
    }

    try{
      if(btn)btn.disabled=true;
      var errorBox=document.getElementById("authError");
      if(errorBox)errorBox.style.display="none";

      var result=await _sb.auth.signInWithOAuth({
        provider:"google",
        options:{
          // Keep preview users on the preview that initiated sign-in. Production
          // still resolves to https://a-ceil.pp.ua/ through location.origin.
          redirectTo:location.origin+location.pathname,
          skipBrowserRedirect:false
        }
      });
      if(result.error)throw result.error;
      return result.data;
    }catch(error){
      try{window.__diagSilent&&window.__diagSilent(error)}catch(_){window.__diagSilent&&window.__diagSilent(_)}
      if(typeof setAuthError==="function"){
        setAuthError("Google: "+(error&&error.message?error.message:"помилка входу"));
      }
      if(btn)btn.disabled=false;
    }
  };
})();
