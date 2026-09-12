/* ============================================================
   motion.js, couche d'animation du site Learndigi
   ------------------------------------------------------------
   Tout se branche au chargement, par sélecteur, sans toucher au
   HTML des pages : les éléments dont ce fichier a besoin sont
   créés ici. Une page qui ne contient pas la cible d'un effet
   l'ignore simplement.

   Aucune dépendance, aucun appel réseau. Le fichier s'arrête de
   lui-même si le visiteur a demandé moins d'animations.
   ============================================================ */
(function () {
  'use strict';

  var reduit = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function tous(sel, racine) {
    return [].slice.call((racine || document).querySelectorAll(sel));
  }

  /* Observateur partagé : un seul pour toute la page plutôt qu'un
     par effet, et chaque cible est oubliée une fois déclenchée. */
  function auScroll(elements, action, seuil) {
    if (!elements.length) return;
    if (!('IntersectionObserver' in window)) {
      elements.forEach(action);
      return;
    }
    var io = new IntersectionObserver(function (entrees) {
      entrees.forEach(function (e) {
        if (!e.isIntersecting) return;
        action(e.target);
        io.unobserve(e.target);
      });
    }, { threshold: seuil || 0.2, rootMargin: '0px 0px -8% 0px' });
    elements.forEach(function (el) { io.observe(el); });
  }

  /* ── 1. Barre de progression de lecture ───────────────────── */
  function progression() {
    var barre = document.createElement('div');
    barre.className = 'lx-progress';
    barre.setAttribute('aria-hidden', 'true');
    document.body.appendChild(barre);

    var attente = false;
    function maj() {
      var h = document.documentElement.scrollHeight - window.innerHeight;
      var p = h > 0 ? Math.min(window.scrollY / h, 1) : 0;
      barre.style.transform = 'scaleX(' + p + ')';
      attente = false;
    }
    window.addEventListener('scroll', function () {
      if (attente) return;
      attente = true;
      requestAnimationFrame(maj);
    }, { passive: true });
    maj();
  }

  /* ── 2. Bandeau d'outils qui défile ────────────────────────
     Remplace la grille figée de quatre logos par une piste qui
     avance en continu, et au passage montre les sept outils
     réellement travaillés pendant la formation plutôt que
     quatre. La piste est répétée assez de fois pour couvrir
     deux largeurs d'écran, sinon un trou apparaît sur les
     grands moniteurs au moment de la boucle.                  */
  var OUTILS = [
    { logo: 'logo-claude.png',   nom: 'Claude' },
    { logo: 'logo-chatgpt.png',  nom: 'ChatGPT' },
    { logo: 'logo-copilot.png',  nom: 'Microsoft Copilot' },
    { logo: 'logo-mistral.png',  nom: 'Mistral AI' },
    { logo: 'logo-apollo.png',   nom: 'Apollo' },
    { logo: 'logo-brevo.png',    nom: 'Brevo' },
    { logo: 'logo-marvin.png',   nom: 'Marvin Systems' }
  ];

  function bandeauOutils() {
    // Deux gabarits portent une grille d'outils figée : l'accueil
    // et le programme détaillé. Le premier trouvé est remplacé.
    var grille = document.querySelector('.tool-brand-grid, .prog-tool-grid');
    if (!grille) return;

    function unSet() {
      var set = document.createElement('div');
      set.className = 'lx-marquee-set';
      OUTILS.forEach(function (o) {
        var item = document.createElement('div');
        item.className = 'lx-marquee-item';
        var img = document.createElement('img');
        img.src = o.logo;
        img.alt = '';
        img.loading = 'lazy';
        img.decoding = 'async';
        img.draggable = false;
        // Dimensions déclarées : la piste occupe sa place définitive
        // avant que la moindre image soit arrivée. Sans elles, un
        // bandeau situé sous la ligne de flottaison ne se mesurait
        // jamais, puisqu'une image différée ne se charge pas tant
        // qu'on ne descend pas jusqu'à elle.
        img.width = 30;
        img.height = 30;
        var nom = document.createElement('span');
        nom.textContent = o.nom;
        item.appendChild(img);
        item.appendChild(nom);
        set.appendChild(item);
      });
      return set;
    }

    var cadre = document.createElement('div');
    cadre.className = 'lx-marquee';
    // La liste reste lisible par un lecteur d'écran une seule fois :
    // les répétitions visuelles n'ont pas à être annoncées.
    cadre.setAttribute('role', 'img');
    cadre.setAttribute('aria-label',
      'Outils travaillés pendant la formation : ' + OUTILS.map(function (o) { return o.nom; }).join(', '));

    var piste = document.createElement('div');
    piste.className = 'lx-marquee-track';
    piste.appendChild(unSet());
    cadre.appendChild(piste);

    var legende = document.createElement('span');
    legende.className = 'lx-marquee-legend';
    legende.textContent = 'Le choix retenu dépend de vos licences et de vos règles internes.';

    grille.parentNode.insertBefore(cadre, grille);
    cadre.parentNode.insertBefore(legende, cadre.nextSibling);
    grille.remove();

    // Dimensionnement une fois les logos chargés : avant, les
    // images n'ont pas de largeur et la mesure serait fausse.
    // Tant que la mesure vaut zéro, on repasse à la image
    // suivante plutôt que d'abandonner : une image mise en cache
    // peut être déclarée « complete » avant que la mise en page
    // ne lui ait donné sa largeur.
    var essais = 0;
    function dimensionner() {
      var set = piste.querySelector('.lx-marquee-set');
      if (!set) return;
      var largeurSet = set.scrollWidth;
      if (!largeurSet) {
        if (essais++ < 30) requestAnimationFrame(dimensionner);
        return;
      }
      var besoin = Math.max(cadre.offsetWidth, 320);
      var repetitions = Math.max(1, Math.ceil(besoin / largeurSet));

      piste.innerHTML = '';
      var bloc = document.createDocumentFragment();
      for (var i = 0; i < repetitions; i++) bloc.appendChild(unSet());
      piste.appendChild(bloc);
      var largeurBloc = piste.scrollWidth;
      // Le clone est la copie exacte du bloc : quand le premier a
      // fini de défiler, le second occupe déjà sa place.
      for (var j = 0; j < repetitions; j++) {
        var copie = unSet();
        copie.setAttribute('aria-hidden', 'true');
        piste.appendChild(copie);
      }
      // Vitesse constante quelle que soit la largeur : 46 pixels
      // par seconde, assez lent pour qu'un nom reste lisible.
      piste.style.setProperty('--lx-marquee-duration', Math.round(largeurBloc / 46) + 's');
    }

    // La mesure ne dépend plus du chargement des logos : leurs
    // dimensions sont déclarées, la mise en page est donc déjà
    // juste à la frame suivante. On repasse tout de même quand les
    // polices sont prêtes : le nom des outils est du texte, et
    // Figtree ne chasse pas comme la police de repli. Sans ce
    // second passage, la durée de boucle est calculée sur une
    // largeur qui n'existe plus une seconde plus tard.
    requestAnimationFrame(dimensionner);
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(function () { essais = 0; dimensionner(); });
    }

    window.addEventListener('resize', (function () {
      var t;
      return function () { clearTimeout(t); t = setTimeout(dimensionner, 250); };
    })(), { passive: true });
  }

  /* ── 3. Phrases qui s'allument mot par mot ─────────────────
     Le découpage descend dans l'arbre au lieu d'écraser le HTML :
     un <em> ou un <br> à l'intérieur du titre est conservé.    */
  function decouperEnMots(noeud) {
    [].slice.call(noeud.childNodes).forEach(function (enfant) {
      if (enfant.nodeType === 3) {
        var mots = enfant.textContent.split(/(\s+)/);
        if (!mots.length) return;
        var frag = document.createDocumentFragment();
        mots.forEach(function (m) {
          if (!m.trim()) { frag.appendChild(document.createTextNode(m)); return; }
          var s = document.createElement('span');
          s.className = 'lx-w';
          s.textContent = m;
          frag.appendChild(s);
        });
        enfant.parentNode.replaceChild(frag, enfant);
      } else if (enfant.nodeType === 1 && enfant.tagName !== 'BR') {
        decouperEnMots(enfant);
      }
    });
  }

  function phrasesAnimees(selecteurs) {
    var cibles = [];
    selecteurs.forEach(function (sel) {
      var el = document.querySelector(sel);
      if (el && !el.dataset.lxWords) {
        el.dataset.lxWords = '1';
        decouperEnMots(el);
        el.classList.add('lx-words');
        cibles.push(el);
      }
    });
    auScroll(cibles, function (el) {
      tous('.lx-w', el).forEach(function (m, i) {
        setTimeout(function () { m.classList.add('lx-w-on'); }, i * 42);
      });
    }, 0.35);
  }

  /* ── 4. Rails d'accent près des chiffres et des titres ───── */
  function rails(selecteur) {
    var cibles = tous(selecteur).filter(function (el) {
      return !el.querySelector(':scope > .lx-seg');
    });
    cibles.forEach(function (el) {
      if (getComputedStyle(el).position === 'static') el.style.position = 'relative';
      var seg = document.createElement('span');
      seg.className = 'lx-seg';
      seg.setAttribute('aria-hidden', 'true');
      el.insertBefore(seg, el.firstChild);
    });
    auScroll(cibles, function (el) {
      var seg = el.querySelector(':scope > .lx-seg');
      if (!seg) return;
      var freres = [].slice.call(el.parentNode.children).indexOf(el);
      setTimeout(function () { seg.classList.add('lx-seg-on'); }, Math.max(0, freres) * 110);
    }, 0.4);
  }

  /* ── 5. Entrées décalées des grilles ──────────────────────── */
  function grillesDecalees(selecteurs) {
    var grilles = [];
    selecteurs.forEach(function (sel) {
      tous(sel).forEach(function (g) {
        if (g.dataset.lxStagger) return;
        g.dataset.lxStagger = '1';
        g.classList.add('lx-stagger');
        [].slice.call(g.children).forEach(function (enfant, i) {
          enfant.style.setProperty('--lx-delay', (i * 0.085) + 's');
        });
        grilles.push(g);
      });
    });
    auScroll(grilles, function (g) { g.classList.add('lx-stagger-on'); }, 0.12);
  }

  /* ── 6. Boutons tactiles et cartes qui se soulèvent ───────── */
  function toucher() {
    var boutons = [
      '.hero-btn-primary', '.btn-duo', '.rdv-btn', '.cta-btn',
      '.offre-cta', '.btn-primary', '.contact-submit', '.nl-btn'
    ];
    tous(boutons.join(',')).forEach(function (b) {
      b.classList.add('lx-press');
      // L'ombre reprend la teinte du bouton, assombrie : une ombre
      // grise sous un bouton rouge ferait tache.
      var fond = getComputedStyle(b).backgroundColor;
      var m = fond.match(/\d+/g);
      if (m && m.length >= 3 && !(m[0] === '0' && m[1] === '0' && m[2] === '0' && (m[3] === '0'))) {
        var f = 0.55;
        b.style.setProperty('--lx-press-shadow',
          'rgb(' + Math.round(m[0] * f) + ',' + Math.round(m[1] * f) + ',' + Math.round(m[2] * f) + ')');
      }
    });
    tous([
      '.context-card', '.eng-card', '.trainer-card', '.fiche',      // accueil
      '.prog-mod',                                                   // programme
      '.experts-grid > *', '.deliverables-grid > *'                   // pages d'offre
    ].join(',')).forEach(function (c) {
      c.classList.add('lx-lift');
    });
    tous('.text-link, .video-link').forEach(function (a) {
      a.classList.add('lx-underline');
    });
  }

  /* ── 7. Barre de navigation au défilement ─────────────────── */
  function navigation() {
    var nav = document.querySelector('nav, .nav, header nav, .site-nav');
    if (!nav) return;
    nav.classList.add('lx-nav-shift');
    var attente = false;
    function maj() {
      nav.classList.toggle('lx-nav-on', window.scrollY > 24);
      attente = false;
    }
    window.addEventListener('scroll', function () {
      if (attente) return;
      attente = true;
      requestAnimationFrame(maj);
    }, { passive: true });
    maj();
  }

  /* ── 8. Parallaxe du fond d'accueil ───────────────────────── */
  function parallaxe() {
    var fond = document.querySelector('.hero-bg');
    if (!fond) return;
    fond.classList.add('lx-parallax');
    // L'image agrandie déborde de sa section : on referme la
    // section plutôt que de renoncer à l'agrandissement, sans
    // quoi la page défile latéralement de trente pixels.
    var section = fond.closest('section') || fond.parentElement;
    if (section) section.classList.add('lx-clip');
    var attente = false;
    function maj() {
      var y = window.scrollY;
      // On s'arrête dès que la section est passée : inutile de
      // calculer une transformation sur un élément hors écran.
      if (y < window.innerHeight * 1.2) {
        fond.style.transform = 'translate3d(0,' + (y * 0.14) + 'px,0) scale(1.06)';
      }
      attente = false;
    }
    window.addEventListener('scroll', function () {
      if (attente) return;
      attente = true;
      requestAnimationFrame(maj);
    }, { passive: true });
    maj();
  }


  /* ── 9. Frise du parcours qui se trace ─────────────────────
     Le trait avance étape par étape à mesure qu'elles entrent
     dans l'écran. C'est ce trait qui dit « ceci est une suite »,
     ce qui a permis de retirer le cadre autour de chaque étape. */
  function frise() {
    var liste = document.querySelector('.lx-frise');
    if (!liste) return;
    var etapes = tous('.lx-etape', liste);
    if (!etapes.length) return;
    var atteintes = 0;
    auScroll(etapes, function (el) {
      el.classList.add('lx-etape-on');
      atteintes++;
      // Le trait s'arrête au centre de la dernière étape atteinte,
      // sinon il dépasse dans le vide après la quatrième.
      var part = (atteintes - 0.5) / etapes.length * 100;
      liste.style.setProperty('--lx-frise-avance', Math.min(100, part).toFixed(1) + '%');
    }, 0.3);
  }

  /* ── 10. Photographies et listes à filet ───────────────────── */
  function visuels() {
    var photos = tous('.lx-photo');
    auScroll(photos, function (el) { el.classList.add('lx-photo-on'); }, 0.15);

    var listes = tous('.lx-liste');
    listes.forEach(function (l) {
      [].slice.call(l.children).forEach(function (li, i) {
        li.style.setProperty('--lx-delai', (i * 0.09) + 's');
      });
    });
    auScroll(listes, function (l) { l.classList.add('lx-liste-on'); }, 0.2);
  }


  /* ── 11. Boutons à remplissage, repris de Cuberto ───────────
     Le voile et le double du libellé sont construits ici : le
     HTML des pages n'a pas à porter les trois span imbriqués
     que leur balisage exige. Le double passe par un attribut
     lu en CSS (::after content:attr), donc le texte n'existe
     qu'une fois dans le document et un lecteur d'écran ne
     l'annonce pas deux fois.                                  */
  function boutonsRipple() {
    var cibles = tous([
      '.hero-btn-primary', '.btn-duo', '.rdv-btn', '.cta-btn',
      '.btn-primary', '.btn-secondary', '.contact-submit', '.nl-btn', '.btn-sec'
    ].join(','));

    cibles.forEach(function (b) {
      if (b.dataset.lxRipple) return;
      b.dataset.lxRipple = '1';

      // La couleur du double est celle du fond du bouton : quand le
      // voile blanc monte, le texte doit virer à cette teinte pour
      // rester lisible. Un fond transparent ne donne rien, on garde
      // alors l'encre d'origine.
      var fond = getComputedStyle(b).backgroundColor;
      var m = fond.match(/[\d.]+/g);
      var opaque = m && m.length >= 3 && (m.length < 4 || parseFloat(m[3]) > 0.5);
      if (opaque) b.style.setProperty('--lx-ripple-ink', 'rgb(' + m[0] + ',' + m[1] + ',' + m[2] + ')');

      // Le libellé se trouve à trois endroits possibles : un élément
      // dédié, un unique enfant qui porte tout le texte, ou des nœuds
      // de texte posés directement dans le bouton. Il faut le repérer
      // avant de le remplacer, sinon on ajoute le double sans retirer
      // l'original et le libellé s'affiche deux fois.
      var label = b.querySelector('.btn-label');
      if (!label) {
        // Plusieurs enfants peuvent porter du texte : sur les pages
        // d'offre le bouton s'écrit <span>libellé</span><span>flèche</span>.
        // On retient le plus long, ce qui écarte les flèches et les
        // chevrons sans avoir à les énumérer.
        var porteurs = [].slice.call(b.children)
          .map(function (c) { return { el: c, t: (c.textContent || '').trim() }; })
          .filter(function (o) { return o.t.length > 2; })
          .sort(function (a, z) { return z.t.length - a.t.length; });
        if (porteurs.length) label = porteurs[0].el;
      }
      var texte;
      if (label) {
        texte = (label.textContent || '').trim();
      } else {
        // On ne prend que le texte posé à même le bouton : une flèche
        // ou une icône dans un enfant doit rester en place.
        label = b;
        texte = [].slice.call(b.childNodes)
          .filter(function (n) { return n.nodeType === 3; })
          .map(function (n) { return n.textContent; }).join('').trim();
      }
      if (!texte) return;

      var swap = document.createElement('span');
      swap.className = 'lx-swap';
      var inner = document.createElement('span');
      inner.textContent = texte;
      inner.setAttribute('data-text', texte);
      swap.appendChild(inner);

      if (label === b) {
        // On ne garde que les éléments (svg, icônes) et on remplace le texte.
        [].slice.call(b.childNodes).forEach(function (n) {
          if (n.nodeType === 3) n.remove();
        });
        b.insertBefore(swap, b.firstChild);
      } else {
        label.textContent = '';
        label.appendChild(swap);
      }

      var fill = document.createElement('span');
      fill.className = 'lx-ripple-fill';
      fill.setAttribute('aria-hidden', 'true');
      fill.appendChild(document.createElement('i'));
      b.insertBefore(fill, b.firstChild);
      b.classList.add('lx-ripple');
    });

    // Les liens de texte reçoivent le retournement seul, sans voile.
    tous('.text-link, .video-link, .nav-links a').forEach(function (a) {
      if (a.dataset.lxSwap) return;
      var t = (a.textContent || '').trim();
      if (!t || t.length > 42 || a.querySelector('.lx-swap')) return;
      a.dataset.lxSwap = '1';
      var garde = [].slice.call(a.children);
      a.textContent = '';
      var swap = document.createElement('span');
      swap.className = 'lx-swap';
      var inner = document.createElement('span');
      inner.textContent = t;
      inner.setAttribute('data-text', t);
      swap.appendChild(inner);
      a.appendChild(swap);
      garde.forEach(function (g) { a.appendChild(g); });
      a.classList.add('lx-swaponly');
    });
  }

  /* ── 12. Survols de visuels et portraits qui se rangent ───── */
  function survols() {
    tous('.lx-photo, .trainer-card .masque, .cas-thumb').forEach(function (el) {
      if (el.querySelector('img')) el.classList.add('lx-zoom');
    });
    tous('.trainer-card').forEach(function (c) {
      if (c.querySelector('img')) c.classList.add('lx-zoom');
    });
    var groupe = document.querySelector('.team-proof-people');
    if (groupe && groupe.children.length === 2) groupe.classList.add('lx-ranger');
  }


  /* ── 13. Défilement satiné ──────────────────────────────────
     Lenis est chargé en différé par les pages. S'il n'est pas là,
     rien ne casse : le navigateur garde son défilement natif.
     On ne l'active pas si le visiteur a demandé moins
     d'animations, ni sur écran tactile, où le défilement à
     inertie du système est déjà bon et où le remplacer donne une
     sensation de flottement.                                   */
  function defilementSatine() {
    if (reduit) return;
    if (window.matchMedia('(pointer: coarse)').matches) return;
    if (typeof window.Lenis !== 'function') return;

    var lenis = new window.Lenis({
      duration: 1.05,
      easing: function (t) { return Math.min(1, 1.001 - Math.pow(2, -10 * t)); },
      smoothWheel: true,
      wheelMultiplier: 0.95
    });
    function boucle(t) { lenis.raf(t); requestAnimationFrame(boucle); }
    requestAnimationFrame(boucle);

    // Les ancres internes doivent passer par Lenis, sinon le saut
    // natif et l'inertie se disputent la position.
    document.addEventListener('click', function (e) {
      var a = e.target.closest('a[href^="#"]');
      if (!a) return;
      var id = a.getAttribute('href');
      if (!id || id === '#') return;
      var cible = document.querySelector(id);
      if (!cible) return;
      e.preventDefault();
      lenis.scrollTo(cible, { offset: -80 });
    });
    window.__lxLenis = lenis;
  }

  /* ── 14. Chevauchement et phrase géante ────────────────────── */
  var REEL = [
    ['Formation', null], ['Audit', null], ['Outils', 'sur mesure'],
    ['Conformité', null], ['Prospection', null], ['Veille', 'métier']
  ];

  function structure() {
    // La section rendez-vous remonte sur celle qui la précède.
    var rdv = document.querySelector('.rdv-section');
    if (rdv) rdv.classList.add('lx-overlap');

    // La phrase géante s'insère avant le contact, seul endroit de
    // la page où la typographie prend toute la largeur.
    var contact = document.querySelector('.contact');
    if (!contact || document.querySelector('.lx-reel')) return;

    function unSet() {
      var set = document.createElement('div');
      set.style.display = 'flex';
      set.style.alignItems = 'center';
      set.style.flex = 'none';
      REEL.forEach(function (paire) {
        var it = document.createElement('span');
        it.className = 'lx-reel-item';
        it.appendChild(document.createTextNode(paire[0]));
        if (paire[1]) {
          var em = document.createElement('em');
          em.textContent = ' ' + paire[1];
          it.appendChild(em);
        }
        var pt = document.createElement('span');
        pt.className = 'lx-reel-sep';
        pt.setAttribute('aria-hidden', 'true');
        it.appendChild(pt);
        set.appendChild(it);
      });
      return set;
    }

    var reel = document.createElement('div');
    reel.className = 'lx-reel';
    reel.setAttribute('role', 'img');
    reel.setAttribute('aria-label',
      'Formation, audit, outils sur mesure, conformité, prospection, veille métier');
    var piste = document.createElement('div');
    piste.className = 'lx-reel-track';
    piste.appendChild(unSet());
    reel.appendChild(piste);
    contact.parentNode.insertBefore(reel, contact);

    // Même principe que le bandeau d'outils : on répète assez pour
    // couvrir deux largeurs d'écran, sinon un trou apparaît à la
    // boucle sur les grands moniteurs.
    var essais = 0;
    function calibrer() {
      var set = piste.firstElementChild;
      if (!set) return;
      var l = set.scrollWidth;
      if (!l) { if (essais++ < 30) requestAnimationFrame(calibrer); return; }
      var rep = Math.max(1, Math.ceil(Math.max(reel.offsetWidth, 320) / l));
      piste.innerHTML = '';
      for (var i = 0; i < rep; i++) piste.appendChild(unSet());
      var bloc = piste.scrollWidth;
      for (var j = 0; j < rep; j++) {
        var c = unSet();
        c.setAttribute('aria-hidden', 'true');
        piste.appendChild(c);
      }
      piste.style.setProperty('--lx-reel-duration', Math.round(bloc / 62) + 's');
    }
    requestAnimationFrame(calibrer);
    // Même raison que pour le bandeau d'outils : la phrase est du
    // texte, sa largeur dépend entièrement de la police chargée.
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(function () { essais = 0; calibrer(); });
    }
    window.addEventListener('resize', (function () {
      var t; return function () { clearTimeout(t); t = setTimeout(calibrer, 250); };
    })(), { passive: true });
  }

  /* ── Mise en route ────────────────────────────────────────── */
  function demarrer() {
    // Ces deux-là servent aussi sans animation : l'un remplace une
    // grille par une liste plus complète, l'autre rend la barre
    // lisible. Ils tournent donc dans tous les cas.
    bandeauOutils();
    toucher();
    boutonsRipple();
    survols();
    structure();
    defilementSatine();

    if (reduit) {
      tous('.lx-w').forEach(function (m) { m.classList.add('lx-w-on'); });
      tous('.lx-photo').forEach(function (f) { f.classList.add('lx-photo-on'); });
      tous('.lx-liste').forEach(function (l) { l.classList.add('lx-liste-on'); });
      tous('.lx-etape').forEach(function (e) { e.classList.add('lx-etape-on'); });
      var fr = document.querySelector('.lx-frise');
      if (fr) fr.style.setProperty('--lx-frise-avance', '100%');
      return;
    }

    progression();
    navigation();
    parallaxe();
    frise();
    visuels();
    phrasesAnimees([
      '.intro-heading h2',        // accueil
      '.team-proof-copy h2',
      '.outils-heading h2',
      '.offer-hero-copy h1',      // pages d'offre
      '.prog-banner-c h1'         // programme
    ]);
    rails([
      '.vstat', '.eng-card', '.context-card', '.rdv-step', '.howto-step',
      '.prog-mod',
      '.experts-grid > *', '.deliverables-grid > *'
    ].join(','));
    // Les pages d'offre ont déjà leur propre système d'apparition
    // (offres.js et ses « reveal-target »). On n'y ajoute aucune
    // entrée décalée : deux mécanismes qui masquent le même bloc
    // finissent tôt ou tard par en laisser un invisible.
    grillesDecalees(['.deliverable-list', '.hero-list', '.tarif-crit', '.prog-points']);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', demarrer);
  } else {
    demarrer();
  }
})();
