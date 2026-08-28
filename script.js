const toast = document.querySelector('.toast');
const menuToggle = document.querySelector('.menu-toggle');
const primaryNav = document.querySelector('#primary-nav');

if (menuToggle && primaryNav) {
  menuToggle.addEventListener('click', () => {
    const isOpen = menuToggle.getAttribute('aria-expanded') === 'true';
    menuToggle.setAttribute('aria-expanded', String(!isOpen));
    menuToggle.setAttribute('aria-label', isOpen ? 'Открыть навигацию' : 'Закрыть навигацию');
    primaryNav.classList.toggle('is-open', !isOpen);
  });

  primaryNav.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      menuToggle.setAttribute('aria-expanded', 'false');
      menuToggle.setAttribute('aria-label', 'Открыть навигацию');
      primaryNav.classList.remove('is-open');
    });
  });
}

const showToast = (message) => {
  toast.textContent = message;
  toast.classList.add('is-visible');
  window.clearTimeout(showToast.timeout);
  showToast.timeout = window.setTimeout(() => toast.classList.remove('is-visible'), 4200);
};

document.querySelectorAll('.tariff-button, .final-button').forEach((button) => {
  button.addEventListener('click', () => {
    const choice = button.dataset.choice;
    document.querySelectorAll('.tariff').forEach((tariff) => tariff.classList.remove('is-selected'));
    const selected = document.querySelector(`[data-tariff="${choice === 'Самостоятельно' ? 'self' : 'support'}"]`);
    if (selected) selected.classList.add('is-selected');
    showToast(choice === 'Программа'
      ? 'Это локальный прототип. Следующий шаг - утвердить программу, условия и способ заявки.'
      : `Вы выбрали «${choice}». В прототипе оплата не подключена: сначала нужно утвердить условия и форму поддержки.`);
  });
});

const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => { if (entry.isIntersecting) entry.target.classList.add('is-visible'); });
}, { threshold: 0.12 });
document.querySelectorAll('.reveal').forEach((element) => revealObserver.observe(element));

const motionSequence = document.querySelector('.motion-sequence');
const introStage = document.querySelector('.intro-stage');

