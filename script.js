// ===== ЕДИНЫЙ SCROLL-ДИСПЕТЧЕР =====
// Было: 5 отдельных scroll-слушателей, каждый со своим requestAnimationFrame —
// на мобилке они конкурировали за кадр и давали рывки при скролле.
// Стало: один слушатель + один rAF на кадр, подписчики вызываются по очереди.
const scrollSubscribers = [];
let scrollFrameQueued = false;
const runScrollSubscribers = () => {
  scrollFrameQueued = false;
  for (let i = 0; i < scrollSubscribers.length; i += 1) {
    try { scrollSubscribers[i](); } catch (_) { /* один сбойный подписчик не роняет остальные */ }
  }
};
const onScrollFrame = (fn) => {
  scrollSubscribers.push(fn);
  return () => {
    if (scrollFrameQueued) return;
    scrollFrameQueued = true;
    window.requestAnimationFrame(runScrollSubscribers);
  };
};
const requestScrollFrame = () => {
  if (scrollFrameQueued) return;
  scrollFrameQueued = true;
  window.requestAnimationFrame(runScrollSubscribers);
};
window.addEventListener('scroll', requestScrollFrame, { passive: true });
window.addEventListener('resize', requestScrollFrame);

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
  let audienceSceneReady = false;
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
    // Страховка: если секция физически ушла за верх экрана, сцена ОБЯЗАНА
    // завершиться — иначе на мобилке (инерция скролла, dvh) прогресс не доходит
    // до .999, motion-stage остаётся position:fixed и перекрывает весь сайт.
    const sectionGone = motionSequence.getBoundingClientRect().bottom <= 0;
    const isComplete = progress >= .999 || sectionGone;
    const isActive = !sectionGone && scroll > start && (scroll < start + distance || (isMobile && !isComplete));
    motionSequence.classList.toggle('is-active', isActive);
    motionSequence.classList.toggle('is-words-visible', progress >= .39 && progress < .856);
    motionSequence.classList.toggle('is-hand-off', progress >= .856);
    // The statement begins before the words have fully disappeared, inside the growing light.
    motionSequence.classList.toggle('is-result-visible', progress >= .838);
    motionSequence.classList.toggle('is-result-line-one', progress >= .842);
    motionSequence.classList.toggle('is-result-line-two', progress >= .848);
    const introComplete = sectionGone || (scroll >= start + distance && (!isMobile || isComplete));
    introStage?.classList.toggle('is-complete', introComplete);
    if (introComplete) window.dispatchEvent(new Event('persistent-chrome-update'));
    motionStage.classList.toggle('is-pinned', isActive);
    motionStage.classList.toggle('is-ended', sectionGone || (scroll >= start + distance && (!isMobile || isComplete)));
    // The completed statement gets a short reading hold.  Its exit is a neutral
    // defocus; the white audience scene only becomes readable after this title
    // is already gone, so the two texts can never compete on one frame.
    const resultExit = Math.max(0, Math.min(1, (progress - .95) / .05));
    motionStage.style.setProperty('--result-exit', resultExit.toFixed(3));
    if (!audienceSceneReady && progress >= .998 && motionAudienceSection) {
      audienceSceneReady = true;
      motionAudienceSection.classList.add('is-scene-ready');
      window.dispatchEvent(new Event('audience-scene-ready'));
    }
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
  scrollSubscribers.push(scrubMotionSequence);
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
  const persistentDifferenceSection = document.querySelector('.difference-section');
  // Тёмные секции помечены в HTML атрибутом data-chrome="dark" — над ними шапка
  // становится светлой (.is-dark). Список собирается автоматически, без хардкода:
  // добавил секции атрибут — и она уже учитывается.
  const darkChromeSections = [...document.querySelectorAll('[data-chrome="dark"]')];
  // Секции, где шапку прячем СОВСЕМ (эффектные сцены + тарифы).
  const noChromeSections = [...document.querySelectorAll('[data-chrome="none"]')];
  // Все секции с явным режимом шапки, в порядке DOM. При наложении секций
  // (напр. difference наезжает на motion через отрицательный margin) главной
  // считается ПОСЛЕДНЯЯ в DOM из пересекающих линию шапки — она визуально сверху.
  const chromeSections = [...document.querySelectorAll('[data-chrome]')];
  const activeChromeMode = (marker) => {
    let mode = 'light';
    chromeSections.forEach((section) => {
      const rect = section.getBoundingClientRect();
      if (rect.top <= marker && rect.bottom > marker) mode = section.dataset.chrome;
    });
    return mode;
  };
  let chromeTicking = false;
  let differenceSceneReady = false;
  let lastChromeScrollY = window.scrollY;
  let chromeHiddenByScroll = false;
  const updatePersistentChrome = () => {
    chromeTicking = false;
    // The first screen owns its own expanded header. The persistent version starts
    // only after it has left, so two headers can never overlap or lose contrast.
    const introIsActive = introStage && !introStage.classList.contains('is-complete');
    const viewportMarker = Math.min(105, window.innerHeight * .14);

    // Режим шапки от активной (визуально верхней) секции под её линией.
    const chromeMode = activeChromeMode(viewportMarker);
    const inNoChrome = chromeMode === 'none';

    // Direction-aware: скролл вниз прячет шапку, вверх — возвращает.
    const dy = window.scrollY - lastChromeScrollY;
    if (Math.abs(dy) > 4) {
      if (dy > 0 && window.scrollY > window.innerHeight * .6) chromeHiddenByScroll = true;
      else if (dy < 0) chromeHiddenByScroll = false;
      lastChromeScrollY = window.scrollY;
      // При остановке шапка возвращается — НО только выше блока «Работы участников».
      // После него (тарифы/вопросы/футер) шапка при паузе не всплывает, только
      // при скролле вверх (dy<0 выше). Это просьба: не отвлекать в нижней части.
      window.clearTimeout(updatePersistentChrome.idle);
      updatePersistentChrome.idle = window.setTimeout(() => {
        const worksScene = document.querySelector('[data-works-scene]');
        const pastWorks = worksScene && worksScene.getBoundingClientRect().bottom <= 0;
        if (!pastWorks) chromeHiddenByScroll = false;
        requestPersistentChromeUpdate();
      }, 420);
    }

    const audienceRect = persistentAudience.getBoundingClientRect();
    // audience (z-index:9, margin-top:-100svh) не должна перекрывать hero, когда
    // мы выше неё (её тело ниже вьюпорта). Ставим ДО early-return по introIsActive,
    // иначе на первом экране флаг не выставляется и блок «всплывает» над hero.
    persistentAudience.classList.toggle('is-below', audienceRect.top >= window.innerHeight);
    const audienceActive = audienceRect.top <= viewportMarker && audienceRect.bottom > viewportMarker;
    // На блоке «Для кого» (audience) шапка закреплена всегда — она нужна для
    // композиции и не должна прятаться при скролле вниз.
    const shouldShow = !introIsActive && !inNoChrome && (audienceActive || !chromeHiddenByScroll);
    persistentChrome.classList.toggle('is-visible', shouldShow);
    if (introIsActive) {
      persistentChrome.classList.remove('is-dark');
      return;
    }
    const audienceProgress = Math.max(0, Math.min(1, -audienceRect.top / Math.max(1, audienceRect.height - window.innerHeight)));
    const audienceExit = Math.max(0, Math.min(1, (audienceProgress - .72) / .28));
    persistentAudience.style.setProperty('--audience-exit', audienceExit.toFixed(3));
    if (!differenceSceneReady && audienceExit >= .96 && persistentDifferenceSection) {
      differenceSceneReady = true;
      persistentDifferenceSection.classList.add('is-scene-ready');
      window.dispatchEvent(new Event('difference-scene-ready'));
    }
    // Не пиннить audience, пока motion ещё активна — иначе при скролле ВВЕРХ
    // (difference→audience→hero) невидимый fixed-слой перехватывает вьюпорт и
    // возникает «залипание». Симметрично для обоих направлений.
    const motionStillActive = motionSequence && motionSequence.classList.contains('is-active');
    // Dead-band против фликера fixed<->absolute на нижней границе секции: без него
    // при скролле ВВЕРХ применение position:fixed сдвигает box (у секции отрицат.
    // margin) и следующий кадр снова триггерит is-ended -> залипание. is-ended
    // побеждает, состояния взаимоисключающие.
    const EPS = 2;
    const audienceEnded = audienceRect.bottom <= window.innerHeight - EPS;
    const audiencePinned = !motionStillActive && !audienceEnded
      && audienceRect.top <= 0 && audienceRect.bottom > window.innerHeight;
    persistentAudienceStage?.classList.toggle('is-pinned', audiencePinned);
    persistentAudienceStage?.classList.toggle('is-ended', audienceEnded);
    const audienceTakingOver = audienceActive && audienceExit < .08;
    // Пока audience ещё на экране (не ушёл вниз) — его выход тянет шапку в тёмный
    // режим. Но НИЖЕ по сайту это уже не влияет (иначе шапка застревала светлой).
    const audienceStillVisible = audienceRect.bottom > 0;
    // Светлая шапка (.is-dark), когда активная секция под линией — тёмная.
    const isDark = (audienceStillVisible && audienceExit > .45)
      || (!audienceTakingOver && !audienceActive && chromeMode === 'dark');
    persistentChrome.classList.toggle('is-dark', isDark);
  };
  const requestPersistentChromeUpdate = () => {
    if (!chromeTicking) {
      chromeTicking = true;
      window.requestAnimationFrame(updatePersistentChrome);
    }
  };
  updatePersistentChrome();
  scrollSubscribers.push(updatePersistentChrome);
  window.addEventListener('resize', requestPersistentChromeUpdate);
  window.addEventListener('persistent-chrome-update', requestPersistentChromeUpdate);
}

