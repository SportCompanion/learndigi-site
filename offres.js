(function(){
  var nav=document.querySelector('nav');
  var programme=document.querySelector('.nav-programme');
  var programmeButton=document.querySelector('.nav-programme-toggle');
  var burger=document.querySelector('.nav-burger');
  var links=document.querySelector('.nav-links');

  window.toggleProgramMenu=function(event,button){
    event.preventDefault();
    event.stopPropagation();
    var open=programme.classList.toggle('open');
    button.setAttribute('aria-expanded',open?'true':'false');
  };

  function closeProgramMenu(){
    if(programme)programme.classList.remove('open');
    if(programmeButton)programmeButton.setAttribute('aria-expanded','false');
  }

  window.toggleMenu=function(button){
    var open=links.classList.toggle('open');
    button.classList.toggle('open',open);
    button.setAttribute('aria-expanded',open?'true':'false');
    if(!open)closeProgramMenu();
  };

  document.addEventListener('click',function(event){
    if(programme&&!event.target.closest('.nav-programme'))closeProgramMenu();
  });
  document.addEventListener('keydown',function(event){
    if(event.key==='Escape'){
      closeProgramMenu();
      if(links)links.classList.remove('open');
      if(burger){burger.classList.remove('open');burger.setAttribute('aria-expanded','false');}
    }
  });
  document.querySelectorAll('.nav-links a').forEach(function(link){
    link.addEventListener('click',function(){
      if(links)links.classList.remove('open');
      if(burger){burger.classList.remove('open');burger.setAttribute('aria-expanded','false');}
      closeProgramMenu();
    });
  });

  function onScroll(){if(nav)nav.classList.toggle('scrolled',window.scrollY>40);}
  onScroll();
  window.addEventListener('scroll',onScroll,{passive:true});

  if(!window.matchMedia('(prefers-reduced-motion: reduce)').matches&&'IntersectionObserver'in window){
    var elements=[].slice.call(document.querySelectorAll('.reveal-target'));
    elements.forEach(function(element){element.classList.add('reveal');});
    document.querySelectorAll('.outcome-grid,.steps,.deliverables-list,.expert-cards').forEach(function(group){
      [].slice.call(group.children).forEach(function(child,index){child.style.transitionDelay=(index*.06)+'s';});
    });
    var observer=new IntersectionObserver(function(entries){
      entries.forEach(function(entry){
        if(entry.isIntersecting){entry.target.classList.add('in');observer.unobserve(entry.target);}
      });
    },{threshold:.1,rootMargin:'0px 0px -6% 0px'});
    elements.forEach(function(element){observer.observe(element);});
  }
})();
