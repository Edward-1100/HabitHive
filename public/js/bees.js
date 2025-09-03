(function () {
  function layer() {
    let el = document.getElementById('bee-layer');
    if (!el) {
      el = document.createElement('div');
      el.id = 'bee-layer';
      el.style.position = 'fixed';
      el.style.inset = '0';
      el.style.pointerEvents = 'none';
      el.style.zIndex = '40'; 
      document.body.appendChild(el);
      console.info('[bees] created #bee-layer');
    }
    return el;
  }

  const BEE_COUNT = 6; // tweak number if too many bees or if not enough bees

  function makeBee(host) {
    const bee = document.createElement('div');
    bee.className = 'bee';
	// chatGPT helped me randomize where the bees spawn and randomize the duration and delay    
    const startX = Math.random() * (window.innerWidth - 40);
    const startY = Math.random() * Math.min(260, window.innerHeight * 0.35);
    bee.style.left = `${startX}px`;
    bee.style.top  = `${startY}px`;

    // handles wing animation on the bees however if bees are png or svg then they might not move 
    // testing done locally, might have to tweak as we go
    const wing = document.createElement('div');
    wing.className = 'wings';
    bee.appendChild(wing);

    // speed variety to prevent hive mind (so bees don't sync up)
    const dur = 12 + Math.random() * 10; // 12–22s
	// const delay = Math.random() * -dur; // should have some start already flying
    bee.style.animationDuration = `${dur}s`;
    bee.style.animationDelay = `${Math.random() * -dur}s`;
	// layer.appendChild(bee);
    host.appendChild(bee);
  }
  //for (let i = 0; i < BEE_COUNT; i++) makeBee();
  function spawn(n = BEE_COUNT) {
    const host = layer();
    for (let i = 0; i < n; i++) makeBee(host);
    console.info('[bees] spawned:', n);
  }

  console.info('[bees] init');
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => spawn());
  } else {
    spawn();
  }

  // prevents bees from going off screen when user changes window size
  window.addEventListener('resize', () => {
    const host = layer();
    host.querySelectorAll('.bee').forEach(b => b.remove());
    spawn();
	//layer.querySelectorAll('.bee').forEach(b => b.remove());
    //for (let i = 0; i < BEE_COUNT; i++) makeBee();
  });
})();
