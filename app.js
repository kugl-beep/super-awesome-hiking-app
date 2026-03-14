
const MAP_STYLE = {
  version: 8,
  sources: {
    osm: {
      type: 'raster',
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      attribution: '© OpenStreetMap-Mitwirkende'
    }
  },
  layers: [
    { id: 'osm', type: 'raster', source: 'osm' }
  ]
};

const ROUTE_TYPE_LABELS = {
  hiking_trail: 'Wanderweg',
  alpine_mountain_trail: 'Alpiner Bergweg',
  coastal_trail: 'Küstenwanderweg',
  long_distance_trail: 'Fernwanderweg',
  pilgrimage_or_cultural_trail: 'Pilger- oder Kulturweg'
};

const NETWORK_LABELS = {
  'e-paths': 'Europäisches Fernwanderwegenetz',
  gr: 'GR-Netz',
  camino: 'Camino-Netz',
  leden: 'Leden-Netz'
};

const CATEGORY_LABELS = {
  allowed: 'erlaubt',
  restricted: 'nur eingeschränkt erlaubt',
  forbidden: 'verboten',
  unknown: 'unklar'
};

const map = new maplibregl.Map({
  container: 'map',
  style: MAP_STYLE,
  center: [10.5, 50.3],
  zoom: 4
});

map.addControl(new maplibregl.NavigationControl(), 'top-right');

const statusBanner = document.getElementById('statusBanner');
const routeListEl = document.getElementById('routeList');
const routeCountEl = document.getElementById('routeCount');
const routeSearchEl = document.getElementById('routeSearch');

const docOverlay = document.getElementById('docOverlay');
const docOverlayTitle = document.getElementById('docOverlayTitle');
const docOverlayContent = document.getElementById('docOverlayContent');
const openSourcesBtn = document.getElementById('openSources');
const openWorkflowBtn = document.getElementById('openWorkflow');
const closeDocOverlay = document.getElementById('closeDocOverlay');
const closeDocOverlayBtn = document.getElementById('docOverlayCloseBtn');

let routesGeojson = null;
let sheltersGeojson = null;
let selectedRouteSlug = null;
let wildcampingAvailable = false;
let wildcampingAdmin1Available = false;
let activePopup = null;
let statusTimer = null;

function setStatus(text){
  statusBanner.textContent = text;
  statusBanner.style.opacity = '1';
  statusBanner.style.pointerEvents = 'auto';
  if (statusTimer) clearTimeout(statusTimer);
  statusTimer = setTimeout(() => {
    statusBanner.style.opacity = '0';
    statusBanner.style.pointerEvents = 'none';
  }, 3500);
}

function ensureSinglePopup(popup){
  if (activePopup) activePopup.remove();
  activePopup = popup;
  popup.on('close', () => {
    if (activePopup === popup) activePopup = null;
  });
  return popup;
}

function showPopup(lngLat, html){
  const popup = new maplibregl.Popup({ closeOnClick: true, maxWidth: '320px' })
    .setLngLat(lngLat)
    .setHTML(html)
    .addTo(map);
  ensureSinglePopup(popup);
}

function escapeHtml(value=''){
  return String(value)
    .replaceAll('&','&amp;')
    .replaceAll('<','&lt;')
    .replaceAll('>','&gt;')
    .replaceAll('"','&quot;')
    .replaceAll("'",'&#39;');
}

function routeTypeLabel(value){
  return ROUTE_TYPE_LABELS[value] || value || 'Unbekannt';
}

function networkLabel(value){
  return NETWORK_LABELS[value] || 'Keinem übergeordneten Wegenetz zugeordnet';
}

function categoryLabel(value){
  return CATEGORY_LABELS[value] || value || 'unbekannt';
}

function isValidWebUrl(value){
  if(!value) return false;
  try{
    const url = new URL(String(value));
    return url.protocol === 'http:' || url.protocol === 'https:';
  }catch{
    return false;
  }
}

