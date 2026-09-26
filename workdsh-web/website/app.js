(() => {
  'use strict';
  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const compatibilityFaq = $('#compatibility-faq');
  function revealCompatibilityFaq() {
    if (location.hash === '#compatibility-faq') compatibilityFaq.open = true;
  }
  $('a[href="#compatibility-faq"]').addEventListener('click', () => { compatibilityFaq.open = true; });
  window.addEventListener('hashchange', revealCompatibilityFaq);
  revealCompatibilityFaq();

  // Tab activation is shared by the product gallery and source selector.
  function wireTabs(list, onSelect) {
    const tabs = $$('[role="tab"]', list);
    function select(tab) {
      tabs.forEach(item => {
        const active = item === tab;
        item.setAttribute('aria-selected', String(active));
        item.tabIndex = active ? 0 : -1;
      });
      onSelect(tab);
    }
    tabs.forEach((tab, index) => {
      tab.addEventListener('click', () => select(tab));
      tab.addEventListener('keydown', event => {
        let next;
        if (event.key === 'ArrowRight' || (list.getAttribute('aria-orientation') === 'vertical' && event.key === 'ArrowDown')) next = (index + 1) % tabs.length;
        if (event.key === 'ArrowLeft' || (list.getAttribute('aria-orientation') === 'vertical' && event.key === 'ArrowUp')) next = (index - 1 + tabs.length) % tabs.length;
        if (event.key === 'Home') next = 0;
        if (event.key === 'End') next = tabs.length - 1;
        if (next !== undefined) {
          event.preventDefault();
          select(tabs[next]);
          tabs[next].focus();
        }
      });
    });
  }
  wireTabs($('.product-tabs'), tab => {
    $$('.product-panel').forEach(panel => { panel.hidden = panel.id !== tab.getAttribute('aria-controls'); });
  });

  wireTabs($('.workspace-tabs'), tab => {
    $$('.workspace-panel').forEach(panel => { panel.hidden = panel.id !== tab.getAttribute('aria-controls'); });
  });
  let source = 'github';
  wireTabs($('.source-tabs'), tab => {
    source = tab.dataset.source;
    $('[data-repo-url]').textContent = `https://${source}.com/techflag/workdsh.git`;
    $('#source-code').setAttribute('aria-labelledby', tab.id);
  });
  let toastTimer;
  function toast(message) {
    clearTimeout(toastTimer);
    $('.toast').textContent = message;
    $('.toast').classList.add('visible');
    toastTimer = setTimeout(() => $('.toast').classList.remove('visible'), 2400);
  }
  $('[data-copy]').addEventListener('click', async event => {
    const button = event.currentTarget;
    const commands = `git clone https://${source}.com/techflag/workdsh.git\ncd workdsh\ncorepack pnpm install --frozen-lockfile\ncorepack pnpm build\ncorepack pnpm preview:install\ncorepack pnpm preview`;
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(commands);
      } else {
        const field = document.createElement('textarea');
        field.value = commands;
        Object.assign(field.style, {position:'fixed', left:'-9999px', top:'0'});
        document.body.append(field);
        field.select();
        const copied = document.execCommand('copy');
        field.remove();
        button.focus();
        if (!copied) throw new Error('Clipboard unavailable');
      }
      toast(button.dataset.copied);
    } catch { toast(button.dataset.error); }
  });

  const sourceNavigation = $('.source-navigation');
  document.addEventListener('click', event => {
    if (!sourceNavigation.contains(event.target)) sourceNavigation.open = false;
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && sourceNavigation.open) {
      sourceNavigation.open = false;
      $('summary', sourceNavigation).focus();
    }
  });
  const menu = $('#navigation');
  const menuToggle = $('.nav-toggle');
  function closeMenu() {
    menu.classList.remove('is-open');
    menuToggle.setAttribute('aria-expanded', 'false');
  }
  menuToggle.addEventListener('click', () => {
    const expanded = menuToggle.getAttribute('aria-expanded') !== 'true';
    menuToggle.setAttribute('aria-expanded', String(expanded));
    menu.classList.toggle('is-open', expanded);
  });
  $$('a', menu).forEach(link => link.addEventListener('click', closeMenu));
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && menu.classList.contains('is-open')) {
      closeMenu();
      menuToggle.focus();
    }
  });
  document.addEventListener('click', event => {
    if (!event.target.closest('.site-header')) closeMenu();
  });

  // Native dialogs supply focus trapping and Escape. Restore the invoking control.
  let dialogTrigger;
  function openDialog(dialog, trigger) {
    dialogTrigger = trigger;
    closeMenu();
    dialog.showModal();
    document.body.classList.add('dialog-open');
  }
  $$('dialog').forEach(dialog => {
    $('[data-close-dialog]', dialog).addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', event => {
      if (event.target !== dialog) return;
      const rect = dialog.getBoundingClientRect();
      if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
    });
    dialog.addEventListener('close', () => {
      document.body.classList.remove('dialog-open');
      const video = $('video', dialog);
      if (video) video.pause();
      dialogTrigger?.focus({preventScroll:true});
    });
  });
  $$('[data-zoom]').forEach(button => button.addEventListener('click', () => {
    $('#enlarged-image').src = button.dataset.zoom;
    $('#enlarged-image').alt = $('img', button).alt;
    $('#enlarged-caption').textContent = $('h3', button.closest('.product-panel')).textContent;
    openDialog($('#image-dialog'), button);
  }));
  $$('[data-open-film]').forEach(button => button.addEventListener('click', () => {
    const dialog = $('#film-dialog');
    openDialog(dialog, button);
    $('video', dialog).play().catch(() => { /* Native playback controls remain available. */ });
  }));

  if ('IntersectionObserver' in window && !reduceMotion.matches) {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, {threshold:0.08});
    $$('.reveal').forEach(element => observer.observe(element));
    document.documentElement.classList.add('enhanced');
  }
  const art = $('.hero-art');
  const scene = $('.orbit-scene');
  if (matchMedia('(hover: hover) and (pointer: fine)').matches) {
    art.addEventListener('pointermove', event => {
      if (reduceMotion.matches) return;
      const bounds = art.getBoundingClientRect();
      scene.style.setProperty('--px', `${((event.clientX - bounds.left) / bounds.width - 0.5) * 10}px`);
      scene.style.setProperty('--py', `${((event.clientY - bounds.top) / bounds.height - 0.5) * 8}px`);
    });
    art.addEventListener('pointerleave', () => {
      scene.style.setProperty('--px', '0px');
      scene.style.setProperty('--py', '0px');
    });
  }
})();
