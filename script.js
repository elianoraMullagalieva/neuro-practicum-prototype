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
  const motionAudienceSection = document.querySelector('.audience-section');
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
    // Keep the completed «Твои навыки» statement on screen; only the next
    // micro-scroll turns its glow into the audience block's white background.
    const audienceLight = Math.max(0, Math.min(1, (progress - .94) / .06));
    motionStage.style.setProperty('--audience-light', audienceLight.toFixed(3));
    motionAudienceSection?.style.setProperty('--audience-reveal', audienceLight.toFixed(3));
    motionResult.style.filter = `blur(${(audienceLight * 7).toFixed(2)}px) brightness(${(1 + audienceLight * .38).toFixed(2)})`;
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

const persistentChrome = document.querySelector('.persistent-chrome');
const persistentAudience = document.querySelector('.audience-section');
if (persistentChrome && persistentAudience) {
  const persistentAudienceStage = persistentAudience.querySelector('.audience-stage');
  const darkChromeSections = [
    document.querySelector('.motion-sequence'),
    document.querySelector('.difference-section'),
    document.querySelector('.programme-section'),
    document.querySelector('.work-tunnel-section'),
  ].filter(Boolean);
  let chromeTicking = false;
  const updatePersistentChrome = () => {
    chromeTicking = false;
    const viewportMarker = Math.min(105, window.innerHeight * .14);
    const audienceRect = persistentAudience.getBoundingClientRect();
    const audienceActive = audienceRect.top <= viewportMarker && audienceRect.bottom > viewportMarker;
    const audienceProgress = Math.max(0, Math.min(1, -audienceRect.top / Math.max(1, audienceRect.height - window.innerHeight)));
    const audienceExit = Math.max(0, Math.min(1, (audienceProgress - .82) / .18));
    persistentAudience.style.setProperty('--audience-exit', audienceExit.toFixed(3));
    const audiencePinned = audienceRect.top <= 0 && audienceRect.bottom > window.innerHeight;
    persistentAudienceStage?.classList.toggle('is-pinned', audiencePinned);
    persistentAudienceStage?.classList.toggle('is-ended', audienceRect.bottom <= window.innerHeight);
    const isDark = audienceExit > .45 || (!audienceActive && darkChromeSections.some((section) => {
      const rect = section.getBoundingClientRect();
      return rect.top <= viewportMarker && rect.bottom > viewportMarker;
    }));
    persistentChrome.classList.add('is-visible');
    persistentChrome.classList.toggle('is-dark', isDark);
  };
  const requestPersistentChromeUpdate = () => {
    if (!chromeTicking) {
      chromeTicking = true;
      window.requestAnimationFrame(updatePersistentChrome);
    }
  };
  updatePersistentChrome();
  window.addEventListener('scroll', requestPersistentChromeUpdate, { passive:true });
  window.addEventListener('resize', requestPersistentChromeUpdate);
}