if (motionSequence && window.anime && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  const transitionVariant = new URLSearchParams(window.location.search).get('transition') === 'fade'
    ? 'fade'
    : 'black';
  document.documentElement.dataset.transition = transitionVariant;
  const motionStage = motionSequence.querySelector('.motion-stage');
  const motionCurtain = motionSequence.querySelector('.motion-curtain');
  const motionChrome = motionSequence.querySelector('.motion-chrome');
  const motionTunnel = motionSequence.querySelector('.motion-tunnel');
  const motionTunnelText = motionSequence.querySelector('.motion-tunnel-text');
  const motionWordsField = motionSequence.querySelector('.motion-words');
  const motionWords = [...motionSequence.querySelectorAll('.motion-words span')];
  const motionLineTargets = [...motionSequence.querySelectorAll('.motion-destinations span')];
  const motionPosters = [...motionSequence.querySelectorAll('.motion-poster')];
  const motionFlash = motionSequence.querySelector('.motion-flash span');
  const motionResult = motionSequence.querySelector('.motion-result');
  let motionTimeline;
  let motionTicking = false;
  let requestedMotionProgress = 0;
  let displayedMotionProgress = 0;
  let mobileProgressFrame = 0;
  let previousProgressFrameTime = 0;

  const tunnelCamera = { x: 0, y: 0, width: 1400, height: 814 };
  const renderTunnelCamera = () => {
    motionTunnel.setAttribute('viewBox', `${tunnelCamera.x} ${tunnelCamera.y} ${tunnelCamera.width} ${tunnelCamera.height}`);
  };

  const getTunnelTarget = () => {
    try {
      // «П» — первая буква второго слова, но нужный круг находится в следующей «р».
      const targetIndex = 'НейроП'.length;
      const box = motionTunnelText.getExtentOfChar(targetIndex);
      const counter = {
        // The typographic bbox includes the descender. These coordinates land in
        // the visual centre of the «р» counter rather than in its line-height box.
        x: box.x + box.width * .55,
        y: box.y + box.height * .53,
      };
      return {
        // ViewBox centres on the counter, not on the baseline of the glyph.
        x: counter.x - 13,
        y: counter.y - 13,
        width: 26,
        height: 26,
      };
    } catch {
      return { x: 686, y: 398, width: 26, height: 26 };
    }
  };

  const buildMotionTimeline = () => {
    const posterAngles = window.innerWidth <= 900 ? [-19.5, 15] : [3, -3];
    window.anime.remove([motionCurtain, motionChrome, motionTunnel, motionWordsField, motionFlash, motionResult, tunnelCamera, ...motionWords, ...motionPosters]);
    window.anime.set(motionCurtain, transitionVariant === 'fade'
      ? { translateY: '0%', opacity: 0 }
      : { translateY: '100%', opacity: 1 });
    window.anime.set(motionChrome, { opacity: 0 });
    window.anime.set(motionTunnel, { opacity: 0 });
    window.anime.set(motionWords, { opacity: 0, filter: 'blur(10px)', translateX: 0, translateY: 0, scale: 1, letterSpacing: '-.04em' });
    window.anime.set(motionFlash, { opacity: 0, scale: .08 });
    window.anime.set(motionPosters[0], { opacity: 0, translateX: '-150%', translateY: '8%', scale: 0.94, rotate: posterAngles[0] });
    window.anime.set(motionPosters[1], { opacity: 0, translateX: '150%', translateY: '-8%', scale: 0.94, rotate: posterAngles[1] });
    Object.assign(tunnelCamera, { x: 0, y: 0, width: 1400, height: 814 });
    renderTunnelCamera();
    const tunnelTarget = getTunnelTarget();

    const travelToLine = motionWords.map((word) => {
      const from = word.getBoundingClientRect();
      const target = motionLineTargets.find((item) => item.dataset.skill === word.dataset.skill);
      const to = target.getBoundingClientRect();
      return {
        x: (to.left + to.width / 2) - (from.left + from.width / 2),
        y: (to.top + to.height / 2) - (from.top + from.height / 2),
      };
    });
    const stage = motionStage.getBoundingClientRect();
    // The vertical sequence contracts into one shared centre point. The words
    // briefly nest over each other before the light takes over the frame.
    const compactScale = window.innerWidth <= 900 ? .24 : .26;
    const travelToCentre = motionWords.map((word) => {
      const from = word.getBoundingClientRect();
      return {
        x: stage.left + stage.width / 2 - (from.left + from.width / 2),
        y: stage.top + stage.height / 2 - (from.top + from.height / 2),
      };
    });
    motionTimeline = window.anime.timeline({ autoplay: false, easing: 'cubicBezier(.22, 1, .36, 1)' });
    if (transitionVariant === 'fade') {
      motionTimeline.add({ targets: motionCurtain, opacity: [0, 1], duration: 1280, easing: 'linear' }, 0);
    } else {
      motionTimeline.add({ targets: motionCurtain, translateY: ['100%', '0%'], duration: 1280, easing: 'linear' }, 0);
    }

    motionTimeline
      .add({ targets: motionChrome, opacity: [0, 1], duration: 360 }, 1040)
      .add({ targets: motionTunnel, opacity: [0, 1], duration: 520 }, 900)
      .add({ targets: tunnelCamera, ...tunnelTarget, duration: 1500, easing: 'easeInOutCubic', update: renderTunnelCamera }, 1500)
      .add({ targets: motionTunnel, opacity: [1, 0], duration: 180 }, 3050)
      .add({
        targets: motionWords,
        opacity: [0, 1],
        filter: ['blur(10px)', 'blur(0px)'],
        delay: window.anime.stagger(50),
        duration: 480,
      }, 3220)
      .add({
        targets: motionPosters,
        opacity: [0, 1],
        translateX: 0,
        translateY: 0,
        scale: [.9, 1],
        rotate: (element, index) => posterAngles[index],
        delay: window.anime.stagger(110),
        duration: 360,
      }, 3260)
      .add({
        targets: motionWords,
        translateX: (element, index) => travelToLine[index].x,
        translateY: (element, index) => travelToLine[index].y,
        scale: 1.35,
        duration: 1160,
        delay: window.anime.stagger(55),
      }, 4120)
      .add({
        // Posters stay in the composition while the words begin to travel,
        // then leave through their nearest screen edge around the midpoint.
        targets: motionPosters,
        opacity: [1, 0],
        scale: [1, .94],
        translateX: (element, index) => index ? '160%' : '-160%',
        translateY: (element, index) => index ? '-8%' : '8%',
        duration: 1200,
        easing: 'linear',
      }, 4700)
      .add({ targets: motionWords, letterSpacing: ['-.04em', '-.06em'], duration: 700 }, 4380)
      // The completed vertical sequence folds into a single centre: upper words
      // descend and lower words rise. No letter morphing or stagger is used.
      .add({
        targets: motionWords,
        translateX: (element, index) => travelToCentre[index].x,
        translateY: (element, index) => travelToCentre[index].y,
        scale: compactScale,
        letterSpacing: '-.04em',
        duration: 700,
        easing: 'cubicBezier(.22, 1, .36, 1)',
      }, 6100)
      // The light starts with the inward motion, then carries the title through
      // the hand-off — there is no empty beat between the two states.
      .add({ targets: motionFlash, opacity: [0, .22, .78, 1, .7, .25, 0], scale: [.08, .52, .95, 1.4, 1.82, 2.1, 2.24], duration: 1280, easing: 'easeOutCubic' }, 6100);
  };

  const renderMotionProgress = (progress, scroll, start, distance) => {
    const isMobile = window.innerWidth <= 900;
    const isComplete = progress >= .999;
    const isActive = scroll > start && (scroll < start + distance || (isMobile && !isComplete));
    motionSequence.classList.toggle('is-active', isActive);
    motionSequence.classList.toggle('is-words-visible', progress >= .39 && progress < .856);
    motionSequence.classList.toggle('is-hand-off', progress >= .856);
    // The statement begins before the words have fully disappeared, inside the growing light.
    motionSequence.classList.toggle('is-result-visible', progress >= .838);
    motionSequence.classList.toggle('is-result-line-one', progress >= .842);
    motionSequence.classList.toggle('is-result-line-two', progress >= .848);
    introStage?.classList.toggle('is-complete', scroll >= start + distance && (!isMobile || isComplete));
    motionStage.classList.toggle('is-pinned', isActive);
    motionStage.classList.toggle('is-ended', scroll >= start + distance && (!isMobile || isComplete));
    // Use the designed duration rather than Anime's internal stagger bookkeeping:
    // this keeps every scroll position tied to the intended choreography.
    motionTimeline.seek(8000 * progress);
  };

  const advanceMobileProgress = (now) => {
    const elapsed = previousProgressFrameTime ? Math.min(48, now - previousProgressFrameTime) : 16;
    previousProgressFrameTime = now;
    // A flick cannot compress the final fold and flash into one instant:
    // the visible timeline advances at a deliberate, tactile pace.
    const velocity = displayedMotionProgress < .72 ? .45 : .1;
    const step = elapsed / 1000 * velocity;
    const delta = requestedMotionProgress - displayedMotionProgress;
    displayedMotionProgress += Math.sign(delta) * Math.min(Math.abs(delta), step);
    const distance = motionSequence.offsetHeight - window.innerHeight;
    renderMotionProgress(displayedMotionProgress, window.scrollY, 0, distance);
    if (Math.abs(requestedMotionProgress - displayedMotionProgress) > .0001) {
      mobileProgressFrame = window.requestAnimationFrame(advanceMobileProgress);
    } else {
      mobileProgressFrame = 0;
      previousProgressFrameTime = 0;
    }
  };

  const scrubMotionSequence = () => {
    motionTicking = false;
    const scroll = window.scrollY;
    const start = 0;
    const distance = motionSequence.offsetHeight - window.innerHeight;
    const progress = Math.max(0, Math.min(1, (scroll - start) / distance));
    if (window.innerWidth <= 900) {
      requestedMotionProgress = progress;
      if (!mobileProgressFrame) mobileProgressFrame = window.requestAnimationFrame(advanceMobileProgress);
      return;
    }
    displayedMotionProgress = progress;
    renderMotionProgress(progress, scroll, start, distance);
  };

  const requestMotionScrub = () => {
    if (!motionTicking) {
      motionTicking = true;
      window.requestAnimationFrame(scrubMotionSequence);
    }
  };

  buildMotionTimeline();
  scrubMotionSequence();
  if (document.fonts?.ready) {
    document.fonts.ready.then(() => {
      buildMotionTimeline();
      requestMotionScrub();
    });
  }
  window.addEventListener('scroll', requestMotionScrub, { passive: true });
  window.addEventListener('resize', () => {
    buildMotionTimeline();
    displayedMotionProgress = requestedMotionProgress = Math.max(0, Math.min(1, (window.scrollY) / (motionSequence.offsetHeight - window.innerHeight)));
    requestMotionScrub();
  });
}

