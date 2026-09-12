(function(){
"use strict";
function removeSignOut(){
  var button=document.querySelector("#projectsModal #signOutBtn");
  if(button)button.remove();
}
function install(){
  removeSignOut();
  var original=window.openProjectsModal;
  if(typeof original==="function"&&!original.__aceilProjectsClean){
    var wrapped=function(){
      var result=original.apply(this,arguments);
      removeSignOut();
      return result;
    };
    wrapped.__aceilProjectsClean=true;
    window.openProjectsModal=wrapped;
  }
  var modal=document.getElementById("projectsModal");
  if(modal&&!modal.__aceilSignOutObserver){
    modal.__aceilSignOutObserver=new MutationObserver(removeSignOut);
    modal.__aceilSignOutObserver.observe(modal,{childList:true,subtree:true});
  }
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",install,{once:true});else install();
})();