const audienceSection = document.querySelector('.audience-section');
if (audienceSection && window.anime && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  const audienceTitle = audienceSection.querySelector('.audience-intro h2');
  const audienceTitleChars = audienceTitle ? [...audienceTitle.querySelectorAll('.audience-title-effect')].flatMap((part) => {
    const text = part.textContent;
    part.setAttribute('aria-label', text.trim());
    part.textContent = '';
    return [...text].map((character) => {
      const letter = document.createElement('span');
      letter.className = 'audience-title-char';
      letter.setAttribute('aria-hidden', 'true');
      letter.textContent = character === ' ' ? '\u00a0' : character;
      part.append(letter);
      return letter;
    });
  }) : [];
  const audienceAuthor = audienceSection.querySelector('.audience-author');
  const audienceCards = [...audienceSection.querySelectorAll('.audience-card')];
  const audienceCardImages = audienceCards.map((card) => card.querySelector('img')).filter(Boolean);
  const audienceCardOverlays = audienceCards.flatMap((card) => [
    card.querySelector('.audience-card-tags'),
    card.querySelector('.audience-card-copy'),
  ]).filter(Boolean);
  let audiencePlayed = false;

  window.anime.set([audienceAuthor].filter(Boolean), {
    opacity: 0,
    translateY: 20,
    filter: 'blur(9px)',
  });
  window.anime.set(audienceTitleChars, {
    opacity: 0,
    translateY: 10,
    filter: 'blur(7px)',
  });
  window.anime.set(audienceCards, {
    opacity: 0,
    translateY: '3.5%',
    scale: 1.015,
  });
  window.anime.set(audienceCardImages, {
    filter: 'blur(22px) saturate(.72)',
    scale: 1.08,
  });
  window.anime.set(audienceCardOverlays, {
    opacity: 0,
    translateY: 10,
    filter: 'blur(8px)',
  });

  const audienceObserver = new IntersectionObserver(([entry], observer) => {
    if (!entry.isIntersecting || audiencePlayed) return;
    audiencePlayed = true;
    observer.disconnect();
    const timeline = window.anime.timeline({ easing:'cubicBezier(.22, 1, .36, 1)' });
    timeline
      .add({ targets:audienceTitleChars, opacity:[0, 1], translateY:[10, 0], filter:['blur(7px)', 'blur(0px)'], delay:window.anime.stagger(18), duration:420 }, 0)
      .add({ targets:audienceAuthor, opacity:[0, 1], translateY:[16, 0], filter:['blur(8px)', 'blur(0px)'], duration:520 }, 110)
      .add({
        targets:audienceCards,
        opacity:[0, 1],
        translateY:['3.5%', '0%'],
        scale:[1.015, 1],
        delay:window.anime.stagger(580),
        duration:640,
      }, 230)
      .add({
        targets:audienceCardImages,
        filter:['blur(22px) saturate(.72)', 'blur(0px) saturate(1)'],
        scale:[1.08, 1],
        delay:window.anime.stagger(580),
        duration:860,
        easing:'cubicBezier(.16, 1, .3, 1)',
      }, 230)
      .add({
        targets:audienceCardOverlays,
        opacity:[0, 1],
        translateY:[10, 0],
        filter:['blur(8px)', 'blur(0px)'],
        delay:(element, index) => Math.floor(index / 2) * 580 + 520,
        duration:460,
      }, 230);

  }, { threshold:.18 });
  audienceObserver.observe(audienceSection);
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
  const fallback = workTunnel.querySelector('.work-tunnel-fallback');
  workTunnelImages.slice(0, 6).forEach((src, index) => {
    const image = new Image();
    image.src = src;
    image.alt = '';
    image.loading = 'eager';
    fallback?.append(image);
  });
}

