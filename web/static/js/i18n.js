/**
 * i18n — English / French translations for the Cloud2BIM web UI.
 * Classic script (not a module) so it can load before app.js.
 * Exposes window.t, window.getLang, window.setLang, window.applyI18n.
 */
(function () {
  'use strict';

  const STRINGS = {
    en: {
      // ── Header / stepper ─────────────────────────────────────────────
      'tagline': 'Automatic Scan-to-BIM pipeline',
      'step.1': 'Select file',
      'step.2': 'Settings',
      'step.3': 'Run',
      'step.4': 'Results',
      'step.clean': 'Cleaning',

      // ── Step 1 ───────────────────────────────────────────────────────
      's1.title': 'Select point cloud file',
      's1.tab.upload': '⬆ Upload file',
      's1.tab.network': '🗂 Network drive',
      's1.tab.reuse': '♻ Previous jobs',
      's1.drop.title': 'Drag and drop your file here',
      's1.drop.hint': 'or click to browse — supports .xyz, .e57, .las, .laz',
      's1.drop.chunk': 'Large files are uploaded in 10 MB chunks',
      's1.network.info': 'ℹ️ Configured network drives are shown below. Select a file to continue.',
      's1.reuse.info': '♻ Select a previous job to re-run detection with new settings — the conversion step is skipped.',
      's1.next': 'Next: Settings →',
      's1.preview': '👁\u00a0 Preview 3D',
      's1.no.drives': 'No network drives configured in web_config.yaml',
      's1.loading': 'Loading…',
      's1.reuse.empty': 'No previous jobs with converted point clouds found.',
      's1.reuse.load.error': 'Could not load previous jobs.',
      's1.reuse.delete.title': 'Delete job and all files',
      's1.reuse.delete.confirm': 'Delete this job and all its files?',
      's1.reuse.delete.error': 'Could not delete job: ',
      's1.back': '← Back',
      's1.error.not.uploaded': 'The file has not been uploaded yet.',
      's1.error.no.network': 'Select a file from the network drive.',
      's1.error.no.job': 'Select a previous job.',
      's1.error.read.dir': 'Could not read directory',
      's1.upload.init.fail': 'Upload init failed: ',
      's1.upload.aborted': 'Upload aborted: ',
      's1.upload.no.id': 'No upload_id in response: ',
      's1.upload.done': 'Upload complete ✓',
      's1.upload.done.sub': ' — done',

      // ── Step 2 ───────────────────────────────────────────────────────
      's2.title': 'Basic settings',
      's2.format': 'File format',
      's2.format.hint': 'Format is automatically detected from the file extension (.xyz / .e57 / .las / .laz)',
      's2.exterior.scan': 'Exterior scan',
      's2.scan.type': 'Scan type',
      's2.scan.auto': 'Auto-detect',
      's2.scan.interior': 'Interior',
      's2.scan.exterior': 'Exterior',
      's2.pointcloud': 'Point cloud',
      's2.dilute': 'Downsample point cloud',
      's2.clean': 'Point cloud cleaning (decimate)',
      's2.clean.hint': '🧹 A “Point cloud cleaning” step will be added so you can configure decimation, noise removal and preview the result before / after.',
      's2.pc.resolution': 'Point cloud resolution (m)',
      's2.dilution.factor': 'Downsampling factor (every nth point)',
      's2.grid.coefficient': 'Grid coefficient',
      's2.material': 'Material',
      's2.material.concrete': 'Concrete',
      's2.material.brick': 'Brick',
      's2.material.wood': 'Wood',
      's2.material.steel': 'Steel',
      's2.material.unknown': 'Unknown',
      's2.advanced': 'Advanced parameters (walls & slabs)',
      's2.bfs': 'Floor slab thickness (m)',
      's2.tfs': 'Roof slab thickness (m)',
      's2.min.wall.length': 'Min wall length (m)',
      's2.min.wall.thickness': 'Min wall thickness (m)',
      's2.max.wall.thickness': 'Max wall thickness (m)',
      's2.ext.wall.thickness': 'Exterior wall thickness (m)',
      's2.ifc.metadata': 'IFC metadata (project &amp; building)',
      's2.project': 'Project',
      's2.project.name': 'Project name',
      's2.project.long.name': 'Long project name',
      's2.project.version': 'Version',
      's2.project.filename': 'IFC output filename',
      's2.project.filename.ph': 'auto (e.g. model.ifc)',
      's2.author': 'Author',
      's2.author.first': 'First name',
      's2.author.last': 'Last name',
      's2.author.org': 'Organization',
      's2.building': 'Building',
      's2.building.name': 'Building name',
      's2.building.type': 'Building type',
      's2.building.type.ph': 'e.g. Office, Hotel…',
      's2.building.phase': 'Phase',
      's2.building.phase.ph': 'e.g. Reconstruction',
      's2.elevation': 'Elevation above sea level (m)',
      's2.back': '← Back',
      's2.next': 'Next: Run pipeline →',

      // ── Cleaning step ────────────────────────────────────────────────
      'sc.title': 'Point cloud cleaning',
      'sc.info': 'ℹ️ Configure decimation and noise removal, then preview the cloud before and after cleaning. These settings are applied by the pipeline.',
      'sc.decimate': 'Decimation',
      'sc.voxel': 'Voxel size (m, 0 = off)',
      'sc.noise': 'Noise removal',
      'sc.sor': 'Statistical outlier removal',
      'sc.ror': 'Radius outlier removal',
      'sc.sor.k': 'Neighbours (k)',
      'sc.sor.std': 'Std-dev ratio',
      'sc.ror.radius': 'Radius (m)',
      'sc.ror.min': 'Min neighbours',
      'sc.preview': 'Before / after preview',
      'sc.preview.refresh': '↻ Refresh preview',
      'sc.preview.hint': 'Generates the cloud twice (raw and cleaned) — may take a few seconds.',
      'sc.preview.empty': 'Click “Refresh preview” to compare the cloud before and after cleaning.',
      'sc.preview.nosource': 'Select a source file first.',
      'sc.optimize': '🪄 Optimize',
      'sc.optimizing': 'Analysing point cloud…',
      'sc.optimize.info': 'Suggested: spacing ≈ {spacing} m · noise ≈ {noise} % · isolated ≈ {iso} %',
      'sc.optimize.error': 'Optimization failed: ',
      'sc.back': '← Back',
      'sc.next': 'Next: Run pipeline →',
      'clean.header': 'Point cloud cleaning — before / after',
      'clean.preview.loading': 'Applying cleaning on the server…',
      'clean.mode.before': 'Before',
      'clean.mode.after': 'After',
      'clean.mode.overlay': 'Overlay',
      'clean.before': 'Before',
      'clean.after': 'After',
      'clean.removed': 'Removed',

      // ── Step 3 ───────────────────────────────────────────────────────
      's3.title': 'Run pipeline',
      's3.badge.pending': 'Waiting',
      's3.badge.running': 'Running…',
      's3.badge.completed': 'Done',
      's3.badge.failed': 'Failed',
      's3.info': 'ℹ️ The process may take several minutes for large files. Do not close this window.',
      's3.log.placeholder': 'Logs will appear here when the process starts…',
      's3.back': '← Back',
      's3.run': '▶\u00a0 Start Cloud2BIM',
      's3.starting': 'Starting pipeline…',
      's3.saved': '✓ IFC model saved.',
      's3.failed': '[ERROR] Pipeline failed.',
      's3.lost': '[ERROR] Connection lost.',
      's3.job.error': '[ERROR] Failed to create job',

      // ── Progress bar ─────────────────────────────────────────────────
      'progress.stage.pending': 'Waiting',
      'progress.stage.import': 'Importing point cloud',
      'progress.stage.slabs': 'Slab detection',
      'progress.stage.walls': 'Wall segmentation',
      'progress.stage.zones': 'Zone detection',
      'progress.stage.ifc': 'Generating IFC model',
      'progress.stage.preview': 'Finalizing',
      'progress.stage.done': 'Done',
      'progress.stage.failed': 'Failed',

      // ── Step 4 ───────────────────────────────────────────────────────
      's4.title': 'Results',
      's4.ready': '✓ The IFC model has been generated and is ready to download.',
      's4.download': '⬇\u00a0 Download IFC file',
      's4.ifc.info': 'File: {name} · {size} · Format: IFC4',
      's4.viewer': '🏗\u00a0 Open 3D viewer',
      's4.pointcloud': '⚈\u00a0 View point cloud',
      's4.floorplan': 'Floor plan',
      's4.floorplan.by': 'Generated by the pipeline',
      's4.preview.loading': 'Loading preview…',
      's4.preview.unavailable': 'Preview not available.',
      's4.new.file': '+ New file',
      's4.stat.storeys': 'Storeys',
      's4.stat.walls': 'Walls',
      's4.stat.slabs': 'Slabs',
      's4.stat.windows': 'Windows',
      's4.stat.doors': 'Doors',

      // ── 3D viewer page ───────────────────────────────────────────────
      'viewer.extracting': '3D Viewer — extracting geometry…',
      'viewer.loading': 'Loading…',
      'viewer.geom.extract': 'Extracting IFC geometry on the server… (may take 10-30 s)',
      'viewer.geom.error': 'Could not load geometry: ',
      'viewer.building.scene': 'Building 3D scene…',
      'viewer.no.job': 'No job ID (?job=…)',
      'viewer.legend.wall': 'Wall',
      'viewer.legend.slab': 'Slab',
      'viewer.legend.window': 'Window',
      'viewer.legend.door': 'Door',
      'viewer.legend.other': 'Other',
      'viewer.stats': '{n} objects · {t} triangles',
      'viewer.header': '3D Viewer — {n} objects',
      'viewer.pc.loading': 'Building point cloud on the server… (may take a while for large scans)',
      'viewer.pc.stats': '{n} points',
      'viewer.pc.header': 'Point cloud viewer',
      'viewer.tab.model': 'IFC model',
      'viewer.tab.points': 'Point cloud',
      'viewer.tab.overlay': 'Overlay',
      'viewer.overlay.header': 'IFC + point cloud overlay — {n} objects',
      'viewer.download.ifc': '⬇\u00a0 Download IFC',

      // ── Locale helpers ───────────────────────────────────────────────
      'locale': 'en-GB',
    },

    fr: {
      // ── Header / stepper ─────────────────────────────────────────────
      'tagline': 'Pipeline Scan-to-BIM automatique',
      'step.1': 'Choisir un fichier',
      'step.2': 'Paramètres',
      'step.3': 'Exécuter',
      'step.4': 'Résultats',
      'step.clean': 'Nettoyage',

      // ── Step 1 ───────────────────────────────────────────────────────
      's1.title': 'Choisir un fichier de nuage de points',
      's1.tab.upload': '⬆ Téléverser un fichier',
      's1.tab.network': '🗂 Lecteur réseau',
      's1.tab.reuse': '♻ Travaux précédents',
      's1.drop.title': 'Glissez-déposez votre fichier ici',
      's1.drop.hint': 'ou cliquez pour parcourir — formats pris en charge : .xyz, .e57, .las, .laz',
      's1.drop.chunk': 'Les gros fichiers sont téléversés par paquets de 10 Mo',
      's1.network.info': 'ℹ️ Les lecteurs réseau configurés sont affichés ci-dessous. Sélectionnez un fichier pour continuer.',
      's1.reuse.info': '♻ Sélectionnez un travail précédent pour relancer la détection avec de nouveaux paramètres — l’étape de conversion est ignorée.',
      's1.next': 'Suivant : Paramètres →',
      's1.preview': '👁\u00a0 Aperçu 3D',
      's1.no.drives': 'Aucun lecteur réseau configuré dans web_config.yaml',
      's1.loading': 'Chargement…',
      's1.reuse.empty': 'Aucun travail précédent avec nuage de points converti trouvé.',
      's1.reuse.load.error': 'Impossible de charger les travaux précédents.',
      's1.reuse.delete.title': 'Supprimer le travail et tous les fichiers',
      's1.reuse.delete.confirm': 'Supprimer ce travail et tous ses fichiers ?',
      's1.reuse.delete.error': 'Impossible de supprimer le travail : ',
      's1.back': '← Retour',
      's1.error.not.uploaded': 'Le fichier n’a pas encore été téléversé.',
      's1.error.no.network': 'Sélectionnez un fichier sur le lecteur réseau.',
      's1.error.no.job': 'Sélectionnez un travail précédent.',
      's1.error.read.dir': 'Impossible de lire le dossier',
      's1.upload.init.fail': 'Échec de l’initialisation du téléversement : ',
      's1.upload.aborted': 'Téléversement interrompu : ',
      's1.upload.no.id': 'Aucun upload_id dans la réponse : ',
      's1.upload.done': 'Téléversement terminé ✓',
      's1.upload.done.sub': ' — terminé',

      // ── Step 2 ───────────────────────────────────────────────────────
      's2.title': 'Paramètres de base',
      's2.format': 'Format de fichier',
      's2.format.hint': 'Le format est détecté automatiquement à partir de l’extension (.xyz / .e57 / .las / .laz)',
      's2.exterior.scan': 'Scan extérieur',
      's2.scan.type': 'Type de scan',
      's2.scan.auto': 'Détection auto',
      's2.scan.interior': 'Intérieur',
      's2.scan.exterior': 'Extérieur',
      's2.pointcloud': 'Nuage de points',
      's2.dilute': 'Décimer le nuage de points',
      's2.clean': 'Nettoyage du nuage de points (décimer)',
      's2.clean.hint': '🧹 Une étape « Nettoyage du nuage de points » sera ajoutée pour régler la décimation, le débruitage et visualiser le résultat avant / après.',
      's2.pc.resolution': 'Résolution du nuage de points (m)',
      's2.dilution.factor': 'Facteur de décimation (1 point sur n)',
      's2.grid.coefficient': 'Coefficient de grille',
      's2.material': 'Matériau',
      's2.material.concrete': 'Béton',
      's2.material.brick': 'Brique',
      's2.material.wood': 'Bois',
      's2.material.steel': 'Acier',
      's2.material.unknown': 'Inconnu',
      's2.advanced': 'Paramètres avancés (murs et planchers)',
      's2.bfs': 'Épaisseur du plancher bas (m)',
      's2.tfs': 'Épaisseur du plancher haut (m)',
      's2.min.wall.length': 'Longueur min. du mur (m)',
      's2.min.wall.thickness': 'Épaisseur min. du mur (m)',
      's2.max.wall.thickness': 'Épaisseur max. du mur (m)',
      's2.ext.wall.thickness': 'Épaisseur des murs extérieurs (m)',
      's2.ifc.metadata': 'Métadonnées IFC (projet &amp; bâtiment)',
      's2.project': 'Projet',
      's2.project.name': 'Nom du projet',
      's2.project.long.name': 'Nom long du projet',
      's2.project.version': 'Version',
      's2.project.filename': 'Nom du fichier IFC généré',
      's2.project.filename.ph': 'auto (ex. modele.ifc)',
      's2.author': 'Auteur',
      's2.author.first': 'Prénom',
      's2.author.last': 'Nom',
      's2.author.org': 'Organisation',
      's2.building': 'Bâtiment',
      's2.building.name': 'Nom du bâtiment',
      's2.building.type': 'Type de bâtiment',
      's2.building.type.ph': 'ex. Bureau, Hôtel…',
      's2.building.phase': 'Phase',
      's2.building.phase.ph': 'ex. Reconstruction',
      's2.elevation': 'Altitude (m)',
      's2.back': '← Retour',
      's2.next': 'Suivant : Lancer le pipeline →',

      // ── Cleaning step ────────────────────────────────────────────────
      'sc.title': 'Nettoyage du nuage de points',
      'sc.info': 'ℹ️ Réglez la décimation et le débruitage, puis prévisualisez le nuage avant et après nettoyage. Ces paramètres sont appliqués par le pipeline.',
      'sc.decimate': 'Décimation',
      'sc.voxel': 'Taille de voxel (m, 0 = désactivé)',
      'sc.noise': 'Suppression du bruit',
      'sc.sor': 'Filtre statistique (SOR)',
      'sc.ror': 'Filtre par rayon (ROR)',
      'sc.sor.k': 'Voisins (k)',
      'sc.sor.std': 'Écart-type (ratio)',
      'sc.ror.radius': 'Rayon (m)',
      'sc.ror.min': 'Voisins minimum',
      'sc.preview': 'Aperçu avant / après',
      'sc.preview.refresh': '↻ Actualiser l’aperçu',
      'sc.preview.hint': 'Génère le nuage deux fois (brut et nettoyé) — peut prendre quelques secondes.',
      'sc.preview.empty': 'Cliquez sur « Actualiser l’aperçu » pour comparer le nuage avant et après nettoyage.',
      'sc.preview.nosource': 'Sélectionnez d’abord un fichier source.',
      'sc.optimize': '🪄 Optimiser',
      'sc.optimizing': 'Analyse du nuage de points…',
      'sc.optimize.info': 'Suggéré : espacement ≈ {spacing} m · bruit ≈ {noise} % · isolés ≈ {iso} %',
      'sc.optimize.error': 'Échec de l’optimisation : ',
      'sc.back': '← Retour',
      'sc.next': 'Suivant : Lancer le pipeline →',
      'clean.header': 'Nettoyage du nuage de points — avant / après',
      'clean.preview.loading': 'Application du nettoyage sur le serveur…',
      'clean.mode.before': 'Avant',
      'clean.mode.after': 'Après',
      'clean.mode.overlay': 'Superposition',
      'clean.before': 'Avant',
      'clean.after': 'Après',
      'clean.removed': 'Supprimés',

      // ── Step 3 ───────────────────────────────────────────────────────
      's3.title': 'Lancer le pipeline',
      's3.badge.pending': 'En attente',
      's3.badge.running': 'En cours…',
      's3.badge.completed': 'Terminé',
      's3.badge.failed': 'Échec',
      's3.info': 'ℹ️ Le processus peut prendre plusieurs minutes pour les gros fichiers. Ne fermez pas cette fenêtre.',
      's3.log.placeholder': 'Les journaux s’afficheront ici lorsque le processus démarrera…',
      's3.back': '← Retour',
      's3.run': '▶\u00a0 Démarrer Cloud2BIM',
      's3.starting': 'Démarrage du pipeline…',
      's3.saved': '✓ Modèle IFC enregistré.',
      's3.failed': '[ERREUR] Le pipeline a échoué.',
      's3.lost': '[ERREUR] Connexion perdue.',
      's3.job.error': '[ERREUR] Échec de la création du travail',

      // ── Progress bar ─────────────────────────────────────────────────
      'progress.stage.pending': 'En attente',
      'progress.stage.import': 'Importation du nuage de points',
      'progress.stage.slabs': 'Détection des planchers',
      'progress.stage.walls': 'Segmentation des murs',
      'progress.stage.zones': 'Détection des zones',
      'progress.stage.ifc': 'Génération du modèle IFC',
      'progress.stage.preview': 'Finalisation',
      'progress.stage.done': 'Terminé',
      'progress.stage.failed': 'Échec',

      // ── Step 4 ───────────────────────────────────────────────────────
      's4.title': 'Résultats',
      's4.ready': '✓ Le modèle IFC a été généré et est prêt à être téléchargé.',
      's4.download': '⬇\u00a0 Télécharger le fichier IFC',
      's4.ifc.info': 'Fichier : {name} · {size} · Format : IFC4',
      's4.viewer': '🏗\u00a0 Ouvrir la visionneuse 3D',
      's4.pointcloud': '⚈\u00a0 Voir le nuage de points',
      's4.floorplan': 'Plan d’étage',
      's4.floorplan.by': 'Généré par le pipeline',
      's4.preview.loading': 'Chargement de l’aperçu…',
      's4.preview.unavailable': 'Aperçu non disponible.',
      's4.new.file': '+ Nouveau fichier',
      's4.stat.storeys': 'Étages',
      's4.stat.walls': 'Murs',
      's4.stat.slabs': 'Planchers',
      's4.stat.windows': 'Fenêtres',
      's4.stat.doors': 'Portes',

      // ── 3D viewer page ───────────────────────────────────────────────
      'viewer.extracting': 'Visionneuse 3D — extraction de la géométrie…',
      'viewer.loading': 'Chargement…',
      'viewer.geom.extract': 'Extraction de la géométrie IFC sur le serveur… (peut prendre 10 à 30 s)',
      'viewer.geom.error': 'Impossible de charger la géométrie : ',
      'viewer.building.scene': 'Construction de la scène 3D…',
      'viewer.no.job': 'Identifiant de travail manquant (?job=…)',
      'viewer.legend.wall': 'Mur',
      'viewer.legend.slab': 'Plancher',
      'viewer.legend.window': 'Fenêtre',
      'viewer.legend.door': 'Porte',
      'viewer.legend.other': 'Autre',
      'viewer.stats': '{n} objets · {t} triangles',
      'viewer.header': 'Visionneuse 3D — {n} objets',
      'viewer.pc.loading': 'Construction du nuage de points sur le serveur… (peut être long pour de gros scans)',
      'viewer.pc.stats': '{n} points',
      'viewer.pc.header': 'Visionneuse de nuage de points',
      'viewer.tab.model': 'Modèle IFC',
      'viewer.tab.points': 'Nuage de points',
      'viewer.tab.overlay': 'Superposition',
      'viewer.overlay.header': 'Superposition IFC + nuage — {n} objets',
      'viewer.download.ifc': '⬇\u00a0 Télécharger IFC',

      // ── Locale helpers ───────────────────────────────────────────────
      'locale': 'fr-FR',
    },
  };

  const STORAGE_KEY = 'cloud2bim.lang';

  function detectLang() {
    const url = new URLSearchParams(location.search).get('lang');
    if (url && STRINGS[url]) return url;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved && STRINGS[saved]) return saved;
    } catch (e) { /* storage unavailable */ }
    return (navigator.language || 'en').toLowerCase().startsWith('fr') ? 'fr' : 'en';
  }

  let lang = detectLang();

  function getLang() { return lang; }

  function t(key, vars) {
    let s = (STRINGS[lang] && STRINGS[lang][key]);
    if (s === undefined) s = STRINGS.en[key];
    if (s === undefined) return key;
    if (vars) {
      Object.keys(vars).forEach(k => { s = s.split('{' + k + '}').join(vars[k]); });
    }
    return s;
  }

  /** Locale string for date formatting, e.g. 'fr-FR'. */
  function locale() { return t('locale'); }

  /** Apply translations to all [data-i18n] / [data-i18n-placeholder] elements. */
  function applyI18n() {
    document.documentElement.lang = lang;
    document.querySelectorAll('[data-i18n]').forEach(el => {
      el.innerHTML = t(el.getAttribute('data-i18n'));
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      el.setAttribute('placeholder', t(el.getAttribute('data-i18n-placeholder')));
    });
    document.querySelectorAll('[data-i18n-title]').forEach(el => {
      el.setAttribute('title', t(el.getAttribute('data-i18n-title')));
    });
    // Sync switcher buttons
    document.querySelectorAll('[data-lang]').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-lang') === lang);
    });
  }

  function setLang(newLang) {
    if (!STRINGS[newLang] || newLang === lang) return;
    lang = newLang;
    try { localStorage.setItem(STORAGE_KEY, newLang); } catch (e) { /* ignore */ }
    applyI18n();
    document.dispatchEvent(new CustomEvent('langchange', { detail: { lang } }));
  }

  // Expose globally (app.js is a classic script)
  window.t = t;
  window.getLang = getLang;
  window.setLang = setLang;
  window.applyI18n = applyI18n;
  window.locale = locale;

  // Auto-apply once the DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyI18n);
  } else {
    applyI18n();
  }
})();
