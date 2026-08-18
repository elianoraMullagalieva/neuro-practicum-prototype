const toast = document.querySelector('.toast');
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

window.addEventListener('pointermove', (event) => {
  const dot = document.querySelector('.cursor-dot');
  dot.style.left = `${event.clientX}px`;
  dot.style.top = `${event.clientY}px`;
});

const source = new URLSearchParams(window.location.search).get('source');
const note = document.querySelector('[data-source-note]');
if (source === 'reels') note.textContent = 'Ты пришла из Reels: здесь не «волшебный промпт», а полный путь от мысли до живого сайта.';
if (source === 'ads') note.textContent = 'Ты пришла из рекламы: начни с программы и проверь, совпадает ли твоя исходная точка с маршрутом.';