if (workTunnel && workTunnelImages.length && window.THREE) {
  const canvas = workTunnel.querySelector('.work-tunnel-canvas');
  const section = workTunnel.closest('.work-tunnel-section');
  const THREE = window.THREE;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(55, 1, .1, 1000);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias:true, powerPreference:'high-performance' });
  const tunnelWidth = 12;
  const tunnelHeight = 7.2;
  const segmentDepth = 4.2;
  const segmentCount = 17;
  const columns = 4;
  const rows = 4;
  const halfWidth = tunnelWidth / 2;
  const halfHeight = tunnelHeight / 2;
  const cellWidth = tunnelWidth / columns;
  const cellHeight = tunnelHeight / rows;
  const lineMaterial = new THREE.LineBasicMaterial({ color:'#b0b0b0', transparent:true, opacity:.2 });
  const palette = ['#bd2924', '#b0b0b0', '#f2eeee'];
  const colourMaterials = palette.map((colour) => new THREE.MeshBasicMaterial({ color:colour, side:THREE.DoubleSide }));
  const loader = new THREE.TextureLoader();
  const makeLine = (group, from, to) => {
    const geometry = new THREE.BufferGeometry().setFromPoints([from, to]);
    group.add(new THREE.Line(geometry, lineMaterial));
  };
  const fit = (width, height, ratio) => {
    const fittedWidth = Math.min(width, height * ratio);
    return { width:fittedWidth, height:fittedWidth / ratio };
  };
  const loadTexture = (src) => new Promise((resolve) => {
    loader.load(src, (texture) => {
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.minFilter = THREE.LinearFilter;
      texture.generateMipmaps = false;
      resolve({
        texture,
        ratio: texture.image.width / texture.image.height,
        orientation: texture.image.width >= texture.image.height ? 'landscape' : 'portrait',
      });
    }, undefined, () => resolve(null));
  });

  Promise.all(workTunnelImages.map(loadTexture)).then((loadedTextures) => {
    const textures = loadedTextures.filter(Boolean);
    if (!textures.length) return;
    workTunnel.classList.add('has-webgl');
    // The composition stays editable through the folder alone: portrait files
    // become the banner rails, while wider projects become the website rails.
    const siteWorks = textures.filter((item) => item.ratio >= 1.05);
    const bannerWorks = textures.filter((item) => item.ratio < 1.05);
    const segments = [];
    let population = 0;
    let running = true;
    let previous = 0;
    let raf = 0;

    const addSlab = (group, slot, material, ratio = null) => {
      const size = ratio ? fit(slot.width, slot.height, ratio) : { width:slot.width, height:slot.height };
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(size.width, size.height), material);
      mesh.position.copy(slot.position);
      mesh.rotation.copy(slot.rotation);
      group.add(mesh);
    };
    const slots = () => {
      const list = [];
      const z = -segmentDepth / 2;
      for (let column = 0; column < columns; column += 1) {
        const x = -halfWidth + column * cellWidth + cellWidth / 2;
        const rail = column === 0 || column === columns - 1 ? 'banner' : 'site';
        list.push({ face:'floor', rail, column, width:cellWidth, height:segmentDepth, position:new THREE.Vector3(x, -halfHeight, z), rotation:new THREE.Euler(-Math.PI / 2, 0, 0) });
        list.push({ face:'ceiling', rail, column, width:cellWidth, height:segmentDepth, position:new THREE.Vector3(x, halfHeight, z), rotation:new THREE.Euler(Math.PI / 2, 0, 0) });
      }
      for (let row = 0; row < rows; row += 1) {
        const y = -halfHeight + row * cellHeight + cellHeight / 2;
        list.push({ face:'left-wall', width:segmentDepth, height:cellHeight, position:new THREE.Vector3(-halfWidth, y, z), rotation:new THREE.Euler(0, Math.PI / 2, 0) });
        list.push({ face:'right-wall', width:segmentDepth, height:cellHeight, position:new THREE.Vector3(halfWidth, y, z), rotation:new THREE.Euler(0, -Math.PI / 2, 0) });
      }
      return list;
    };
    const fillSegment = (group) => {
      group.children.filter((child) => child.userData.isSlab).forEach((child) => {
        child.geometry.dispose();
        if (child.userData.disposeMaterial) child.material.dispose();
        group.remove(child);
      });
      const seed = population;
      population += 1;
      slots().forEach((slot, index) => {
        const isBannerRail = slot.rail === 'banner';
        // Banner rails alternate as a chessboard: one lower edge is occupied
        // while the opposite edge stays empty; the next depth row reverses it.
        // The ceiling mirrors the rhythm, so the frame never becomes a stripe.
        if (isBannerRail) {
          const isOccupied = (seed + slot.column + (slot.face === 'ceiling' ? 1 : 0)) % 2 === 0;
          if (!isOccupied) return;
          const source = bannerWorks.length ? bannerWorks : textures;
          const work = source[(seed + (slot.face === 'ceiling' ? 1 : 0)) % source.length];
          const material = new THREE.MeshBasicMaterial({ map:work.texture, side:THREE.DoubleSide });
          const before = group.children.length;
          addSlab(group, slot, material, work.ratio);
          group.children[before].userData.isSlab = true;
          group.children[before].userData.disposeMaterial = true;
          return;
        }

        // Most remaining cells stay black. Works lead the composition; coloured
        // fields are only occasional structural accents, never a checkerboard.
        const value = (seed * 19 + index * 11) % 41;
        if (value > 15) return;
        // One quiet coloured plane at most every third depth segment. The grid
        // should read as a gallery first; colour is just the tunnel's rhythm.
        const isAccent = value === 0 && seed % 3 === 0;
        if (!isAccent) {
          const source = siteWorks.length ? siteWorks : textures;
          const work = source[(seed * 3 + index * 5) % source.length];
          const material = new THREE.MeshBasicMaterial({ map:work.texture, side:THREE.DoubleSide });
          const before = group.children.length;
          addSlab(group, slot, material, work.ratio);
          group.children[before].userData.isSlab = true;
          group.children[before].userData.disposeMaterial = true;
        } else {
          const before = group.children.length;
          addSlab(group, slot, colourMaterials[(seed + index) % colourMaterials.length]);
          group.children[before].userData.isSlab = true;
        }
      });
    };
    const makeSegment = (z) => {
      const group = new THREE.Group();
      group.position.z = z;
      for (let column = 0; column <= columns; column += 1) {
        const x = -halfWidth + column * cellWidth;
        makeLine(group, new THREE.Vector3(x, -halfHeight, 0), new THREE.Vector3(x, -halfHeight, -segmentDepth));
        makeLine(group, new THREE.Vector3(x, halfHeight, 0), new THREE.Vector3(x, halfHeight, -segmentDepth));
      }
      for (let row = 0; row <= rows; row += 1) {
        const y = -halfHeight + row * cellHeight;
        makeLine(group, new THREE.Vector3(-halfWidth, y, 0), new THREE.Vector3(-halfWidth, y, -segmentDepth));
        makeLine(group, new THREE.Vector3(halfWidth, y, 0), new THREE.Vector3(halfWidth, y, -segmentDepth));
      }
      for (let column = 0; column <= columns; column += 1) {
        const x = -halfWidth + column * cellWidth;
        makeLine(group, new THREE.Vector3(x, -halfHeight, -segmentDepth), new THREE.Vector3(x, halfHeight, -segmentDepth));
      }
      for (let row = 0; row <= rows; row += 1) {
        const y = -halfHeight + row * cellHeight;
        makeLine(group, new THREE.Vector3(-halfWidth, y, -segmentDepth), new THREE.Vector3(halfWidth, y, -segmentDepth));
      }
      fillSegment(group);
      return group;
    };
    for (let index = 0; index < segmentCount; index += 1) {
      const segment = makeSegment(-index * segmentDepth);
      scene.add(segment);
      segments.push(segment);
    }
    const resize = () => {
      const width = Math.max(1, workTunnel.clientWidth);
      const height = Math.max(1, workTunnel.clientHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(workTunnel);
    const visibilityObserver = new IntersectionObserver(([entry]) => { running = entry.isIntersecting; }, { threshold:.02 });
    visibilityObserver.observe(section);
    camera.position.set(0, 0, 0);
    resize();
    const animate = (now) => {
      raf = window.requestAnimationFrame(animate);
      if (!running) return;
      const delta = previous ? Math.min((now - previous) / 1000, 1 / 30) : 1 / 60;
      previous = now;
      camera.position.z -= delta * .54;
      const cameraZ = camera.position.z;
      segments.forEach((segment) => {
        if (segment.position.z > cameraZ + segmentDepth) {
          const tail = Math.min(...segments.map((item) => item.position.z));
          segment.position.z = tail - segmentDepth;
          fillSegment(segment);
        }
      });
      renderer.render(scene, camera);
    };
    raf = window.requestAnimationFrame(animate);
    window.addEventListener('beforeunload', () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      visibilityObserver.disconnect();
      renderer.dispose();
    }, { once:true });
  });
}

