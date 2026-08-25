const ABA_LINK='/sistema-aba-login.html';
const LABEL='Sistema ABA';

function addLink(container, beforeSelector){
  if(!container || container.querySelector(`a[href="${ABA_LINK}"]`)) return;
  const a=document.createElement('a');
  a.href=ABA_LINK;
  a.textContent=LABEL;
  a.setAttribute('data-wt-aba-link','1');
  const before=beforeSelector?container.querySelector(beforeSelector):null;
  if(before) container.insertBefore(a,before); else container.appendChild(a);
}

function mountAbaNavigation(){
  addLink(document.querySelector('.desktop-nav'),'a[href="#contato"]');
  addLink(document.querySelector('#mobileMenu'),'a[href="#contato"]');
  addLink(document.querySelector('.footer-links'),'a[href="/privacidade.html"]');
}

if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',mountAbaNavigation,{once:true});
else mountAbaNavigation();