window.addEventListener('pointermove', (event) => {
  const dot = document.querySelector('.cursor-dot');
  dot.style.left = `${event.clientX}px`;
  dot.style.top = `${event.clientY}px`;
});

const source = new URLSearchParams(window.location.search).get('source');
const note = document.querySelector('[data-source-note]');
if (source === 'reels') note.textContent = 'Ты пришла из Reels: здесь не «волшебный промпт», а полный путь от мысли до живого сайта.';
if (source === 'ads') note.textContent = 'Ты пришла из рекламы: начни с программы и проверь, совпадает ли твоя исходная точка с маршрутом.';

document.querySelectorAll('.programme-trigger').forEach((trigger) => {
  trigger.addEventListener('click', () => {
    const module = trigger.closest('.programme-module');
    const isOpen = module.classList.contains('is-open');
    document.querySelectorAll('.programme-module').forEach((item) => {
      const itemTrigger = item.querySelector('.programme-trigger');
      item.classList.remove('is-open');
      itemTrigger?.setAttribute('aria-expanded', 'false');
    });
    if (!isOpen) {
      module.classList.add('is-open');
      trigger.setAttribute('aria-expanded', 'true');
    }
  });
});

const statCounters = [...document.querySelectorAll('.programme-stats dt[data-count]')];
if (statCounters.length && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  const formatStat = (counter, value) => `${value}${counter.dataset.suffix || ''}`;
  const countStats = () => {
    statCounters.forEach((counter) => {
      const target = Number(counter.dataset.count);
      const startedAt = performance.now();
      const duration = target > 1000 ? 1040 : 780;
      const tick = (now) => {
        const progress = Math.min(1, (now - startedAt) / duration);
        const eased = 1 - Math.pow(1 - progress, 3);
        counter.textContent = formatStat(counter, Math.max(1, Math.round(1 + (target - 1) * eased)));
        if (progress < 1) window.requestAnimationFrame(tick);
      };
      counter.textContent = formatStat(counter, 1);
      window.requestAnimationFrame(tick);
    });
  };
  const statsObserver = new IntersectionObserver((entries, observer) => {
    if (entries.some((entry) => entry.isIntersecting)) {
      countStats();
      observer.disconnect();
    }
  }, { threshold: .55 });
  statsObserver.observe(statCounters[0].closest('.programme-stats'));
}

