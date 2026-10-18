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


  /* ── 13. Défilement : celui du navigateur ───────────────────
     Lenis a été retiré le 14/09/2026. Il réécrivait la position à
     chaque image alors que la page déclarait scroll-behavior:
     smooth, et les deux lissages se battaient : mesurée, une
     rafale de défilement envoyait sa cible 4 459 px plus bas
     pendant que la page n'avançait que de 173. Un formateur l'a
     senti tout de suite : ça bloquait, puis ça filait tout en
     bas. Le défilement natif est fluide partout, on n'y touche
     plus.                                                      */

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


  /* ── 18. Ligne de pastilles ────────────────────────────────
     Les huit modules défilent sous le parcours. Même mécanique
     de répétition que les deux autres bandeaux, et même
     recalcul quand les polices sont prêtes.                   */
  var MODULES = [
    'Introduction', 'Socle IA et prompting', 'Claude et Microsoft 365',
    'Portefeuille avec Marvin', 'Sinistres et réclamations',
    'Devoir de conseil', 'RGPD, AI Act, RSE', 'Plan d\'action'
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

    // Même hauteur pour tous les textes. Une bande s'ouvre pendant
    // qu'une autre se referme ; si leurs textes n'ont pas la même
    // hauteur, la pile grandit ou rétrécit à chaque bascule et le
    // contenu situé dessous saute sous les yeux de qui lit. Chaque
    // paragraphe prend la hauteur du plus long, remesurée quand les
    // polices arrivent et quand la largeur change, puisque les
    // retours à la ligne changent avec elles. Inutile en mouvement
    // réduit : toutes les bandes y restent ouvertes.
    if (!reduit) {
      var textes = tous('.lx-pile-corps p', pile);
      var egaliser = function () {
        if (!textes.length) return;
        textes.forEach(function (p) { p.style.minHeight = ''; });
        var cs = getComputedStyle(textes[0]);
        var marge = cs.boxSizing === 'border-box' ? 0
          : parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom);
        var max = 0;
        textes.forEach(function (p) { max = Math.max(max, p.getBoundingClientRect().height); });
        if (max) textes.forEach(function (p) { p.style.minHeight = Math.ceil(max - marge) + 'px'; });
      };
      egaliser();
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(egaliser);
      var minuteurEgal;
      window.addEventListener('resize', function () {
        clearTimeout(minuteurEgal);
        minuteurEgal = setTimeout(egaliser, 150);
      }, { passive: true });
    }

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

  /* ── 23. Le hero : les outils qui dérivent ─────────────────
     Six pastilles portent les outils travaillés en formation.
     Elles dérivent lentement et s'écartent du curseur qui
     s'approche : le hero devient une surface qui répond, sans
     rien demander au visiteur.

     La répulsion plutôt que l'attraction. Une pastille qui
     suit le curseur finit collée aux autres et l'ensemble
     s'empile. En s'écartant, elles laissent au contraire le
     passage et se replacent seules, ce qui se lit comme de la
     matière plutôt que comme un effet.

     Les quatre modèles de langage sont au premier plan, les
     deux outils de cabinet derrière, plus petits et moins
     réactifs : le facteur de profondeur p sert à la fois à
     l'opacité, dans le CSS, et à la force de répulsion, ici.  */
  var LEGENDE = 'Les outils que nous prenons en main avec vous.';
  // Les usages repris de la page : rien n'est promis ici qui ne
  // soit déjà écrit dans la section « Outils abordés ».
  var JETONS = [
    // Sept pastilles sur trois rangs : trois modèles en haut, deux
    // au milieu, les deux outils partenaires en bas, plus petits.
    // La composition est presque symétrique et laisse le centre
    // libre : c'est de là que part la rosace de l'ouverture.
    { logo: 'logo-claude.png',      nom: 'Claude',  x: 13, y: 18, t: 17, z: 66, p: 1, amp: 6,   v1: .72, v2: .55,
      use: 'Synthétiser un contrat, préparer un rendez-vous.' },
    { logo: 'logo-chatgpt-app.png', nom: 'ChatGPT', x: 50, y: 12, t: 17, plein: true, p: 1, amp: 5.5, v1: .61, v2: .78,
      use: 'Rédiger, relancer, analyser un portefeuille.' },
    { logo: 'logo-gemini.svg',      nom: 'Gemini',  x: 87, y: 18, t: 17, z: 58, p: 1, amp: 5.5, v1: .69, v2: .81,
      use: 'L\'IA dans Gmail, Docs et Sheets.' },
    { logo: 'logo-mistral.png',     nom: 'Mistral', x: 33, y: 51, t: 17, z: 56, p: 1, amp: 6,   v1: .5,  v2: .67,
      use: 'Un modèle français, hébergé en Europe.' },
    { logo: 'logo-copilot.png',     nom: 'Copilot', x: 67, y: 51, t: 17, z: 64, p: 1, amp: 5.5, v1: .83, v2: .59,
      use: 'L\'IA dans les outils Microsoft du cabinet.' },
    { logo: 'logo-marvin.png',      nom: 'Marvin',  x: 17, y: 82, t: 12.5, z: 64, p: .62, amp: 5, v1: .66, v2: .86,
      use: 'Notre partenaire : anonymiser avant d\'analyser.' },
    { logo: 'logo-apollo-app.png',  nom: 'Apollo',  x: 83, y: 82, t: 12.5, plein: true, p: .74, amp: 5, v1: .77, v2: .5,
      use: 'Prospecter et enrichir vos fichiers.' }
  ];

  /* Le surtitre est écrit d'une traite dans la page, séparateurs
     compris. Découpé ici, chaque terme peut entrer à son tour et
     les points prennent l'accent doré : la ligne se lit comme
     trois métiers annoncés, plus comme une suite de mots. */
  function surtitre(hero) {
    var el = hero.querySelector('.hero-label');
    if (!el || el.dataset.lxDecoupe) return;
    var mots = el.textContent.split('·').map(function (m) { return m.trim(); }).filter(Boolean);
    if (mots.length < 2) return;
    el.dataset.lxDecoupe = '1';
    el.textContent = '';
    mots.forEach(function (m, i) {
      if (i) {
        var sep = document.createElement('i');
        sep.textContent = '·';
        sep.setAttribute('aria-hidden', 'true');
        el.appendChild(sep);
      }
      var s = document.createElement('span');
      s.textContent = m;
      s.style.setProperty('--i', i);
      el.appendChild(s);
    });
    if (!reduit) setTimeout(function () { el.classList.add('lx-label-on'); }, 180);
    else el.classList.add('lx-label-on');
  }

  function heroOutils() {
    var hero = document.querySelector('.hero');
    var inner = hero && hero.querySelector('.hero-inner');
    if (!hero || !inner || hero.dataset.lxHero) return;
    hero.dataset.lxHero = '1';
    hero.classList.add('lx-hero-clair');
    // Le hero n'a plus d'image agrandie à contenir : la découpe
    // posée pour la parallaxe rognerait les ombres des pastilles.
    hero.classList.remove('lx-clip');
    surtitre(hero);

    var zone = document.createElement('div');
    zone.className = 'lx-scene-zone';

    var scene = document.createElement('div');
    scene.className = 'lx-scene';
    // Le nom de chaque outil est écrit sous sa pastille : le
    // lecteur d'écran n'a donc pas à relire la liste. La scène
    // est annoncée une fois pour ce qu'elle est.
    scene.setAttribute('role', 'img');
    scene.setAttribute('aria-label',
      'Les outils pris en main pendant la formation : ' +
      JETONS.map(function (j) { return j.nom; }).join(', ') + '.');

    // La légende dit l'usage de l'outil survolé, et retrouve sa
    // phrase d'accueil quand on s'en éloigne. C'est ce qui fait la
    // différence entre une décoration et une information : on
    // apprend quelque chose en promenant la souris.
    var legende = document.createElement('p');
    legende.className = 'lx-scene-legende';
    legende.textContent = LEGENDE;

    function dire(txt) {
      if (legende.dataset.dit === txt) return;
      legende.dataset.dit = txt;
      clearTimeout(legende.minuteur);
      legende.classList.add('est-change');
      legende.minuteur = setTimeout(function () {
        legende.textContent = txt;
        legende.classList.remove('est-change');
      }, 170);
    }

    var etats = JETONS.map(function (j, i) {
      var el = document.createElement('div');
      el.className = 'lx-jeton';
      el.style.setProperty('--x', j.x + '%');
      el.style.setProperty('--y', j.y + '%');
      el.style.setProperty('--t', j.t + '%');
      // Correction optique. Les logos dessinés sur du blanc n'ont
      // pas tous la même masse : une étoile fine pèse moins qu'un
      // M plein. Chacun reçoit sa propre échelle dans sa pastille,
      // jusqu'à ce qu'ils aient tous la même présence.
      // Les icônes à fond de couleur, elles, ne sont pas réduites :
      // elles remplissent la pastille entière (voir .lx-jeton--plein).
      if (j.plein) el.classList.add('lx-jeton--plein');
      else el.style.setProperty('--z', j.z + '%');
      el.style.setProperty('--p', j.p);
      el.style.setProperty('--i', i);

      var c = document.createElement('div');
      c.className = 'lx-jeton-c';
      var img = document.createElement('img');
      img.src = j.logo;
      img.alt = '';
      img.decoding = 'async';
      img.draggable = false;
      // Dimensions déclarées pour la même raison qu'au bandeau :
      // sans elles la pastille n'a pas de place réservée et la
      // scène se réorganise à l'arrivée de chaque logo.
      img.width = 64;
      img.height = 64;
      c.appendChild(img);

      var n = document.createElement('span');
      n.className = 'lx-jeton-n';
      n.textContent = j.nom;

      el.appendChild(c);
      el.appendChild(n);
      scene.appendChild(el);

      c.addEventListener('pointerenter', function () {
        el.classList.add('est-actif');
        scene.classList.add('a-un-actif');
        dire(j.use);
      });
      c.addEventListener('pointerleave', function () {
        el.classList.remove('est-actif');
        scene.classList.remove('a-un-actif');
        dire(LEGENDE);
      });

      return { el: el, j: j, x: 0, y: 0, ph: i * 1.7, amp: j.amp, v1: j.v1, v2: j.v2 };
    });

    zone.appendChild(scene);
    zone.appendChild(legende);
    inner.appendChild(zone);

    if (reduit) {
      scene.classList.add('lx-scene-on', 'lx-scene-posee');
      return;
    }

    // L'entrée part d'une temporisation et non d'un observateur :
    // le hero est déjà visible au chargement, et il faut laisser
    // la page se poser avant de lancer la cascade.
    setTimeout(function () { scene.classList.add('lx-scene-on'); }, 240);

    // Le cadre est mesuré et gardé : la boucle a besoin de la
    // taille de la scène à chaque image, et la relire soixante
    // fois par seconde imposerait autant de recalculs de mise
    // en page pour une valeur qui ne change qu'au redimensionnement.
    var cadre = { l: 0, t: 0, w: 0, h: 0, e: 1 };
    function mesurer() {
      var r = scene.getBoundingClientRect();
      cadre.l = r.left; cadre.t = r.top; cadre.w = r.width; cadre.h = r.height;
      // Amplitudes et distances sont écrites en pixels pour une
      // scène de 440 : sur un écran étroit elles doivent suivre,
      // sinon la même dérive de dix pixels, qui se remarque à
      // peine en grand, fait passer une pastille sur le nom de
      // sa voisine.
      cadre.e = Math.max(.68, Math.min(1.15, r.width / 440));
    }

    var RAYON = 200, FORCE = 34;
    var souris = { x: 0, y: 0, actif: false };
    var rid = 0, marche = false, t0 = 0;

    /* ── L'ouverture ──────────────────────────────────────────
       Les six pastilles se rassemblent d'abord en rosace au
       centre, puis s'ouvrent vers leur place en tournant d'un
       cinquième de tour.

       Le mouvement est calculé en coordonnées polaires et non en
       x et y : on interpole le rayon et l'angle séparément, ce
       qui fait décrire à chaque pastille un arc plutôt qu'une
       ligne droite. C'est toute la différence entre des vignettes
       qui glissent et un jeu de cartes qu'on étale.            */
    var OUV = { attente: 420, duree: 950, pas: 45, rot: 1.6, r0: .13 };
    var depart = 0, posee = false;

    // Deux progressions, et c'est ce qui fait lire la scène en
    // deux temps. L'angle part tout de suite et vite : la rosace
    // tourne sur elle même pendant que le rayon, lui, attend. Le
    // rayon s'ouvre ensuite, lentement au départ comme à
    // l'arrivée, ce qui donne une ouverture qu'on suit de l'œil.
    function rotation(u) { return u * (2 - u); }
    function ouvre(u) {
      return u < .5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2;
    }
    function borne(u) { return u < 0 ? 0 : (u > 1 ? 1 : u); }

    function placer(e, i, ec) {
      var j = e.j;
      var ua = rotation(borne(ec / (OUV.attente + OUV.duree)));
      var ur = ouvre(borne((ec - OUV.attente) / OUV.duree));
      // Place définitive, comptée depuis le centre de la scène.
      var fx = cadre.w * (j.x - 50) / 100;
      var fy = cadre.h * (j.y - 50) / 100;
      var R = Math.sqrt(fx * fx + fy * fy);
      var A = Math.atan2(fy, fx);
      var r0 = cadre.w * OUV.r0;
      var r = r0 + (R - r0) * ur;
      var an = A - OUV.rot * (1 - ua);
      e.x = Math.cos(an) * r - fx;
      e.y = Math.sin(an) * r - fy;
      e.el.style.transform = 'translate3d(' + e.x.toFixed(2) + 'px,' + e.y.toFixed(2) + 'px,0)';
    }

    function image(ts) {
      if (!t0) t0 = ts;
      var t = (ts - t0) / 1000;

      if (!posee) {
        if (!depart) depart = ts;
        if (ts - depart > OUV.attente + OUV.duree + (etats.length - 1) * OUV.pas) {
          posee = true;
          scene.classList.add('lx-scene-posee');
        }
      }

      for (var i = 0; i < etats.length; i++) {
        var e = etats[i], j = e.j, k = cadre.e;

        if (!posee) {
          placer(e, i, ts - depart - i * OUV.pas);
          continue;
        }

        var dx = Math.sin(t * e.v1 + e.ph) * e.amp * k;
        var dy = Math.cos(t * e.v2 + e.ph * 1.37) * e.amp * .8 * k;

        if (souris.actif && cadre.w) {
          var ex = cadre.w * j.x / 100 - souris.x;
          var ey = cadre.h * j.y / 100 - souris.y;
          var d = Math.sqrt(ex * ex + ey * ey);
          if (d > 0.5 && d < RAYON * k) {
            // Le carré de la distance restante donne une poussée
            // qui s'éteint en douceur au bord du rayon, au lieu
            // de s'arrêter net et de faire sursauter la pastille.
            var f = 1 - d / (RAYON * k);
            f = f * f * FORCE * k * j.p;
            dx += ex / d * f;
            dy += ey / d * f;
          }
        }

        e.x += (dx - e.x) * .085;
        e.y += (dy - e.y) * .085;
        e.el.style.transform = 'translate3d(' + e.x.toFixed(2) + 'px,' + e.y.toFixed(2) + 'px,0)';
      }
      rid = requestAnimationFrame(image);
    }

    function lancer() {
      if (marche) return;
      marche = true; mesurer();
      // Si le hero est ressorti de l'écran avant la fin de
      // l'ouverture, elle repart de zéro au retour : mieux vaut la
      // rejouer entière que la retrouver déjà terminée.
      if (!posee) depart = 0;
      rid = requestAnimationFrame(image);
    }
    function arreter() {
      marche = false;
      if (rid) cancelAnimationFrame(rid);
      rid = 0;
    }

    // Première pose, tout de suite : sans elle les pastilles
    // occupent une image leur place définitive avant que la
    // boucle ne les rassemble au centre. Elles sont encore
    // transparentes à cet instant, mais sur une machine chargée
    // le saut finirait par se voir.
    mesurer();
    etats.forEach(function (e, i) { placer(e, i, 0); });

    // Rien ne tourne pendant qu'on lit le reste de la page.
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entrees) {
        if (entrees[0].isIntersecting) lancer(); else arreter();
      }, { threshold: 0 }).observe(hero);
    } else {
      lancer();
    }

    // La répulsion ne concerne qu'un vrai pointeur. Sur un écran
    // tactile il n'y a personne à fuir, et la dérive suffit.
    if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
      hero.addEventListener('pointermove', function (ev) {
        souris.x = ev.clientX - cadre.l;
        souris.y = ev.clientY - cadre.t;
        souris.actif = true;
      }, { passive: true });
      hero.addEventListener('pointerleave', function () { souris.actif = false; }, { passive: true });
    }
    window.addEventListener('resize', mesurer, { passive: true });
    window.addEventListener('scroll', function () { if (marche) mesurer(); }, { passive: true });
  }

  /* ── 17. Sommaire des articles ──────────────────────────────
     Le sommaire est écrit dans la page : ses liens marchent sans
     script, et un moteur le lit. Ici on indique seulement où en
     est la lecture. La section courante est la dernière dont le
     titre est passé sous le menu collant, et un repère doré glisse
     jusqu'à son lien. Tourne aussi quand les animations sont
     réduites : c'est de la navigation, pas un effet, et la
     feuille coupe alors la transition du repère.               */
  function sommaire() {
    var boite = document.querySelector('.art-sommaire');
    if (!boite) return;
    var liens = tous('a[href^="#"]', boite);
    var titres = liens.map(function (a) {
      return document.getElementById(decodeURIComponent(a.getAttribute('href').slice(1)));
    });
    if (!liens.length || titres.some(function (t) { return !t; })) return;

    var repere = document.createElement('span');
    repere.className = 'art-sommaire-repere';
    repere.setAttribute('aria-hidden', 'true');
    boite.appendChild(repere);

    var courant = null, attente = false;
    function placer(i) {
      if (i === courant) return;
      courant = i;
      liens.forEach(function (a, k) {
        if (k === i) a.setAttribute('aria-current', 'true');
        else a.removeAttribute('aria-current');
      });
      if (i < 0) { boite.classList.remove('est-actif'); return; }
      repere.style.setProperty('--y', liens[i].offsetTop + 'px');
      repere.style.height = liens[i].offsetHeight + 'px';
      boite.classList.add('est-actif');
    }
    function maj() {
      attente = false;
      // 150 px : le menu collant fait 92 px, plus l'air au-dessus du titre
      var i = -1;
      for (var k = 0; k < titres.length; k++) {
        if (titres[k].getBoundingClientRect().top <= 150) i = k; else break;
      }
      placer(i);
    }
    window.addEventListener('scroll', function () {
      if (attente) return;
      attente = true;
      requestAnimationFrame(maj);
    }, { passive: true });
    window.addEventListener('resize', function () { courant = null; maj(); }, { passive: true });
    maj();
  }

  /* ── 18. Vidéo de présentation ──────────────────────────────
     Rien n'est chargé avant le clic (preload="none"), soit 6 Mo
     de moins pour qui ne la regarde pas. Le bouton lance la
     lecture avec le son, ce que le navigateur n'autorise qu'après
     un geste du visiteur ; les commandes natives prennent alors
     le relais. Sans script, la vidéo garde ses commandes et reste
     lisible. Elle se met en pause quand on la quitte.          */
  function videoPresentation() {
    var f = document.querySelector('.lx-video');
    if (!f) return;
    var v = f.querySelector('video'), b = f.querySelector('.lx-video-lecture');
    if (!v || !b) return;
    v.controls = false;
    b.addEventListener('click', function () {
      f.classList.add('est-lue');
      v.controls = true;
      v.muted = false;
      var p = v.play();
      if (p && p.catch) p.catch(function () { v.controls = true; });
    });
    v.addEventListener('ended', function () { f.classList.remove('est-lue'); v.controls = false; });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) {
        es.forEach(function (e) { if (!e.isIntersecting && !v.paused) v.pause(); });
      }, { threshold: 0.15 }).observe(v);
    }
  }

  /* ── 19. Le programme : la scène interactive ────────────────
     18/10/2026, deuxième version, à la demande de Hugo qui
     voulait une section vivante dans l'esprit du hero, sans
     cartes ni photo.

     Au centre, l'anneau des 7 heures, dont l'arc doré couvre 7
     des 15 heures annuelles de la DDA. Autour, les huit modules
     tournent lentement et s'écartent du curseur, comme les logos
     du hero. À gauche, trois profils de cabinet : en choisir un
     rapproche du centre les modules sur lesquels on insiste pour
     lui et efface les autres. Sans clic, la scène passe d'un
     profil à l'autre ; le premier clic arrête ce défilement.

     À l'arrivée sur la section : l'anneau se trace, le 7 se
     compte, les modules sortent du centre un à un. Sous 900 px,
     les modules se rangent en liste sous l'anneau. En mouvement
     réduit, rien ne tourne, mais le choix du profil fonctionne :
     c'est de l'interaction, pas un effet.                    */
  function configurateur() {
    var cfg = document.querySelector('.lx-config');
    if (!cfg || cfg.dataset.lxPret) return;
    cfg.dataset.lxPret = '1';
    var onglets = tous('.lx-config-onglet', cfg);
    var panneaux = tous('.lx-config-panneau', cfg);
    var scene = cfg.querySelector('.lx-config-scene');
    var items = tous('.lx-config-modules li', cfg);
    var compteur = cfg.querySelector('.lx-config-h');
    if (!onglets.length || !scene || !items.length) return;

    var DUREE = 5600, actif = 1, auto = !reduit, visible = false, minuteur = null;

    function choisir(i, parVisiteur) {
      actif = i;
      cfg.dataset.actif = i;
      onglets.forEach(function (o, k) {
        o.setAttribute('aria-selected', k === i ? 'true' : 'false');
        o.tabIndex = k === i ? 0 : -1;
        o.classList.remove('est-cycle');
      });
      panneaux.forEach(function (p, k) { p.hidden = k !== i; });
      var prio = onglets[i].dataset.prio.split(',').map(Number);
      items.forEach(function (li) { li.classList.toggle('est-prio', prio.indexOf(+li.dataset.m) >= 0); });
      if (parVisiteur) { auto = false; cfg.classList.add('est-manuel'); clearTimeout(minuteur); return; }
      relancer();
    }
    function relancer() {
      clearTimeout(minuteur);
      if (!auto || !visible) return;
      void onglets[actif].offsetWidth;
      onglets[actif].classList.add('est-cycle');
      minuteur = setTimeout(function () { choisir((actif + 1) % onglets.length, false); }, DUREE);
    }
    onglets.forEach(function (o, k) {
      o.addEventListener('click', function () { choisir(k, true); });
      o.addEventListener('keydown', function (ev) {
        var d = ev.key === 'ArrowDown' || ev.key === 'ArrowRight' ? 1 : ev.key === 'ArrowUp' || ev.key === 'ArrowLeft' ? -1 : 0;
        if (!d) return;
        ev.preventDefault();
        var n = (actif + d + onglets.length) % onglets.length;
        choisir(n, true); onglets[n].focus();
      });
    });
    choisir(1, false);

    // ── l'orbite
    var W, H, cx, cy, rx, ry, rAnneau = 0, liste = false, ouvert = null, enMarche = false;
    // un fil par module, de l'anneau à la pastille ; seuls ceux des modules mis en avant s'allument
    var liens = cfg.querySelector('.lx-config-liens'), NS = 'http://www.w3.org/2000/svg';
    var fils = items.map(function () {
      if (!liens) return null;
      var l = document.createElementNS(NS, 'line');
      l.setAttribute('class', 'lx-config-fil');
      liens.appendChild(l);
      return l;
    });
    var souris = { x: -1e4, y: -1e4 };
    var etats = items.map(function (li, k) {
      return { li: li, a0: -Math.PI / 2 + k * (2 * Math.PI / items.length), x: 0, y: 0, s: 1, o: 1, w: 0, h: 0 };
    });
    function mesurer() {
      liste = window.matchMedia('(max-width: 900px)').matches;
      scene.classList.toggle('est-liste', liste);
      var r = scene.getBoundingClientRect();
      W = r.width; H = r.height; cx = W / 2; cy = H / 2; rx = W * 0.39; ry = H * 0.4;
      var ce = cfg.querySelector('.lx-config-centre');
      rAnneau = ce ? ce.getBoundingClientRect().width / 2 * 0.96 : 0;
      if (liens) {
        liens.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
        var tr = liens.querySelector('.lx-config-trace');
        tr.setAttribute('cx', cx); tr.setAttribute('cy', cy); tr.setAttribute('rx', rx); tr.setAttribute('ry', ry);
      }
      etats.forEach(function (e) { e.w = e.li.offsetWidth; e.h = e.li.offsetHeight; });
    }
    function cible(e, k, t) {
      var prio = e.li.classList.contains('est-prio');
      var a = e.a0 + (reduit ? 0 : t * 0.00004);
      var f = prio ? 0.82 : 1.02;
      var ouv = 1;
      if (ouvert !== null) { ouv = Math.max(0, Math.min(1, (t - ouvert - k * 80) / 950)); ouv = 1 - Math.pow(1 - ouv, 3); }
      var flotte = reduit ? 0 : Math.sin(t * 0.0012 + k * 1.9) * 7;
      var x = cx + Math.cos(a) * rx * f * ouv, y = cy + Math.sin(a) * ry * f * ouv + flotte * ouv;
      // jamais sur l'anneau : le bord le plus proche de la pastille reste hors du cercle
      if (ouv > 0.6 && e.w) {
        var nx = Math.max(x - e.w / 2, Math.min(cx, x + e.w / 2)), ny = Math.max(y - e.h / 2, Math.min(cy, y + e.h / 2));
        var dc = Math.sqrt((nx - cx) * (nx - cx) + (ny - cy) * (ny - cy)), mini = rAnneau + 18;
        if (dc < mini) {
          var ux = x - cx, uy = y - cy, lu = Math.sqrt(ux * ux + uy * uy) || 1;
          x += ux / lu * (mini - dc); y += uy / lu * (mini - dc);
        }
      }
      var dx = x - souris.x, dy = y - souris.y, dist = Math.sqrt(dx * dx + dy * dy);
      if (!reduit && dist < 130 && dist > 0.1) { var force = (130 - dist) / 130 * 46; x += dx / dist * force; y += dy / dist * force; }
      return { x: x, y: y, s: (prio ? 1.06 : 0.92) * (0.35 + 0.65 * ouv), o: (prio ? 1 : 0.4) * ouv };
    }
    function poser(lisser, t) {
      etats.forEach(function (e, k) {
        var c = cible(e, k, t);
        var q = lisser ? 0.14 : 1;
        e.x += (c.x - e.x) * q; e.y += (c.y - e.y) * q; e.s += (c.s - e.s) * q; e.o += (c.o - e.o) * q;
        e.li.style.transform = 'translate(' + (e.x - e.w / 2).toFixed(1) + 'px,' + (e.y - e.h / 2).toFixed(1) + 'px) scale(' + e.s.toFixed(3) + ')';
        e.li.style.opacity = e.o.toFixed(3);
        var f = fils[k];
        if (f) {
          var ux = e.x - cx, uy = e.y - cy, lu = Math.sqrt(ux * ux + uy * uy) || 1;
          // départ au bord de l'anneau, arrivée au bord de la pastille
          var demi = Math.min(e.w / 2 / Math.abs(ux / lu || 1e-6), e.h / 2 / Math.abs(uy / lu || 1e-6)) * e.s;
          f.setAttribute('x1', (cx + ux / lu * (rAnneau + 6)).toFixed(1));
          f.setAttribute('y1', (cy + uy / lu * (rAnneau + 6)).toFixed(1));
          f.setAttribute('x2', (e.x - ux / lu * Math.min(demi + 4, lu)).toFixed(1));
          f.setAttribute('y2', (e.y - uy / lu * Math.min(demi + 4, lu)).toFixed(1));
          f.classList.toggle('est-allume', e.li.classList.contains('est-prio') && e.o > 0.5);
        }
      });
    }
    function boucle(t) {
      if (!visible || liste) { enMarche = false; return; }
      poser(true, t);
      requestAnimationFrame(boucle);
    }
    function demarrer() { if (!enMarche && !liste) { enMarche = true; requestAnimationFrame(boucle); } }

    mesurer();
    if (!liste) poser(false, 0);   // placées tout de suite, même si le navigateur ne rend pas d'image
    window.addEventListener('resize', function () { mesurer(); if (liste) items.forEach(function (li) { li.style.transform = ''; li.style.opacity = ''; }); else { poser(false, performance.now()); demarrer(); } }, { passive: true });
    scene.addEventListener('pointermove', function (ev) { var r = scene.getBoundingClientRect(); souris.x = ev.clientX - r.left; souris.y = ev.clientY - r.top; }, { passive: true });
    scene.addEventListener('pointerleave', function () { souris.x = souris.y = -1e4; }, { passive: true });

    function ouvrir() {
      if (cfg.classList.contains('est-ouvert')) return;
      cfg.classList.add('est-ouvert');
      if (!reduit) {
        ouvert = performance.now();
        etats.forEach(function (e) { e.x = cx; e.y = cy; e.s = 0.3; e.o = 0; });
        if (compteur) {
          var fin = +compteur.textContent, debut = null;
          compteur.textContent = '0';
          var pas = function (t) {
            if (debut === null) debut = t;
            var q = Math.min((t - debut) / 900, 1);
            compteur.textContent = Math.round((1 - Math.pow(1 - q, 3)) * fin);
            if (q < 1) requestAnimationFrame(pas);
          };
          setTimeout(function () { requestAnimationFrame(pas); }, 350);
          setTimeout(function () { compteur.textContent = fin; }, 1500);
        }
      }
    }
    if (!reduit) cfg.classList.add('est-anime');
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) {
        es.forEach(function (e) {
          visible = e.isIntersecting;
          if (visible) { ouvrir(); demarrer(); relancer(); }
          else clearTimeout(minuteur);
        });
      }, { threshold: 0.25 }).observe(cfg);
    } else { visible = true; ouvrir(); }
  }

  /* ── 20. Le tarif : apparition unique des étapes de la session.
     Le texte reste accessible sans script et sans interaction. */
  function tarifParcours() {
    var r = document.querySelector('.lx-ta');
    if (!r || r.dataset.lxPret) return;
    r.dataset.lxPret = '1';
    if (reduit || !('IntersectionObserver' in window)) return;

    var elements = tous('.lx-ta-intro, .lx-ta-un, .lx-ta-pan', r);
    var large = window.matchMedia('(min-width: 761px)').matches;
    elements.forEach(function (el, i) {
      var delai = large ? (i < 2 ? i * 100 : (i - 2) * 100) : 0;
      el.style.setProperty('--ta-delay', delai + 'ms');
      el.classList.add('lx-ta-reveal');
    });
    auScroll(elements, function (el) { el.classList.add('est-vu'); }, 0.12);

    // Un lien clavier ne doit jamais recevoir le focus dans un bloc masqué.
    r.addEventListener('focusin', function () {
      elements.forEach(function (el) { el.classList.add('est-vu'); });
    });
  }

  /* ── 21. Bibliothèque de skills ─────────────────────────────
     La chaîne du devoir de conseil : un dossier passe d'étape en
     étape, le fil doré avance derrière lui, et le détail de
     l'étape s'affiche dessous. Sans clic, il parcourt les cinq
     étapes ; le premier clic arrête ce parcours. Le filtre range
     les fiches du quotidien par module.                       */
  function bibliothequeSkills() {
    var r = document.querySelector('.sk');
    if (!r || r.dataset.lxPret) return;
    r.dataset.lxPret = '1';
    var etapes = tous('.sk-etapes li', r), details = tous('.sk-etape-detail', r);
    var ol = r.querySelector('.sk-etapes'), dossier = r.querySelector('.sk-dossier'), chaine = r.querySelector('.sk-chaine');
    var actif = 0, auto = !reduit, visible = false, minuteur = null;
    function placer() {
      if (!dossier || !etapes.length) return;
      var c = chaine.getBoundingClientRect(), b = etapes[actif].querySelector('.sk-pt').getBoundingClientRect();
      dossier.style.setProperty('--sk-x', (b.left - c.left + b.width / 2 - 10) + 'px');
      dossier.style.top = (b.top - c.top + b.height / 2 - 34) + 'px';
      ol.style.setProperty('--sk-p', etapes.length > 1 ? actif / (etapes.length - 1) : 0);
    }
    function choisir(i, parVisiteur) {
      actif = i;
      etapes.forEach(function (li, k) {
        li.querySelector('button').setAttribute('aria-pressed', k === i ? 'true' : 'false');
        li.classList.toggle('est-fait', k < i);
      });
      details.forEach(function (d, k) { d.hidden = k !== i; });
      placer();
      clearTimeout(minuteur);
      if (parVisiteur) { auto = false; return; }
      if (auto && visible) minuteur = setTimeout(function () { choisir((actif + 1) % etapes.length, false); }, 4200);
    }
    etapes.forEach(function (li, k) { li.querySelector('button').addEventListener('click', function () { choisir(k, true); }); });
    window.addEventListener('resize', placer, { passive: true });
    choisir(0, true); auto = !reduit;

    tous('.sk-filtres button', r).forEach(function (b, _, liste) {
      b.addEventListener('click', function () {
        liste.forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
        tous('.sk-fiche[data-famille]', r).forEach(function (f) {
          f.classList.toggle('est-cache', b.dataset.f !== 'tous' && f.dataset.famille !== b.dataset.f);
        });
      });
    });

    if (reduit || !('IntersectionObserver' in window)) { r.classList.add('est-vu'); return; }
    r.classList.add('est-anime');
    requestAnimationFrame(function () { r.classList.add('est-vu'); });
    setTimeout(function () { r.classList.add('est-vu'); }, 60);
    new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        visible = e.isIntersecting;
        clearTimeout(minuteur);
        if (visible && auto) minuteur = setTimeout(function () { choisir((actif + 1) % etapes.length, false); }, 2600);
      });
    }, { threshold: 0.35 }).observe(chaine);
  }

  /* ── Mise en route ────────────────────────────────────────── */
  function demarrer() {
    // Ces deux-là servent aussi sans animation : l'un remplace une
    // grille par une liste plus complète, l'autre rend la barre
    // lisible. Ils tournent donc dans tous les cas.
    heroOutils();
    bandeauOutils();
    toucher();
    boutonsRipple();
    survols();
    structure();
    filets();
    demoVivante();
    pastillesModules();
    piles();
    faq();
    chiffresMontants();
    masques();
    sommaire();
    videoPresentation();
    configurateur();
    tarifParcours();
    bibliothequeSkills();

    if (reduit) {
      tous('.lx-w').forEach(function (m) { m.classList.add('lx-w-on'); });
      tous('.lx-photo').forEach(function (f) { f.classList.add('lx-photo-on'); });
      tous('.lx-liste').forEach(function (l) { l.classList.add('lx-liste-on'); });
      tous('.lx-etape').forEach(function (e) { e.classList.add('lx-etape-on'); });
      demoVivante();
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
      '.prog-banner-c h1',        // programme
      '.art-liste h1',            // articles, le sommaire
      '.art-hero h1'              // articles et auteurs
    ]);
    rails([
      '.vstat', '.eng-card', '.rdv-step', '.howto-step',
      '.prog-mod',
      '.experts-grid > *', '.deliverables-grid > *'
    ].join(','));
    // Les pages d'offre ont déjà leur propre système d'apparition
    // (offres.js et ses « reveal-target »). On n'y ajoute aucune
    // entrée décalée : deux mécanismes qui masquent le même bloc
    // finissent tôt ou tard par en laisser un invisible.
    grillesDecalees(['.deliverable-list', '.hero-list', '.tarif-crit', '.prog-points',
                     '.art-famille-liste', '.art-ensuite-grille']);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', demarrer);
  } else {
    demarrer();
  }
})();
