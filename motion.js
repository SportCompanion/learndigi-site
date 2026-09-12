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


  /* ── 15. La démo vivante ───────────────────────────────────
     Ce que fait vraiment un courtier : une relance d'échéance
     rédigée à partir d'un contrat. Le scénario est écrit ici
     plutôt que dans le HTML, parce qu'il change avec l'offre et
     qu'on ne veut pas le chercher dans dix pages.             */
  var DEMO = {
    dossier: 'Cabinet Laurent · Marie D.',
    contexte: 'Contrat auto · échéance le 12 octobre',
    initiales: 'MD',
    etiquettes: ['Contrat auto', 'Échéance J-30', 'Client depuis 2019'],
    instruction: "Rédige une relance d'échéance pour Marie, dans le ton du cabinet, en rappelant sa garantie bris de glace.",
    etapes: [
      ['Lecture du contrat', '4 s'],
      ['Repérage de l\'échéance et des garanties', '2 s'],
      ['Rédaction dans le ton du cabinet', '6 s'],
      ['Relecture par vos soins', 'à vous']
    ],
    outils: [
      ['logo-claude.png', 'Claude'],
      ['logo-chatgpt.png', 'ChatGPT'],
      ['logo-copilot.png', 'Microsoft Copilot'],
      ['logo-mistral.png', 'Mistral AI']
    ]
  };

  var ICONE_CRAYON = '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 20l4-1 10-10-3-3L5 16l-1 4z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>';
  var ICONE_COCHE  = '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  var ICONE_POINT  = '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="4" fill="currentColor"/></svg>';

  function demoVivante() {
    var hote = document.querySelector('.deliverable-card');
    if (!hote || hote.dataset.lxDemo) return;
    hote.dataset.lxDemo = '1';

    var d = document.createElement('div');
    d.className = 'lx-demo';
    // Le contenu est décoratif : il illustre, il ne s'annonce pas.
    // Le texte utile est déjà dans le titre de la section.
    d.setAttribute('role', 'img');
    d.setAttribute('aria-label',
      'Illustration animée : une relance client rédigée avec l\'IA, étape par étape. Exemple fictif.');

    var html = '';
    DEMO.outils.forEach(function (o) {
      html += '<span class="lx-demo-orbe"><img src="' + o[0] + '" alt="" width="22" height="22" loading="lazy" decoding="async"></span>';
    });
    html += '<div class="lx-demo-carte">';
    html += '<div class="lx-demo-tete">';
    html += '<span><b>' + DEMO.dossier + '</b><span>' + DEMO.contexte + '</span></span></div>';
    html += '<div class="lx-demo-etiq">';
    DEMO.etiquettes.forEach(function (e) { html += '<i>' + e + '</i>'; });
    html += '</div>';
    html += '<div class="lx-demo-prompt">' + ICONE_CRAYON + '<span class="lx-demo-txt"></span><span class="lx-demo-curseur"></span></div>';
    html += '<ul class="lx-demo-etapes"><span class="lx-demo-rail"><i></i></span>';
    DEMO.etapes.forEach(function (e) {
      html += '<li class="lx-demo-etape"><span class="lx-demo-pastille">' + ICONE_POINT + '</span>' +
              '<span>' + e[0] + '</span><em>' + e[1] + '</em></li>';
    });
    html += '</ul>';
    html += '<div class="lx-demo-sortie"><div><div class="lx-demo-mail">' +
            '<b>Brouillon proposé</b>' +
            '<p>Bonjour Madame D.,</p>' +
            '<p>Votre contrat auto arrive à échéance le 12 octobre. Votre garantie bris de glace reste acquise aux mêmes conditions.</p>' +
            '<p><em>Relisez, ajustez, signez.</em></p>' +
            '</div></div></div>';
    html += '<p class="lx-demo-note">Illustration animée, dossier fictif.</p>';
    html += '</div>';
    d.innerHTML = html;

    // On garde le titre et le chapeau de la carte, on remplace la liste.
    var liste = hote.querySelector('.deliverable-list');
    var note = hote.querySelector('.deliverable-note');
    if (liste) liste.remove();
    if (note) note.remove();
    hote.appendChild(d);

    if (reduit) {
      d.classList.add('lx-demo-on');
      d.querySelector('.lx-demo-txt').textContent = DEMO.instruction;
      d.classList.add('lx-demo-on-sortie');
      tous('.lx-demo-etape', d).forEach(function (e, i) {
        if (i === DEMO.etapes.length - 1) return;
        e.classList.add('est-faite');
        e.querySelector('.lx-demo-pastille').innerHTML = ICONE_COCHE;
      });
      return;
    }

    auScroll([d], function () { jouerDemo(d); }, 0.3);
  }

  function jouerDemo(d) {
    d.classList.add('lx-demo-on');
    var txt = d.querySelector('.lx-demo-txt');
    var rail = d.querySelector('.lx-demo-rail i');
    var etapes = tous('.lx-demo-etape', d);
    var phrase = DEMO.instruction;
    var i = 0;

    // La frappe avance par petits paquets de caractères : lettre à
    // lettre, une phrase de cent signes prendrait dix secondes et
    // le visiteur serait déjà parti.
    function taper() {
      i += 2 + Math.floor(Math.random() * 2);
      txt.textContent = phrase.slice(0, i);
      if (i < phrase.length) {
        setTimeout(taper, 18 + Math.random() * 26);
      } else {
        setTimeout(function () { avancer(0); }, 420);
      }
    }

    function avancer(n) {
      if (n >= etapes.length) return;
      var e = etapes[n];
      e.classList.add('est-active');
      rail.style.height = ((n + 0.5) / etapes.length * 100) + '%';

      // La dernière étape reste ouverte : c'est la relecture humaine,
      // et la laisser cochée dirait que l'IA a signé le courrier.
      // C'est au moment où elle s'ouvre que le brouillon apparaît :
      // ce qui sort de la machine arrive sur le bureau du courtier,
      // pas chez le client.
      if (n === etapes.length - 1) {
        setTimeout(function () { d.classList.add('lx-demo-on-sortie'); }, 260);
        return;
      }

      setTimeout(function () {
        e.classList.remove('est-active');
        e.classList.add('est-faite');
        e.querySelector('.lx-demo-pastille').innerHTML = ICONE_COCHE;
        rail.style.height = ((n + 1) / etapes.length * 100) + '%';
        avancer(n + 1);
      }, 900 + Math.random() * 500);
    }

    setTimeout(taper, 350);
  }

  /* ── 16. Masques à coin coupé ─────────────────────────────── */
  function masques() {
    tous('.lx-photo, .trainer-card .masque').forEach(function (el) {
      el.classList.add('lx-masque');
    });
  }


  /* ── 17. Le devis qui se compose ───────────────────────────
     Remplace la liste « ce qui fait varier le devis », qui était
     quatre puces. Les quatre critères deviennent quatre réglages
     qui se posent l'un après l'autre.

     Aucun montant n'apparaît, et c'est délibéré : le tarif est
     sur devis. En inventer un, même présenté comme exemple,
     serait un engagement qu'on ne tient pas, et le premier
     prospect à le citer au téléphone aurait raison.           */
  var DEVIS = [
    ['Participants à former', '6 personnes', 'groupe'],
    ['Modalité retenue', 'Dans vos locaux', 'lieu'],
    ['Organisation', 'Deux demi-journées', 'horloge'],
    ['Modules prioritaires', '5 sur 8', 'modules']
  ];
  var PICTOS = {
    groupe: '<svg viewBox="0 0 24 24" fill="none"><circle cx="9" cy="8" r="3.2" stroke="currentColor" stroke-width="1.8"/><path d="M3.5 19c0-3 2.5-4.8 5.5-4.8s5.5 1.8 5.5 4.8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M16 6.2a3 3 0 0 1 0 5.6M17.5 19c0-2 .6-3.4-.6-4.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
    lieu:   '<svg viewBox="0 0 24 24" fill="none"><path d="M12 21s7-5.6 7-11a7 7 0 1 0-14 0c0 5.4 7 11 7 11z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><circle cx="12" cy="10" r="2.4" stroke="currentColor" stroke-width="1.8"/></svg>',
    horloge:'<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="8.4" stroke="currentColor" stroke-width="1.8"/><path d="M12 7.4V12l3.2 2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    modules:'<svg viewBox="0 0 24 24" fill="none"><rect x="4" y="4" width="7" height="7" rx="1.6" stroke="currentColor" stroke-width="1.8"/><rect x="13" y="4" width="7" height="7" rx="1.6" stroke="currentColor" stroke-width="1.8"/><rect x="4" y="13" width="7" height="7" rx="1.6" stroke="currentColor" stroke-width="1.8"/><path d="M13.6 16.5h6M16.6 13.5v6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
    envoi:  '<svg viewBox="0 0 24 24" fill="none"><path d="M3.6 11.8 20 4.6l-7.2 16.4-2.1-6.9-7.1-2.3z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>'
  };

  function devisVivant() {
    var liste = document.querySelector('.tarif-crit');
    if (!liste || liste.dataset.lxDevis) return;
    liste.dataset.lxDevis = '1';

    var d = document.createElement('div');
    d.className = 'lx-devis';
    d.setAttribute('role', 'img');
    d.setAttribute('aria-label',
      'Illustration animée : les quatre éléments qui composent un devis, ' +
      DEVIS.map(function (l) { return l[0] + ' ' + l[1]; }).join(', ') +
      '. Proposition chiffrée sous 48 heures. Exemple fictif.');

    var html = '';
    DEVIS.forEach(function (l) {
      html += '<div class="lx-devis-ligne"><span class="lx-devis-cle">' + l[0] + '</span>' +
              '<span class="lx-devis-val">' + PICTOS[l[2]] + l[1] + '</span></div>';
    });
    html += '<div class="lx-devis-pied"><span>' + PICTOS.envoi + '</span>' +
            '<span><b>Proposition chiffrée sous 48 h</b>' +
            '<em>Après un échange de 30 minutes, sans engagement.</em></span></div>';
    d.innerHTML = html;

    liste.parentNode.insertBefore(d, liste);
    liste.remove();

    // Le panneau d'accueil est clair sur bureau et sombre plus bas :
    // on lit la couleur réellement rendue en remontant les parents
    // jusqu'au premier fond opaque, puis on bascule les teintes.
    var fond = null, n = d.parentElement;
    while (n && !fond) {
      var c = getComputedStyle(n).backgroundColor;
      var v = c.match(/[\d.]+/g);
      if (v && v.length >= 3 && (v.length < 4 || parseFloat(v[3]) > 0.6)) fond = v;
      n = n.parentElement;
    }
    if (fond) {
      // Luminance perçue : le vert pèse bien plus que le bleu dans
      // l'œil, une moyenne simple se tromperait sur un bleu marine.
      var lum = (0.2126 * fond[0] + 0.7152 * fond[1] + 0.0722 * fond[2]) / 255;
      if (lum < 0.5) {
        d.style.setProperty('--lx-devis-soft', 'rgba(255,255,255,.72)');
        d.style.setProperty('--lx-devis-line', 'rgba(255,255,255,.16)');
        d.style.setProperty('--lx-devis-ink', '#fff');
        d.style.setProperty('--lx-devis-chip', 'rgba(255,255,255,.1)');
        d.style.setProperty('--lx-devis-bord', 'rgba(255,255,255,.22)');
        d.style.setProperty('--lx-devis-faint', 'rgba(255,255,255,.6)');
      }
    }

    if (reduit) { d.classList.add('lx-devis-on'); return; }
    auScroll([d], function () { d.classList.add('lx-devis-on'); }, 0.25);
  }


  /* ── 18. Ligne de pastilles ────────────────────────────────
     Les huit modules défilent sous le parcours. Même mécanique
     de répétition que les deux autres bandeaux, et même
     recalcul quand les polices sont prêtes.                   */
  var MODULES = [
    'Introduction', 'Socle IA et prompting', 'Claude et Microsoft 365',
    'Messagerie et relances', 'Prospection avec Apollo',
    'Portefeuille avec Marvin', 'RGPD, AI Act, RSE', 'Plan d\'action'
  ];

  function pastillesModules() {
    var frise = document.querySelector('.lx-frise');
    if (!frise || document.querySelector('.lx-puces')) return;

    function unJeu() {
      var j = document.createElement('div');
      j.className = 'lx-puces-jeu';
      MODULES.forEach(function (m, i) {
        var s2 = document.createElement('span');
        var num = document.createElement('i');
        num.textContent = (i + 1 < 10 ? '0' : '') + (i + 1);
        s2.appendChild(num);
        s2.appendChild(document.createTextNode(m));
        j.appendChild(s2);
      });
      return j;
    }

    var cadre = document.createElement('div');
    cadre.className = 'lx-puces';
    cadre.setAttribute('role', 'img');
    cadre.setAttribute('aria-label', 'Les huit modules : ' + MODULES.join(', ') + '.');
    var piste = document.createElement('div');
    piste.className = 'lx-puces-piste';
    piste.appendChild(unJeu());
    cadre.appendChild(piste);
    frise.parentNode.insertBefore(cadre, frise.nextSibling);

    var essais = 0;
    function calibrer() {
      var jeu = piste.firstElementChild;
      if (!jeu) return;
      var l = jeu.scrollWidth;
      if (!l) { if (essais++ < 30) requestAnimationFrame(calibrer); return; }
      var rep = Math.max(1, Math.ceil(Math.max(cadre.offsetWidth, 320) / l));
      piste.innerHTML = '';
      for (var i = 0; i < rep; i++) piste.appendChild(unJeu());
      var bloc2 = piste.scrollWidth;
      for (var k = 0; k < rep; k++) {
        var c = unJeu();
        c.setAttribute('aria-hidden', 'true');
        piste.appendChild(c);
      }
      piste.style.setProperty('--lx-puces-duration', Math.round(bloc2 / 44) + 's');
    }
    requestAnimationFrame(calibrer);
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(function () { essais = 0; calibrer(); });
    }
    window.addEventListener('resize', (function () {
      var t; return function () { clearTimeout(t); t = setTimeout(calibrer, 250); };
    })(), { passive: true });
  }

  /* ── 19. Le filet qui se creuse ────────────────────────────
     Le tracé est recalculé à chaque mouvement de souris : un
     seul point de contrôle suit le curseur et la courbe se
     détend d'elle-même quand il sort. Le calcul reste dans une
     frame d'animation, sinon un déplacement rapide déclenche
     des centaines de redessins pour rien.                     */
  function filets() {
    if (reduit) return;
    if (window.matchMedia('(pointer: coarse)').matches) return;

    var apres = ['.howto', '.formations', '.outils', '.tarif-wrap'];
    apres.forEach(function (sel) {
      var section = document.querySelector(sel);
      if (!section || section.nextElementSibling &&
          section.nextElementSibling.classList.contains('lx-filet')) return;

      var f = document.createElement('div');
      f.className = 'lx-filet';
      f.setAttribute('aria-hidden', 'true');
      f.innerHTML = '<svg preserveAspectRatio="none"><path d=""/></svg>';
      section.parentNode.insertBefore(f, section.nextSibling);

      var path = f.querySelector('path');
      var cible = 0, actuel = 0, x = 0.5, anime = false;

      function tracer() {
        var w = f.offsetWidth || 1;
        actuel += (cible - actuel) * 0.12;
        var cx = x * w;
        path.setAttribute('d', 'M0 40 Q' + cx.toFixed(1) + ' ' + (40 + actuel).toFixed(1) + ' ' + w + ' 40');
        if (Math.abs(cible - actuel) > 0.3) {
          requestAnimationFrame(tracer);
        } else {
          actuel = cible;
          path.setAttribute('d', 'M0 40 Q' + cx.toFixed(1) + ' ' + (40 + actuel).toFixed(1) + ' ' + w + ' 40');
          anime = false;
        }
      }
      function relancer() { if (!anime) { anime = true; requestAnimationFrame(tracer); } }

      f.addEventListener('mousemove', function (e) {
        var r = f.getBoundingClientRect();
        x = (e.clientX - r.left) / (r.width || 1);
        cible = 26;
        relancer();
      });
      f.addEventListener('mouseleave', function () { cible = 0; relancer(); });
      tracer();
    });
  }

  /* ── 20. Réponses de la FAQ ────────────────────────────────
     Les pages ouvrent les réponses en posant une hauteur en
     pixels, ce qui tronque les longues. On passe la main à une
     grille qui s'adapte au contenu, et on suit l'état existant
     plutôt que de le remplacer : le bouton des pages continue
     de fonctionner tel quel.                                  */
  function faq() {
    var items = tous('.faq-item');
    if (!items.length) return;
    items.forEach(function (it) {
      var rep = it.querySelector('.faq-a');
      if (!rep || rep.dataset.lxFaq) return;
      rep.dataset.lxFaq = '1';
      var boite = document.createElement('div');
      while (rep.firstChild) boite.appendChild(rep.firstChild);
      rep.appendChild(boite);
      rep.classList.add('lx-faq-a');
      rep.style.maxHeight = 'none';
      rep.style.height = 'auto';
    });

    function suivre() {
      items.forEach(function (it) {
        var q = it.querySelector('.faq-q');
        it.classList.toggle('lx-faq-ouvert', !!(q && q.classList.contains('open')));
      });
    }
    suivre();
    var obs = new MutationObserver(suivre);
    items.forEach(function (it) {
      var q = it.querySelector('.faq-q');
      if (q) obs.observe(q, { attributes: true, attributeFilter: ['class'] });
    });
  }


  /* ── 21. La pile ───────────────────────────────────────────
     Transforme une grille de boîtes égales en une pile de bandes
     dont une seule est ouverte. Le contenu est lu depuis le
     balisage existant, on ne réécrit donc aucun texte : le titre
     et le paragraphe restent ceux que Codex a posés.

     L'ouverture suit le défilement. C'est la partie qui fait la
     différence : une pile qui n'attend qu'un clic reste un
     accordéon banal, une pile qui s'ouvre toute seule au passage
     raconte une progression.                                   */
  function enPile(conteneur, opts) {
    if (!conteneur || conteneur.dataset.lxPile) return null;
    var enfants = [].slice.call(conteneur.children).filter(function (c) {
      return c.querySelector('h3') || c.querySelector('h4');
    });
    if (enfants.length < 2) return null;
    conteneur.dataset.lxPile = '1';

    var pile = document.createElement('ol');
    pile.className = 'lx-pile';

    enfants.forEach(function (c, i) {
      var titre = c.querySelector('h3') || c.querySelector('h4');
      var texte = c.querySelector('p');
      var li = document.createElement('li');
      li.className = 'lx-pile-item';
      li.tabIndex = 0;
      li.setAttribute('role', 'button');
      li.setAttribute('aria-expanded', 'false');

      var fond = document.createElement('span');
      fond.className = 'lx-pile-fond';
      fond.setAttribute('aria-hidden', 'true');

      var tete = document.createElement('div');
      tete.className = 'lx-pile-tete';
      var num = document.createElement('span');
      num.className = 'lx-pile-num';
      num.setAttribute('aria-hidden', 'true');
      num.textContent = (i + 1 < 10 ? '0' : '') + (i + 1);
      var h = document.createElement('h3');
      h.className = 'lx-pile-titre';
      h.textContent = titre ? titre.textContent.trim() : '';
      tete.appendChild(num);
      tete.appendChild(h);

      var corps = document.createElement('div');
      corps.className = 'lx-pile-corps';
      var boite = document.createElement('div');
      var pp = document.createElement('p');
      pp.textContent = texte ? texte.textContent.trim() : '';
      boite.appendChild(pp);
      corps.appendChild(boite);

      li.appendChild(fond);
      li.appendChild(tete);
      li.appendChild(corps);
      pile.appendChild(li);
    });

    conteneur.parentNode.insertBefore(pile, conteneur);
    conteneur.remove();

    var items = tous('.lx-pile-item', pile);
    function ouvrir(n) {
      items.forEach(function (it, k) {
        var actif = k === n;
        it.classList.toggle('est-ouvert', actif);
        it.setAttribute('aria-expanded', actif ? 'true' : 'false');
      });
    }
    ouvrir(0);

    items.forEach(function (it, n) {
      it.addEventListener('click', function () { ouvrir(n); });
      it.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); ouvrir(n); }
      });
    });

    if (reduit || !opts || !opts.auDefilement) return pile;

    // Le choix se calcule sur la position de la PILE, jamais sur
    // celle des bandes.
    //
    // C'était le défaut : mesurer chaque bande créait une boucle.
    // Une bande s'ouvrait, celles du dessous descendaient de sa
    // hauteur dépliée, le calcul suivant désignait une autre
    // bande, et l'ouverture se mettait à osciller pendant tout le
    // défilement. En divisant la hauteur de la pile en autant de
    // zones qu'il y a de bandes, la référence ne bouge plus :
    // la pile garde la même hauteur puisqu'une seule bande est
    // ouverte à la fois.
    var attente = false, courant = 0, gele = 0;
    function suivre() {
      attente = false;
      var maintenant = Date.now();
      // Petit gel après un changement : pendant les 0,52 s de
      // transition la hauteur varie légèrement, et sans ce répit
      // le dernier soubresaut peut désigner la bande voisine.
      if (maintenant < gele) return;

      var r = pile.getBoundingClientRect();
      if (r.height < 1) return;
      var ligne = window.innerHeight * 0.42;
      var avance = (ligne - r.top) / r.height;
      var n = Math.floor(avance * items.length);
      if (n < 0) n = 0;
      if (n > items.length - 1) n = items.length - 1;
      if (n === courant) return;
      courant = n;
      gele = maintenant + 260;
      ouvrir(n);
    }
    window.addEventListener('scroll', function () {
      if (attente) return;
      attente = true;
      requestAnimationFrame(suivre);
    }, { passive: true });
    suivre();
    return pile;
  }

  function piles() {
    // Le parcours en quatre étapes : la frise restait quatre
    // colonnes de même largeur, donc un tableau déguisé.
    var frise = document.querySelector('.lx-frise');
    if (frise) {
      var p1 = enPile(frise, { auDefilement: true });
      // Les pastilles des modules suivaient la frise, elles suivent
      // maintenant la pile.
      var puces = document.querySelector('.lx-puces');
      if (p1 && puces) p1.parentNode.insertBefore(puces, p1.nextSibling);
    }
    // Les quatre engagements : grille deux par deux, numérotée.
    enPile(document.querySelector('.eng-grid'), { auDefilement: true });
  }


  /* ── 22. Les chiffres montent ──────────────────────────────
     Les pages ont déjà un compteur pour « 7 » et « 8 », mais il
     ne touche que les éléments porteurs d'un data-target. On
     l'étend aux valeurs écrites en dur, en respectant leur
     forme : « J+1 » garde son plus, « 48 h » son unité. Le
     texte d'origine est remis à la fin, jamais reconstruit.   */
  function chiffresMontants() {
    if (reduit) return;
    var cibles = tous('.vstat strong, .kpi').filter(function (el) {
      return !el.querySelector('.cu') && /\d/.test(el.textContent);
    });
    if (!cibles.length) return;

    auScroll(cibles, function (el) {
      var final = el.textContent;
      var m = final.match(/(\D*)(\d+)(.*)/);
      if (!m) return;
      var avant = m[1], valeur = parseInt(m[2], 10), apres = m[3];
      if (!valeur || valeur > 2000) return;
      var debut = null, duree = 900;
      function pas(t) {
        if (debut === null) debut = t;
        var p = Math.min((t - debut) / duree, 1);
        var adouci = 1 - Math.pow(1 - p, 3);
        el.textContent = avant + Math.round(adouci * valeur) + apres;
        if (p < 1) requestAnimationFrame(pas);
        else el.textContent = final;
      }
      requestAnimationFrame(pas);
    }, 0.55);
  }


  /* ── 23. Le hero : un contrat qu'on dépouille ──────────────
     Le contenu est un vrai extrait de contrat professionnel,
     sur un cabinet fictif. Les trois clauses surlignées sont
     celles qu'un courtier cherche en priorité : la franchise,
     une exclusion, le préavis. La synthèse dit ce qu'il en fait.

     Rien n'est inventé sur Learndigi : ce sont des clauses
     standard de multirisque professionnelle. Un prospect
     courtier les reconnaîtra, et c'est tout l'intérêt.        */
  var DOC = {
    titre: 'Multirisque professionnelle',
    ref: 'Réf. MRP-2024-118',
    blocs: [
      { art: 'Article 4 · Garanties accordées', barres: [86, 62] },
      { cle: 'Franchise de <b>1 500 €</b> par sinistre, portée à 3 000 € sur les dommages électriques.' },
      { art: 'Article 7 · Exclusions', barres: [78] },
      { cle: 'Sont exclus les dommages résultant d\'un <b>défaut d\'entretien</b> caractérisé.' },
      { art: 'Article 12 · Durée et reconduction', barres: [70, 54] },
      { cle: 'Résiliation à échéance sous réserve d\'un <b>préavis de deux mois</b>.' }
    ],
    synthese: [
      'La franchise a doublé depuis l\'avenant de mars, à signaler.',
      'L\'exclusion pour défaut d\'entretien mérite un point avec le client.',
      'Préavis de deux mois : la fenêtre se ferme le 31 octobre.'
    ]
  };

  function heroDocument() {
    var hero = document.querySelector('.hero');
    var inner = hero && hero.querySelector('.hero-inner');
    if (!hero || !inner || hero.dataset.lxHero) return;
    hero.dataset.lxHero = '1';
    hero.classList.add('lx-hero-clair');
    // Le hero n'a plus d'image agrandie à contenir : la découpe
    // posée pour la parallaxe n'a plus lieu d'être, et elle
    // rognerait l'ombre portée de la feuille.
    hero.classList.remove('lx-clip');

    var d = document.createElement('div');
    d.className = 'lx-doc';
    d.setAttribute('role', 'img');
    d.setAttribute('aria-label',
      'Illustration animée : un contrat multirisque professionnelle dont trois clauses sont ' +
      'repérées, franchise, exclusion et préavis, puis résumées en trois points à signaler au ' +
      'client. Contrat fictif.');

    var html = '<div class="lx-doc-papier">';
    html += '<div class="lx-doc-tete"><b>' + DOC.titre + '</b><span>' + DOC.ref + '</span></div>';
    DOC.blocs.forEach(function (b) {
      if (b.art) {
        html += '<div class="lx-doc-art">' + b.art + '</div>';
        (b.barres || []).forEach(function (w) {
          html += '<div class="lx-doc-ligne"><i style="width:' + w + '%"></i></div>';
        });
      } else {
        html += '<span class="lx-doc-cle"><span>' + b.cle + '</span></span>';
      }
    });
    html += '<div class="lx-doc-synth"><div><b>Trois points à signaler</b><ul>';
    DOC.synthese.forEach(function (l) { html += '<li>' + l + '</li>'; });
    html += '</ul></div></div>';
    html += '</div><p class="lx-doc-note">Illustration animée, contrat fictif.</p>';
    d.innerHTML = html;
    inner.appendChild(d);

    if (reduit) {
      d.classList.add('lx-doc-on', 'lx-doc-synth-on');
      tous('.lx-doc-cle', d).forEach(function (c) { c.classList.add('est-vu'); });
      return;
    }

    // Le hero est visible au chargement : la séquence part d'une
    // temporisation plutôt que d'un observateur, sinon elle
    // démarre avant que la page ait fini de se poser.
    setTimeout(function () {
      d.classList.add('lx-doc-on');
      var cles = tous('.lx-doc-cle', d);
      cles.forEach(function (c, i) {
        setTimeout(function () { c.classList.add('est-vu'); }, 700 + i * 620);
      });
      setTimeout(function () {
        d.classList.add('lx-doc-synth-on');
      }, 700 + cles.length * 620 + 260);
    }, 420);
  }

  /* ── Mise en route ────────────────────────────────────────── */
  function demarrer() {
    // Ces deux-là servent aussi sans animation : l'un remplace une
    // grille par une liste plus complète, l'autre rend la barre
    // lisible. Ils tournent donc dans tous les cas.
    heroDocument();
    bandeauOutils();
    toucher();
    boutonsRipple();
    survols();
    structure();
    filets();
    demoVivante();
    devisVivant();
    pastillesModules();
    piles();
    faq();
    chiffresMontants();
    masques();
    defilementSatine();

    if (reduit) {
      tous('.lx-w').forEach(function (m) { m.classList.add('lx-w-on'); });
      tous('.lx-photo').forEach(function (f) { f.classList.add('lx-photo-on'); });
      tous('.lx-liste').forEach(function (l) { l.classList.add('lx-liste-on'); });
      tous('.lx-etape').forEach(function (e) { e.classList.add('lx-etape-on'); });
      demoVivante();
      devisVivant();
      pastillesModules();
      piles();
      faq();
      masques();
      var fr = document.querySelector('.lx-frise');
      if (fr) fr.style.setProperty('--lx-frise-avance', '100%');
      return;
    }

    progression();
    navigation();
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