function linkLabel(url){
  try{
    const host = new URL(url).hostname.replace(/^www\./, '');
    const parts = host.split('.');
    if(parts.length >= 2){
      return parts[parts.length - 2];
    }
    return host || 'Website';
  }catch{
    return 'Website';
  }
}

function linksForCountry(properties){
  const links = [];
  const seen = new Set();

  function addLink(value){
    if(!isValidWebUrl(value)) return;
    const normalized = String(value).trim();
    if(seen.has(normalized)) return;
    seen.add(normalized);
    links.push(`<a href="${escapeHtml(normalized)}" target="_blank" rel="noopener">${escapeHtml(linkLabel(normalized))}</a>`);
  }

  addLink(properties.helper_source);
  addLink(properties.source);
  addLink(properties.source_primary);
  addLink(properties.source_secondary);

  return links.length ? `<br>Weiterführende Links: ${links.join(' · ')}` : '';
}

async function loadJson(path){
  const res = await fetch(path);
  if(!res.ok) throw new Error(`Konnte ${path} nicht laden`);
  return res.json();
}

async function loadHtmlBody(path){
  const res = await fetch(path);
  if(!res.ok) throw new Error(`Konnte ${path} nicht laden`);
  const text = await res.text();
  const parser = new DOMParser();
  const doc = parser.parseFromString(text, 'text/html');
  const main = doc.querySelector('main');
  return main ? main.innerHTML : text;
}

function openDocOverlay(title, innerHtml){
  docOverlayTitle.textContent = title;
  docOverlayContent.innerHTML = innerHtml;
  docOverlay.classList.remove('hidden');
  docOverlay.setAttribute('aria-hidden', 'false');
}

function closeOverlay(){
  docOverlay.classList.add('hidden');
  docOverlay.setAttribute('aria-hidden', 'true');
}

function buildRouteList(features){
  routeListEl.innerHTML = '';
  routeCountEl.textContent = features.length;
  for(const ft of features){
    const p = ft.properties || {};
    const item = document.createElement('button');
    item.className = 'route-item';
    item.type = 'button';
    item.dataset.slug = p.slug || '';
    item.innerHTML = `
      <div class="name">${escapeHtml(p.name || 'Unbenannte Route')}</div>
      <div class="meta">${escapeHtml(routeTypeLabel(p.route_type))} · ${escapeHtml(networkLabel(p.network))}</div>
    `;
    item.addEventListener('click', () => selectRoute(p.slug));
    routeListEl.appendChild(item);
  }
}

function getBoundsForFeature(feature){
  const bounds = new maplibregl.LngLatBounds();
  const coords = feature.geometry.coordinates || [];
  coords.forEach(line => line.forEach(pt => bounds.extend(pt)));
  return bounds;
}

function selectRoute(slug){
  selectedRouteSlug = slug;
  const listItems = [...document.querySelectorAll('.route-item')];
  listItems.forEach(el => el.classList.toggle('active', el.dataset.slug === slug));

  map.setFilter('routes-line', ['==', ['get', 'slug'], slug]);
  map.setFilter('routes-hit', ['==', ['get', 'slug'], slug]);

  const match = routesGeojson.features.find(ft => (ft.properties?.slug) === slug);
  if(match){
    map.fitBounds(getBoundsForFeature(match), {padding: 40, duration: 600});
    setStatus(`Ausgewählt: ${match.properties.name}`);
  }
}

function resetRouteFilter(){
  selectedRouteSlug = null;
  document.querySelectorAll('.route-item').forEach(el => el.classList.remove('active'));
  map.setFilter('routes-line', null);
  map.setFilter('routes-hit', null);

  const parts = ['Routen und Hütten geladen'];
  if (wildcampingAvailable) parts.push('Länder-Wildcamping geladen');
  if (wildcampingAdmin1Available) parts.push('Admin-1-Wildcamping geladen');
  setStatus(parts.join(' · '));
}

