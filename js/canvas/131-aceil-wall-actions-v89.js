
(function(){
function closeWallTapMenuV99(){
  var menu=document.getElementById("rmWallTapMenuV84");
  if(!menu)return;
  menu.classList.remove("open");
  menu.setAttribute("aria-hidden","true");
  menu.style.display="none";
}
window.A·CEILWallAddElementV89=function(){
  var side=Number(window.__A·CEILSelectedSideV89);
  closeWallTapMenuV99();
  if(side>=0){
    if(typeof window.createWallMarkOnSide==="function")window.createWallMarkOnSide(side);
    else if(typeof createWallMarkOnSide==="function")createWallMarkOnSide(side);
  }
};
window.A·CEILWallCurveV89=function(){
  var side=Number(window.__A·CEILSelectedSideV89);
  closeWallTapMenuV99();
  if(side>=0&&typeof window.rmCurveOpenV87==="function"){
    setTimeout(function(){window.rmCurveOpenV87(side)},0);
  }
};
})();
