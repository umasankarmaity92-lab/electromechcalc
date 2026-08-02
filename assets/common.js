function scrollToResult(){
  const el = document.getElementById('resultPanel');
  if(!el) return;

  // Account for the sticky site header so the result box isn't left
  // partly hidden underneath it — measured live so it works whether
  // the header height differs (mobile vs desktop, menu open/closed).
  const header = document.querySelector('.site-header');
  const headerHeight = header ? header.getBoundingClientRect().height : 0;
  const breathingRoom = 16;

  const top = el.getBoundingClientRect().top + window.pageYOffset - headerHeight - breathingRoom;

  window.scrollTo({ top: Math.max(top, 0), behavior: 'smooth' });
}