function applySearchFilter(){
  const term = routeSearchEl.value.trim().toLowerCase();
  const items = [...document.querySelectorAll('.route-item')];
  let visible = 0;
  items.forEach(el => {
    const show = el.textContent.toLowerCase().includes(term);
    el.style.display = show ? '' : 'none';
    if(show) visible += 1;
  });
  routeCountEl.textContent = visible;
}

function sanitizeShelterDesc(raw){
  if(!raw) return 'Keine Beschreibung verfügbar';
  let s = String(raw).trim();
  s = s.replace(/<p>\s*<strong>.*?<\/p>/gi, ' ');
  s = s.replace(/<\/?p>/gi, ' ');
  s = s.replace(/<\/?strong>/gi, ' ');
  s = s.replace(/<br\s*\/?>/gi, ' ');
  s = s.replace(/<[^>]+>/g, ' ');
  s = s.replace(/\s+/g, ' ').trim();
  return s || 'Keine Beschreibung verfügbar';
}

function popupForRoute(feature){
  const p = feature.properties || {};
  return `
    <div class="popup-title">${escapeHtml(p.name || 'Route')}</div>
    <div class="popup-meta">
      Typ: ${escapeHtml(routeTypeLabel(p.route_type))}<br>
      Wegenetz: ${escapeHtml(networkLabel(p.network))}<br>
      Segmente: ${escapeHtml(p.segment_count_total || '-')}<br>
      Quelle: ${p.source ? `<a href="${escapeHtml(p.source)}" target="_blank" rel="noopener">${escapeHtml(linkLabel(p.source))}</a>` : '-'}
    </div>
  `;
}

function popupForShelter(feature){
  const p = feature.properties || {};
  const desc = sanitizeShelterDesc(p.desc);
  const link = isValidWebUrl(p.link1_href) ? `<br><a href="${escapeHtml(p.link1_href)}" target="_blank" rel="noopener">${escapeHtml(p.link1_text || linkLabel(p.link1_href))}</a>` : '';
  return `
    <div class="popup-title">${escapeHtml(p.name || 'Schutzhütte')}</div>
    <div class="popup-meta">
      ${escapeHtml(desc)}
      ${link}
    </div>
  `;
}

function popupForCountry(feature){
  const p = feature.properties || {};
  return `
    <div class="popup-title">${escapeHtml(p.country || p.name || 'Land')}</div>
    <div class="popup-meta">
      Wildcamping: ${escapeHtml(p.wildcamping_status || 'Unbekannt')}<br>
      Kategorie: ${escapeHtml(categoryLabel(p.wildcamping_category))}
      ${linksForCountry(p)}
    </div>
  `;
}

function popupForAdmin1(feature){
  const p = feature.properties || {};
  return `
    <div class="popup-title">${escapeHtml(p.admin1_name || 'Verwaltungseinheit')}</div>
    <div class="popup-meta">
      Land: ${escapeHtml(p.country || '-') }<br>
      Typ: ${escapeHtml(p.admin1_type || '-') }<br>
      Wildcamping: ${escapeHtml(p.wildcamping_status || 'Unbekannt')}<br>
      Kategorie: ${escapeHtml(categoryLabel(p.wildcamping_category))}<br>
      ${p.legal_note ? `Hinweis: ${escapeHtml(p.legal_note)}<br>` : ''}
      ${linksForCountry(p)}
    </div>
  `;
}