const audienceSection = document.querySelector('.audience-section');
if (audienceSection && window.anime && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  const audienceTitle = audienceSection.querySelector('.audience-intro h2');
  const audienceTitleWords = audienceTitle ? [...audienceTitle.querySelectorAll('.audience-title-effect')].flatMap((part) => {
    const text = part.textContent;
    part.setAttribute('aria-label', text.trim());
    part.textContent = '';
    return text.split(/(\s+)/).flatMap((token) => {
      if (/^\s+$/.test(token)) {
        part.append(document.createTextNode(' '));
        return [];
      }
      const word = document.createElement('span');
      word.className = 'audience-title-word';
      word.setAttribute('aria-hidden', 'true');
      word.textContent = token;
      part.append(word);
      return [word];
    });
  }) : [];
  const audienceAuthor = audienceSection.querySelector('.audience-author');
  const audienceCards = [...audienceSection.querySelectorAll('.audience-card')];
  const audienceCardInners = audienceCards.map((card) => card.querySelector('.audience-card-inner')).filter(Boolean);
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
  window.anime.set(audienceTitleWords, {
    opacity: 0,
    filter: 'blur(14px)',
    translateY: 6,
  });
  window.anime.set(audienceCardInners, { opacity: 0, filter: 'blur(16px)', scale: 1.05, translateY: 28 });
  window.anime.set(audienceCardImages, {
    filter: 'blur(22px) saturate(.72)',
    scale: 1.04,
  });
  window.anime.set(audienceCardOverlays, {
    opacity: 0,
    translateY: 10,
    filter: 'blur(8px)',
  });

  const playAudienceScene = () => {
    if (audiencePlayed) return;
    audiencePlayed = true;
    const timeline = window.anime.timeline({ easing:'cubicBezier(.22, 1, .36, 1)' });
    timeline
      .add({ targets:audienceTitleWords, opacity:[0, 1], filter:['blur(14px)', 'blur(0px)'], translateY:[6, 0], delay:window.anime.stagger(90), duration:680, easing:'cubicBezier(.22, 1, .36, 1)' }, 0)
      .add({ targets:audienceAuthor, opacity:[0, 1], translateY:[16, 0], filter:['blur(8px)', 'blur(0px)'], duration:520 }, 300)
    // Дорогое каскадное появление карточек: поднимаются из мягкого блюра,
    // фото проявляется из расфокуса, тексты вплывают следом. Без «пикселей».
    audienceCards.forEach((card, index) => {
      const start = 900 + index * 220;
      timeline
        .add({ targets:audienceCardInners[index], opacity:[0, 1], filter:['blur(16px)', 'blur(0px)'], scale:[1.05, 1], translateY:[28, 0], duration:900, easing:'cubicBezier(.16, 1, .3, 1)' }, start)
        .add({ targets:audienceCardImages[index], filter:['blur(24px) saturate(.7)', 'blur(0px) saturate(1)'], scale:[1.08, 1], duration:1100, easing:'cubicBezier(.16, 1, .3, 1)' }, start)
        .add({ targets:audienceCardOverlays.slice(index * 2, index * 2 + 2), opacity:[0, 1], translateY:[14, 0], filter:['blur(8px)', 'blur(0px)'], duration:560 }, start + 260);
    });
  };
  window.addEventListener('audience-scene-ready', playAudienceScene);
  if (audienceSection.classList.contains('is-scene-ready')) playAudienceScene();
}