const participantGallery = document.querySelector('[data-participant-gallery]');
if (participantGallery && workTunnelImages.length) {
  const track = participantGallery.querySelector('[data-gallery-track]');
  const previousButton = participantGallery.querySelector('[data-gallery-prev]');
  const nextButton = participantGallery.querySelector('[data-gallery-next]');
  const count = document.querySelector('[data-gallery-count]');
  const cards = workTunnelImages.map((src, index) => {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'participant-gallery-card';
    card.setAttribute('aria-label', `Показать работу ${index + 1}`);
    card.innerHTML = `<img src="${src}" alt="Работа участника ${index + 1}" draggable="false" />`;
    card.addEventListener('click', () => setActive(index));
    track.append(card);
    return card;
  });

  let activeIndex = 0;
  const relativePosition = (index) => {
    let distance = index - activeIndex;
    const half = cards.length / 2;
    if (distance > half) distance -= cards.length;
    if (distance < -half) distance += cards.length;
    return distance;
  };
  const renderGallery = () => {
    cards.forEach((card, index) => {
      const relative = relativePosition(index);
      const distance = Math.abs(relative);
      const visible = distance <= 2;
      const offset = relative * 46;
      const depth = distance ? -distance * 185 : 85;
      const scale = distance ? Math.max(.64, .88 - distance * .14) : 1.08;
      card.style.transform = `translate3d(${offset}%, 0, ${depth}px) rotateY(${(-relative * 36).toFixed(1)}deg) scale(${scale.toFixed(3)})`;
      card.style.opacity = visible ? String(Math.max(.16, 1 - distance * .36)) : '0';
      card.style.filter = distance ? `brightness(${(1 - distance * .16).toFixed(2)})` : 'none';
      card.style.zIndex = String(10 - distance);
      card.style.pointerEvents = visible ? 'auto' : 'none';
      card.setAttribute('aria-hidden', String(!visible));
    });
    if (count) count.textContent = `${String(activeIndex + 1).padStart(2, '0')} / ${String(cards.length).padStart(2, '0')}`;
  };
  const setActive = (index) => {
    activeIndex = (index + cards.length) % cards.length;
    renderGallery();
  };
  previousButton?.addEventListener('click', () => setActive(activeIndex - 1));
  nextButton?.addEventListener('click', () => setActive(activeIndex + 1));
  participantGallery.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowLeft') { event.preventDefault(); setActive(activeIndex - 1); }
    if (event.key === 'ArrowRight') { event.preventDefault(); setActive(activeIndex + 1); }
  });
  renderGallery();
}