const workTunnel = document.querySelector('[data-work-tunnel]');
const workTunnelImages = Array.isArray(window.TUNNEL_GALLERY_IMAGES) ? window.TUNNEL_GALLERY_IMAGES : [];

if (workTunnel && workTunnelImages.length) {
  const world = workTunnel.querySelector('.work-tunnel-world');
  const segmentDepth = 240;
  const bufferSegments = 9;
  const tones = ['red', 'gray', 'white', 'black'];
  const directions = ['left', 'right', 'top', 'bottom'];
  const cycleDepth = workTunnelImages.length * segmentDepth;
  const cycleDuration = Math.max(22, workTunnelImages.length * 2.7);

  workTunnel.style.setProperty('--tunnel-cycle-depth', `${cycleDepth}px`);
  workTunnel.style.setProperty('--tunnel-duration', `${cycleDuration}s`);

  for (let segmentIndex = 0; segmentIndex < workTunnelImages.length + bufferSegments; segmentIndex += 1) {
    const segment = document.createElement('div');
    segment.className = 'work-tunnel-segment';
    segment.style.setProperty('--tunnel-z', String((segmentIndex + 1) * segmentDepth));

    const frame = document.createElement('div');
    frame.className = 'work-tunnel-frame';
    segment.append(frame);

    directions.forEach((direction, boardIndex) => {
      const board = document.createElement('figure');
      const image = document.createElement('img');
      const imageIndex = (segmentIndex + boardIndex * 3) % workTunnelImages.length;
      board.className = `work-tunnel-board work-tunnel-board--${direction} work-tunnel-board--${tones[(segmentIndex + boardIndex) % tones.length]}`;
      image.src = workTunnelImages[imageIndex];
      image.alt = '';
      image.decoding = 'async';
      board.append(image);
      segment.append(board);
    });

    world.append(segment);
  }
}
