import gsap from 'gsap';
import { Observer } from 'gsap/Observer';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(Observer, ScrollTrigger);

export function init3DCardsTornado(root: ParentNode = document): void {
  const containers = gsap.utils.toArray<HTMLElement>('[data-3d-tornado-init]', root);

  const rotationAngle = 30;
  const cardYSpacing = 0.3;
  const edgeOffset = 2;
  const orbitDepth = 35;
  const autoSpeed = 0.00325;
  const scrollSpeed = 0.015;
  const dragMultiplier = 5;
  const scrollEase = 0.1;
  const maxSpeed = 0.2;
  const edgeScale = 0.5;
  const edgeEase = gsap.parseEase('power2.inOut');
  const minScale = 1;
  const backDarkness = 0.75;
  const backBlur = 0.5;

  containers.forEach((container) => {
    const list = container.querySelector<HTMLElement>('[data-3d-tornado-list]');
    const originalCards = gsap.utils.toArray<HTMLElement>('[data-3d-tornado-item]', list)
      .map((card) => card.cloneNode(true) as HTMLElement);
    if (!list || !originalCards.length) return;

    let inputObserver: Observer | undefined;
    let resizeTimer: ReturnType<typeof setTimeout> | undefined;

    const state = {
      amount: 0,
      progress: 0,
      velocity: autoSpeed,
      direction: 1,
      cardHeight: 0,
      cardGap: 0,
      em: 16,
      isActive: false,
      cards: [] as HTMLElement[],
    };

    function getCardAmount() {
      const containerHalfHeight = container.offsetHeight * 0.5;
      const edgeOffsetDistance = state.cardHeight * edgeOffset;
      const fadeDistance = state.cardHeight * edgeScale;
      const neededDistance = containerHalfHeight + edgeOffsetDistance + fadeDistance;
      const cardsPerSide = Math.ceil(neededDistance / state.cardGap) + 1;
      const neededAmount = cardsPerSide * 2 + 1;
      const batchCount = Math.ceil(neededAmount / originalCards.length);
      return originalCards.length * batchCount;
    }

    function buildCards() {
      list!.innerHTML = '';

      const measureCard = originalCards[0].cloneNode(true) as HTMLElement;
      list!.appendChild(measureCard);
      state.cardHeight = measureCard.offsetHeight;
      state.cardGap = state.cardHeight * cardYSpacing;
      state.em = parseFloat(getComputedStyle(measureCard).fontSize);
      state.amount = getCardAmount();
      list!.innerHTML = '';

      for (let i = 0; i < state.amount; i++) {
        const card = originalCards[i % originalCards.length].cloneNode(true) as HTMLElement;
        card.dataset.index = String(i);
        list!.appendChild(card);
      }
      state.cards = gsap.utils.toArray<HTMLElement>('[data-3d-tornado-item]', list);
    }

    function getEdgeScale(y: number) {
      const containerHalfHeight = container.offsetHeight * 0.5;
      const edgeOffsetDistance = state.cardHeight * edgeOffset;
      const fadeDistance = state.cardHeight * edgeScale;
      const distanceFromCenter = Math.abs(y);
      const fadeStart = containerHalfHeight + edgeOffsetDistance;
      const progress = gsap.utils.clamp(0, 1, (fadeStart - distanceFromCenter) / fadeDistance);
      return edgeEase(progress);
    }

    function render() {
      const radius = orbitDepth * state.em;

      state.cards.forEach((card) => {
        const startIndex = parseFloat(card.dataset.index!);
        const loopIndex = ((startIndex + state.progress) % state.amount + state.amount) % state.amount;
        const index = loopIndex > state.amount * 0.5 ? loopIndex - state.amount : loopIndex;
        const angleDeg = index * rotationAngle;
        const angleRad = angleDeg * Math.PI / 180;
        const center = 1 - Math.min(Math.abs(index) / (state.amount * 0.5), 1);
        const y = index * state.cardGap;
        const baseScale = minScale + center * (1 - minScale);
        const scale = baseScale * getEdgeScale(y);
        const backAmount = gsap.utils.clamp(0, 1, (1 - Math.cos(angleRad)) * 0.5);
        const brightness = 1 - backAmount * backDarkness;
        const blur = backAmount * backBlur;

        gsap.set(card, {
          xPercent: -50,
          yPercent: -50,
          x: Math.sin(angleRad) * radius,
          y,
          z: (Math.cos(angleRad) - 1) * radius,
          rotateY: angleDeg,
          scale,
          filter: `brightness(${brightness}) blur(${blur}em)`,
          autoAlpha: 1,
          zIndex: Math.round(center * 1000),
        });
      });
    }

    function tick() {
      if (!state.isActive) return;
      const targetVelocity = autoSpeed * state.direction;
      state.velocity = gsap.utils.interpolate(state.velocity, targetVelocity, scrollEase);
      state.progress += state.velocity;
      render();
    }

    function handleInput(self: Observer) {
      if (!state.isActive) return;
      const delta = self.event.type === 'wheel'
        ? self.deltaY
        : Math.abs(self.deltaX) > Math.abs(self.deltaY)
          ? self.deltaX * dragMultiplier
          : self.deltaY * dragMultiplier;
      if (!delta) return;
      state.direction = delta > 0 ? 1 : -1;
      state.velocity += delta * scrollSpeed / 100;
      state.velocity = gsap.utils.clamp(-maxSpeed, maxSpeed, state.velocity);
    }

    function setActive(isActive: boolean) {
      state.isActive = isActive;
      if (!inputObserver) return;
      if (isActive) inputObserver.enable();
      else inputObserver.disable();
    }

    function rebuild() {
      buildCards();
      render();
    }

    rebuild();

    inputObserver = Observer.create({
      target: container,
      type: 'wheel,touch,pointer',
      preventDefault: false,
      lockAxis: true,
      onChange: handleInput,
      onPress: () => { container.style.cursor = 'grabbing'; },
      onRelease: () => { container.style.cursor = 'grab'; },
    });

    const alwaysOn = container.hasAttribute('data-3d-tornado-always');

    if (alwaysOn) {
      setActive(true);
    } else {
      ScrollTrigger.create({
        trigger: container,
        start: 'top bottom',
        end: 'bottom top',
        onEnter: () => setActive(true),
        onEnterBack: () => setActive(true),
        onLeave: () => setActive(false),
        onLeaveBack: () => setActive(false),
      });
      setActive(ScrollTrigger.isInViewport(container));
    }

    gsap.ticker.add(tick);

    const onResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        rebuild();
        ScrollTrigger.refresh();
      }, 150);
    };
    window.addEventListener('resize', onResize);
  });
}