const differenceSection = document.querySelector('.difference-section');
if (differenceSection && window.anime && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  const differenceTitleParts = [...differenceSection.querySelectorAll('.difference-title span, .difference-title i')];
  const differenceCards = [...differenceSection.querySelectorAll('.difference-card')];
  const differenceImages = differenceCards.map((card) => card.querySelector('figure img')).filter(Boolean);
  const differenceCopy = differenceCards.map((card) => card.querySelector('.difference-copy')).filter(Boolean);
  let differencePlayed = false;

  window.anime.set(differenceTitleParts, { opacity:0, translateY:70, rotate:6 });
  window.anime.set(differenceCards, { opacity:0, filter:'blur(12px)' });
  window.anime.set(differenceImages, { filter:'blur(20px) saturate(.72)', scale:1.04 });
  window.anime.set(differenceCopy, { opacity:0, translateY:12, filter:'blur(8px)' });

  const playDifferenceScene = () => {
    if (differencePlayed) return;
    differencePlayed = true;
    window.anime.timeline({ easing:'cubicBezier(.22, 1, .36, 1)' })
      .add({ targets:differenceTitleParts, opacity:[0,1], translateY:[70,0], rotate:[6,0], delay:window.anime.stagger(120), duration:800 }, 0)
      .add({ targets:differenceCards, opacity:[0,1], filter:['blur(12px)', 'blur(0px)'], delay:window.anime.stagger(560), duration:620 }, 820)
      .add({ targets:differenceImages, filter:['blur(20px) saturate(.72)', 'blur(0px) saturate(1)'], scale:[1.04,1], delay:window.anime.stagger(560), duration:840, easing:'cubicBezier(.16, 1, .3, 1)' }, 820)
      .add({ targets:differenceCopy, opacity:[0,1], translateY:[12,0], filter:['blur(8px)', 'blur(0px)'], delay:window.anime.stagger(560), duration:460 }, 1240);
  };
  window.addEventListener('difference-scene-ready', playDifferenceScene);
  if (differenceSection.classList.contains('is-scene-ready')) playDifferenceScene();
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

// Аккордеон вопросов (FAQ) — по образцу программы.
document.querySelectorAll('.questions-trigger').forEach((trigger) => {
  trigger.addEventListener('click', () => {
    const item = trigger.closest('.questions-item');
    const isOpen = item.classList.contains('is-open');
    document.querySelectorAll('.questions-item').forEach((el) => {
      el.classList.remove('is-open');
      el.querySelector('.questions-trigger')?.setAttribute('aria-expanded', 'false');
    });
    if (!isOpen) {
      item.classList.add('is-open');
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
  const section = workTunnel.closest('.works-scene');
  const stickyLayer = workTunnel.closest('.works-sticky') || section;
  const THREE = window.THREE;
  const scene = new THREE.Scene();
  scene.background = null;
  // Прогресс сцены = РЕАЛЬНЫЙ пролёт камеры вглубь (не оверлей). Контроллер
  // сцены пишет сюда 0..1, а камера физически улетает вперёд на travelDepth.
  let travelProgress = 0;
  workTunnel._setTravel = (t) => { travelProgress = Math.max(0, Math.min(1, t)); };
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
  const palette = ['#8f1d1a'];  // только приглушённый фирменный красный, без светлых плашек
  const colourMaterials = palette.map((colour) => new THREE.MeshBasicMaterial({ color:colour, side:THREE.DoubleSide }));
  const loader = new THREE.TextureLoader();
  const makeLine = () => {};  // линии-сетки отключены — сердцевина должна быть чистой
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
    // Speed reacts to scrolling: a calm base drift plus a boost that decays.
    // Scrolling feeds the boost so the tunnel "flies in" faster while the wheel
    // is moving, then eases back to the base drift on its own.
    const baseSpeed = .45;
    const maxSpeed = 6.5;
    let speed = baseSpeed;
    let driftZ = 0;      // непрерывный автодрейф вперёд
    let travelZ = 0;     // текущий форсаж от скролла (сглаженный)
    const travelDepth = 46; // на сколько единиц вглубь пролетаем за всю сцену
    let lastScrollY = window.scrollY;
    const onTunnelScroll = () => {
      if (!running) { lastScrollY = window.scrollY; return; }
      const dy = window.scrollY - lastScrollY;
      lastScrollY = window.scrollY;
      // Only downward scrolling accelerates the flight forward.
      if (dy > 0) speed = Math.min(maxSpeed, speed + dy * .09);
    };
    scrollSubscribers.push(onTunnelScroll);

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
    const visibilityObserver = new IntersectionObserver(([entry]) => { running = entry.isIntersecting; }, { threshold:0 });
    visibilityObserver.observe(stickyLayer);
    camera.position.set(0, 0, 0);
    resize();
    const animate = (now) => {
      raf = window.requestAnimationFrame(animate);
      if (!running) return;
      const delta = previous ? Math.min((now - previous) / 1000, 1 / 30) : 1 / 60;
      previous = now;
      // Speed boost eases back to base drift; the tunnel keeps living on its own.
      speed += (baseSpeed - speed) * Math.min(1, delta * 1.9);
      // Continuous auto-drift forward.
      driftZ -= delta * speed;
      // Scroll adds a REAL forward travel: the camera physically flies deeper as
      // you scroll, so works rush past and vanish behind you — a true fly-through,
      // not a dark overlay. Eased toward the target so it never jerks.
      const targetTravel = -travelProgress * travelDepth;
      travelZ += (targetTravel - travelZ) * Math.min(1, delta * 4.5);
      camera.position.z = driftZ + travelZ;
      const cameraZ = camera.position.z;
      // Пока просто дрейфуем (не погружаемся) — коридор бесконечный: ушедший
      // сегмент возвращается в хвост с новыми работами. Но КАК ТОЛЬКО начинается
      // погружение (travelProgress), переставление ОСТАНАВЛИВАЕТСЯ: новые работы
      // больше не подставляются, мы долетаем до последних и влетаем в темноту.
      if (travelProgress < 0.06) {
        segments.forEach((segment) => {
          if (segment.position.z > cameraZ + segmentDepth) {
            const tail = Math.min(...segments.map((item) => item.position.z));
            segment.position.z = tail - segmentDepth;
            fillSegment(segment);
          }
        });
      }
      renderer.render(scene, camera);
    };
    raf = window.requestAnimationFrame(animate);
    window.addEventListener('beforeunload', () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      visibilityObserver.disconnect();
      window.removeEventListener('scroll', onTunnelScroll);
      renderer.dispose();
    }, { once:true });
  });
}

const participantGallery = document.querySelector('[data-participant-gallery]');
const caseImages = Array.isArray(window.CASE_GALLERY_IMAGES) ? window.CASE_GALLERY_IMAGES : [];
if (participantGallery && (caseImages.length || workTunnelImages.length)) {
  const track = participantGallery.querySelector('[data-gallery-track]');
  const previousButton = participantGallery.querySelector('[data-gallery-prev]');
  const nextButton = participantGallery.querySelector('[data-gallery-next]');
  const count = document.querySelector('[data-gallery-count]');
  let activeIndex = 0;
  // В слайдер берём ТОЛЬКО вертикальные/квадратные работы (ratio <= 1.3).
  // Горизонтальные баннеры («Стратегия», «Дизайн» и т.п.) остаются в туннеле,
  // но в карусели они «лежат» и тянут композицию вниз — поэтому их исключаем.
  // Слайдер показывает финальные кейсы из assets/cases (отдельно от туннеля),
  // все как есть, без фильтра по ориентации.
  const sliderSources = caseImages.length ? caseImages : workTunnelImages;
  const cards = sliderSources.map((src, index) => {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'participant-gallery-card';
    card.setAttribute('aria-label', `Показать работу ${index + 1}`);
    card.innerHTML = `<img src="${src}" alt="Работа участника ${index + 1}" draggable="false" />`;
    card.addEventListener('click', () => setActive(index));
    track.append(card);
    return card;
  });

  const prepareMedia = (card) => {
    const image = card.querySelector('img');
    if (!image?.naturalWidth || !image?.naturalHeight) return;
    // Никакого авто-кропа: каждая работа показывается ЦЕЛИКОМ в своём
    // оригинальном соотношении сторон. Контейнер подстраивается под картинку,
    // а не картинка под контейнер — работы не обрезаются и не унифицируются.
    card._media = { width: image.naturalWidth, height: image.naturalHeight };
    image.style.width = '100%';
    image.style.height = '100%';
    image.style.left = '0';
    image.style.top = '0';
    fitCardsToMedia();
  };

  const fitCardsToMedia = () => {
    const bounds = track.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return;
    cards.forEach((card) => {
      const image = card.querySelector('img');
      const ratio = card._media
        ? card._media.width / card._media.height
        : image?.naturalWidth && image?.naturalHeight
          ? image.naturalWidth / image.naturalHeight
        : 16 / 9;
      const width = Math.min(bounds.width, bounds.height * ratio);
      const height = width / ratio;
      card.style.width = `${width}px`;
      card.style.height = `${height}px`;
      card.style.marginLeft = `${-width / 2}px`;
      card.style.marginTop = `${-height / 2}px`;
    });
    updateGalleryStage();
  };

  // Зона карусели ФИКСИРОВАНА по высоте (CSS var), не зависит от активной работы —
  // иначе заголовок и карусель прыгают при листании работ разной высоты. Работы
  // вписываются внутрь этой зоны по своей высоте, ширина у каждой своя.
  const updateGalleryStage = () => {};

  let loadedCount = 0;
  const onCardLoaded = (card) => {
    prepareMedia(card);
    loadedCount += 1;
    // кейсы показываем все, без отсева по ориентации
  };
  cards.forEach((card) => {
    const image = card.querySelector('img');
    image?.addEventListener('load', () => onCardLoaded(card), { once:true });
    if (image?.complete) onCardLoaded(card);
  });
  new ResizeObserver(fitCardsToMedia).observe(track);

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
    updateGalleryStage();
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
  fitCardsToMedia();
  renderGallery();
}

// ===== WORKS SCENE — единый sticky-контроллер (туннель → работы) =====
// Фазы по прогрессу сцены p (0..1):
//   p<.10  туннель играет во весь экран, слово-подпись по центру
//   .10-.48  ВЛЁТ: canvas растёт от «дырки» к экрану, слово подрастает
//   .48-.70  слово превращается в крупный заголовок и приподнимается вверх
//   .62-1.0  под словом проявляются работы (слайдер), туннель гаснет
const worksScene = document.querySelector('[data-works-scene]');
const worksTitle = document.querySelector('[data-works-title]');
const worksKicker = document.querySelector('[data-works-kicker]');
const worksStage = document.querySelector('[data-participant-gallery]');
const worksCount = document.querySelector('[data-gallery-count]');
const worksCanvas = worksScene ? worksScene.querySelector('.work-tunnel-canvas') : null;
if (worksScene && workTunnel && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  const clamp01 = (v) => Math.max(0, Math.min(1, v));
  const map = (v, a, b) => clamp01((v - a) / (b - a));
  const easeInOut = (t) => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  const easeOut = (t) => 1 - Math.pow(1 - t, 3);
  let queued = false;
  const render = () => {
    queued = false;
    const rect = worksScene.getBoundingClientRect();
    const scrollable = worksScene.offsetHeight - window.innerHeight;
    const p = scrollable > 0 ? clamp01(-rect.top / scrollable) : 0;

    if (worksCanvas) worksCanvas.style.transform = '';

    // === СТРОГО ПОСЛЕДОВАТЕЛЬНЫЕ ФАЗЫ (без наложения сцен) ===
    // A. Пролёт + рост заголовка идут ВМЕСТЕ и равномерно, заголовок по центру.
    // B. Пролёт кончился, туннель во мраке -> заголовок поднимается на место.
    // C. Только теперь появляются работы (слайдер).

    // A: РЕАЛЬНЫЙ ПРОЛЁТ вглубь — синхронно с ростом заголовка, равномерно.
    const travel = easeInOut(map(p, .06, .60));
    if (workTunnel._setTravel) workTunnel._setTravel(travel);
    // Туннель гаснет в мрак после окончания пролёта (не во время).
    // Туннель гаснет ПОЛНОСТЬЮ до появления работ — без полупрозрачного призрака.
    workTunnel.style.opacity = (1 - map(p, .58, .72)).toFixed(3);

    // Заголовок: растёт ПО ЦЕНТРУ равномерно с пролётом (grow), и ТОЛЬКО потом,
    // когда пролёт кончился и туннель погас, поднимается на место (lift).
    const grow = easeInOut(map(p, .06, .80));   // рост медленный, дорастает на последнем кадре (туннель уже пропал)
    const lift = easeInOut(map(p, .60, .84));   // подъём — растянут, плавный
    if (worksTitle) {
      worksTitle.classList.toggle('works-title-big', grow > .35);
      // lift=0 -> центр экрана; lift=1 -> верхнее место заголовка.
      const y = -lift * (window.innerHeight * .28);
      // -25% и на старте, и в финале: слово не упирается в края туннеля
      const scale = 0.2 + grow * 0.55;
      worksTitle.style.transform = `translate(-50%, calc(-50% + ${y.toFixed(1)}px)) scale(${scale.toFixed(3)})`;
      worksTitle.style.opacity = Math.max(0.7, 0.75 + grow * 0.25).toFixed(3);
    }

    // Кикер и счётчик — после того как заголовок встал на место.
    const meta = map(p, .78, .90);
    if (worksKicker) { worksKicker.style.opacity = meta.toFixed(3); worksKicker.style.transform = `translateY(${((1 - meta) * 14).toFixed(1)}px)`; }
    if (worksCount) worksCount.style.opacity = meta.toFixed(3);

    // C: Кейсы появляются ПОСЛЕ подъёма заголовка — никакого наложения на туннель.
    const revealScale = easeOut(map(p, .80, .96));
    const revealFade = easeOut(map(p, .80, .98));
    if (worksStage) {
      worksStage.style.opacity = revealFade.toFixed(3);
      const s = (0.9 + revealScale * 0.1).toFixed(3);
      worksStage.style.transform = `translateY(${((1 - revealScale) * 40).toFixed(1)}px) scale(${s})`;
    }
    // Шапка появляется только когда кейсы зафиксировались (после полёта туннеля),
    // чтобы не мешать погружению и не перекрываться летящими работами.
    worksScene.dataset.chrome = p > .74 ? 'dark' : 'none';
  };
  const request = () => { if (queued) return; queued = true; window.requestAnimationFrame(render); };
  render();
  scrollSubscribers.push(render);
  window.addEventListener('resize', request);

  // СНАП-ДОВОДЧИК ВХОДА: когда сцена показалась снизу хотя бы на ~треть и человек
  // скроллит вниз — один плавный доводчик ставит туннель во весь экран (к началу
  // sticky), чтобы не делать 3 микроскролла. Срабатывает один раз за заход.
  let snapArmed = true;          // готов сработать
  let snapping = false;          // идёт авто-доводка
  let lastY = window.scrollY;
  const smoothScrollTo = (targetY, duration = 620) => {
    snapping = true;
    const startY = window.scrollY;
    const dist = targetY - startY;
    let startT = 0;
    const step = (t) => {
      if (!startT) startT = t;
      const p = Math.min(1, (t - startT) / duration);
      const e = 1 - Math.pow(1 - p, 3); // easeOutCubic — мягко
      window.scrollTo(0, startY + dist * e);
      if (p < 1) window.requestAnimationFrame(step);
      else snapping = false;
    };
    window.requestAnimationFrame(step);
  };
  const maybeSnapIn = () => {
    if (snapping) { lastY = window.scrollY; return; }
    const rect = worksScene.getBoundingClientRect();
    const goingDown = window.scrollY > lastY;
    lastY = window.scrollY;
    const sceneTopY = window.scrollY + rect.top; // абсолютный старт sticky
    const shownFromBottom = window.innerHeight - rect.top; // сколько сцены видно снизу
    // Взведён, сцена видна на треть-две трети, ещё не долистали до полного экрана.
    if (snapArmed && goingDown && rect.top > 4 &&
        shownFromBottom > window.innerHeight * .33 &&
        shownFromBottom < window.innerHeight * 1.05) {
      snapArmed = false;
      smoothScrollTo(sceneTopY);
    }
    // Перевзвести, когда ушли выше сцены (для повторного входа сверху).
    if (rect.top > window.innerHeight * .9) snapArmed = true;
  };
  scrollSubscribers.push(maybeSnapIn);
}