async function init(){
  try{
    const [routes, shelters] = await Promise.all([
      loadJson('./routes_top50_clean.geojson'),
      loadJson('./shelters.geojson')
    ]);
    routesGeojson = routes;
    sheltersGeojson = shelters;

    openSourcesBtn.addEventListener('click', async () => {
      const html = await loadHtmlBody('./quellen.html');
      openDocOverlay('Datenquellen', html);
    });
    openWorkflowBtn.addEventListener('click', async () => {
      const html = await loadHtmlBody('./workflow.html');
      openDocOverlay('Workflow', html);
    });
    closeDocOverlay.addEventListener('click', closeOverlay);
    closeDocOverlayBtn.addEventListener('click', closeOverlay);

    map.on('load', async () => {
      try{
        const countries = await loadJson('./countries_wildcamp.geojson');
        wildcampingAvailable = true;
        map.addSource('wildcamping', { type: 'geojson', data: countries });
        map.addLayer({
          id: 'wildcamping-fill',
          type: 'fill',
          source: 'wildcamping',
          filter: ['!', ['in', ['get', 'iso_a2'], ['literal', ['DE','PL','BE','AT']]]],
          paint: {
            'fill-color': [
              'match',
              ['get', 'wildcamping_category'],
              'allowed', '#22c55e',
              'restricted', '#f59e0b',
              'forbidden', '#ef4444',
              '#9ca3af'
            ],
            'fill-opacity': 0.18
          }
        });
        map.addLayer({
          id: 'wildcamping-outline',
          type: 'line',
          source: 'wildcamping',
          filter: ['!', ['in', ['get', 'iso_a2'], ['literal', ['DE','PL','BE','AT']]]],
          paint: {
            'line-color': '#cbd5e1',
            'line-width': 0.8,
            'line-opacity': 0.35
          }
        });

        map.on('click', 'wildcamping-fill', (e) => {
          const feature = e.features?.[0];
          if(!feature) return;
          showPopup(e.lngLat, popupForCountry(feature));
        });
      } catch(err){
        console.warn('Wildcamping-Länderdatei fehlt noch:', err.message);
      }

      try{
        const admin1 = await loadJson('./wildcamping_admin1_de_be_pl_tr_at.geojson');
        wildcampingAdmin1Available = true;
        map.addSource('wildcamping-admin1', { type: 'geojson', data: admin1 });
        map.addLayer({
          id: 'wildcamping-admin1-fill',
          type: 'fill',
          source: 'wildcamping-admin1',
          paint: {
            'fill-color': [
              'match',
              ['get', 'wildcamping_category'],
              'allowed', '#22c55e',
              'restricted', '#f59e0b',
              'forbidden', '#ef4444',
              '#9ca3af'
            ],
            'fill-opacity': 0.28
          }
        });
        map.addLayer({
          id: 'wildcamping-admin1-outline',
          type: 'line',
          source: 'wildcamping-admin1',
          paint: {
            'line-color': '#475569',
            'line-width': 1.1,
            'line-opacity': 0.75
          }
        });

        map.on('click', 'wildcamping-admin1-fill', (e) => {
          const feature = e.features?.[0];
          if(!feature) return;
          showPopup(e.lngLat, popupForAdmin1(feature));
        });
      } catch(err){
        console.warn('Wildcamping-Admin1-Datei fehlt noch:', err.message);
      }

      map.addSource('shelters', {
        type: 'geojson',
        data: sheltersGeojson,
        cluster: true,
        clusterRadius: 45,
        clusterMaxZoom: 9
      });

      map.addLayer({
        id: 'shelter-clusters',
        type: 'circle',
        source: 'shelters',
        filter: ['has', 'point_count'],
        paint: {
          'circle-color': '#22c55e',
          'circle-radius': ['step', ['get', 'point_count'], 14, 20, 18, 100, 24],
          'circle-opacity': 0.85
        }
      });

      map.addLayer({
        id: 'shelter-cluster-count',
        type: 'symbol',
        source: 'shelters',
        filter: ['has', 'point_count'],
        layout: {
          'text-field': ['get', 'point_count_abbreviated'],
          'text-size': 12
        },
        paint: {
          'text-color': '#062b13'
        }
      });

      map.addLayer({
        id: 'shelter-points',
        type: 'circle',
        source: 'shelters',
        filter: ['!', ['has', 'point_count']],
        paint: {
          'circle-color': '#22c55e',
          'circle-stroke-color': '#ffffff',
          'circle-stroke-width': 1.25,
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 4, 2.2, 8, 4.2, 11, 6]
        }
      });

      map.addSource('routes', { type: 'geojson', data: routesGeojson });
      map.addLayer({
        id: 'routes-line',
        type: 'line',
        source: 'routes',
        paint: {
          'line-color': '#60a5fa',
          'line-width': ['interpolate', ['linear'], ['zoom'], 4, 1.8, 7, 3.2, 10, 5],
          'line-opacity': 0.95
        }
      });
      map.addLayer({
        id: 'routes-hit',
        type: 'line',
        source: 'routes',
        paint: {
          'line-color': '#ffffff',
          'line-width': ['interpolate', ['linear'], ['zoom'], 4, 10, 10, 18],
          'line-opacity': 0
        }
      });

      map.on('click', 'routes-hit', (e) => {
        const feature = e.features?.[0];
        if(!feature) return;
        const slug = feature.properties?.slug;
        if(slug) selectRoute(slug);
        showPopup(e.lngLat, popupForRoute(feature));
      });

      map.on('click', 'shelter-points', (e) => {
        const feature = e.features?.[0];
        if(!feature) return;
        showPopup(e.lngLat, popupForShelter(feature));
      });

      map.on('click', 'shelter-clusters', async (e) => {
        const features = map.queryRenderedFeatures(e.point, { layers: ['shelter-clusters'] });
        const clusterId = features[0].properties.cluster_id;
        const zoom = await map.getSource('shelters').getClusterExpansionZoom(clusterId);
        map.easeTo({ center: features[0].geometry.coordinates, zoom });
      });

      ['routes-hit','shelter-points','shelter-clusters','wildcamping-fill','wildcamping-admin1-fill'].forEach(layer => {
        map.on('mouseenter', layer, () => {
          if (map.getLayer(layer)) map.getCanvas().style.cursor = 'pointer';
        });
        map.on('mouseleave', layer, () => {
          map.getCanvas().style.cursor = '';
        });
      });

      buildRouteList(routesGeojson.features);
      resetRouteFilter();

      document.getElementById('toggleRoutes').addEventListener('change', (e) => {
        const vis = e.target.checked ? 'visible' : 'none';
        ['routes-line','routes-hit'].forEach(id => map.setLayoutProperty(id, 'visibility', vis));
      });

      document.getElementById('toggleShelters').addEventListener('change', (e) => {
        const vis = e.target.checked ? 'visible' : 'none';
        ['shelter-clusters','shelter-cluster-count','shelter-points'].forEach(id => map.setLayoutProperty(id, 'visibility', vis));
      });

      document.getElementById('toggleWildcamping').addEventListener('change', (e) => {
        const vis = e.target.checked ? 'visible' : 'none';
        ['wildcamping-fill','wildcamping-outline','wildcamping-admin1-fill','wildcamping-admin1-outline'].forEach(id => {
          if(map.getLayer(id)) map.setLayoutProperty(id, 'visibility', vis);
        });
      });

      routeSearchEl.addEventListener('input', applySearchFilter);
      routeSearchEl.addEventListener('keydown', (e) => {
        if(e.key === 'Escape'){
          routeSearchEl.value = '';
          applySearchFilter();
          resetRouteFilter();
        }
      });

      map.on('click', (e) => {
        const layers = ['routes-hit', 'shelter-points', 'shelter-clusters'];
        if (map.getLayer('wildcamping-fill')) layers.push('wildcamping-fill');
        if (map.getLayer('wildcamping-admin1-fill')) layers.push('wildcamping-admin1-fill');
        const features = map.queryRenderedFeatures(e.point, { layers });
        if(!features.length){
          if (activePopup) activePopup.remove();
          resetRouteFilter();
        }
      });
    });
  }catch(err){
    console.error(err);
    setStatus('Fehler beim Laden der Daten');
  }
}
init();
