(function () {
  const layer = document.getElementById('bee-layer');
  if (!layer) return;

  const BEE_COUNT = 6; // tweak number if too many bees or if not enough bees

  function makeBee() {
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
    const dur = 12 + Math.random() * 8; // 12–20s
    const delay = Math.random() * -dur; // should have some start already flying
    bee.style.animationDuration = `${dur}s`;
    bee.style.animationDelay = `${delay}s`;

    layer.appendChild(bee);
  }

  for (let i = 0; i < BEE_COUNT; i++) makeBee();

  // prevents bees from going off screen when user changes window size
  window.addEventListener('resize', () => {
    layer.querySelectorAll('.bee').forEach(b => b.remove());
    for (let i = 0; i < BEE_COUNT; i++) makeBee();
  });
})();