const programmeSection = document.querySelector('.programme-section');
const tunnelSection = document.querySelector('.work-tunnel-section');
if (programmeSection && tunnelSection && workTunnel && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  let transitionQueued = false;
  const renderProgrammeTunnelHandoff = () => {
    transitionQueued = false;
    const start = tunnelSection.offsetTop;
    const distance = Math.max(440, window.innerHeight * .72);
    const progress = Math.max(0, Math.min(1, (window.scrollY - start + window.innerHeight * .4) / distance));
    const inHandoff = progress > 0;
    tunnelSection.classList.toggle('is-visible', inHandoff);

    const tunnelPresence = Math.min(1, progress / .58);
    const programmePresence = Math.max(0, 1 - progress / .72);
    workTunnel.style.opacity = tunnelPresence.toFixed(3);

    if (!inHandoff) {
      workTunnel.style.transform = 'scale(1.016)';
      programmeSection.style.transform = '';
      programmeSection.style.filter = '';
      programmeSection.style.opacity = '';
      return;
    }

    // The last programme viewport stays in place while it loses definition;
    // the tunnel has time to take the whole screen instead of simply scrolling in.
    const hold = Math.min(window.scrollY - start, distance);
    workTunnel.style.transform = `translateY(${hold.toFixed(1)}px) scale(${(1.016 - tunnelPresence * .016).toFixed(4)})`;
    programmeSection.style.transform = `translateY(${hold.toFixed(1)}px) scale(${(1 - progress * .012).toFixed(4)})`;
    programmeSection.style.filter = `blur(${(progress * 14).toFixed(2)}px) brightness(${(1 - progress * .55).toFixed(3)})`;
    programmeSection.style.opacity = programmePresence.toFixed(3);
  };
  const requestProgrammeTunnelHandoff = () => {
    if (transitionQueued) return;
    transitionQueued = true;
    window.requestAnimationFrame(renderProgrammeTunnelHandoff);
  };
  renderProgrammeTunnelHandoff();
  window.addEventListener('scroll', requestProgrammeTunnelHandoff, { passive:true });
  window.addEventListener('resize', requestProgrammeTunnelHandoff);
}
