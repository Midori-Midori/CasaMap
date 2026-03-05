// ============================================================
//  CasaMap · script.js
//  Google Maps integrado
// ============================================================

// ── CONFIGURACIÓN ──────────────────────────────────────────────────────────
const GOOGLE_MAPS_API_KEY = "AIzaSyCiPSLnqVlJCzSO-Oh4pgTwHLBzmk3dfYs";

// ── DATOS CON COORDENADAS REALES (CDMX) ───────────────────────────────────
const properties = [
  { id: 1, title: "Casa con jardín en Coyoacán", address: "Coyoacán, CDMX", price: "$3,200,000", priceNum: 3200000, type: "casa", beds: 3, baths: 2, m2: 180, emoji: "🏡", bg: "linear-gradient(135deg,#deeaaf,#c5d988)", badge: "Nuevo", lat: 19.3467, lng: -99.1617, isNew: true, tags: ["coyoacan", "jardin", "casa"] },
  { id: 2, title: "Departamento moderno en Polanco", address: "Polanco, CDMX", price: "$4,800,000", priceNum: 4800000, type: "departamento", beds: 2, baths: 2, m2: 95, emoji: "🏢", bg: "linear-gradient(135deg,#c8dca0,#a8c478)", badge: null, lat: 19.4327, lng: -99.1937, isNew: false, tags: ["polanco", "departamento", "moderno"] },
  { id: 3, title: "Terreno en Xochimilco", address: "Xochimilco, CDMX", price: "$1,500,000", priceNum: 1500000, type: "terreno", beds: 0, baths: 0, m2: 320, emoji: "🌿", bg: "linear-gradient(135deg,#b8cc88,#90a955)", badge: "Oportunidad", lat: 19.2571, lng: -99.1026, isNew: false, tags: ["xochimilco", "terreno", "barato"] },
  { id: 4, title: "Casa amplia en Del Valle", address: "Del Valle, CDMX", price: "$5,500,000", priceNum: 5500000, type: "casa", beds: 4, baths: 3, m2: 250, emoji: "🏠", bg: "linear-gradient(135deg,#ecf39e,#deeaaf)", badge: null, lat: 19.3780, lng: -99.1606, isNew: false, tags: ["del valle", "casa", "amplia"] },
  { id: 5, title: "Loft en La Condesa", address: "La Condesa, CDMX", price: "$2,900,000", priceNum: 2900000, type: "departamento", beds: 1, baths: 1, m2: 65, emoji: "🏙️", bg: "linear-gradient(135deg,#d0e898,#b8d470)", badge: "Destacado", lat: 19.4109, lng: -99.1727, isNew: true, tags: ["condesa", "loft", "departamento"] },
  { id: 6, title: "Casa de lujo en Santa Fe", address: "Santa Fe, CDMX", price: "$7,200,000", priceNum: 7200000, type: "casa", beds: 5, baths: 4, m2: 420, emoji: "🏰", bg: "linear-gradient(135deg,#7a9840,#4f772d)", badge: "Premium", lat: 19.3595, lng: -99.2617, isNew: false, tags: ["santa fe", "casa", "lujo", "premium"] },
  { id: 7, title: "Departamento en Roma Norte", address: "Roma Norte, CDMX", price: "$2,400,000", priceNum: 2400000, type: "departamento", beds: 2, baths: 1, m2: 80, emoji: "🏛️", bg: "linear-gradient(135deg,#e4f0b0,#cce080)", badge: "Nuevo", lat: 19.4186, lng: -99.1627, isNew: true, tags: ["roma", "roma norte", "departamento"] },
  { id: 8, title: "Terreno en Tlalpan", address: "Tlalpan, CDMX", price: "$980,000", priceNum: 980000, type: "terreno", beds: 0, baths: 0, m2: 500, emoji: "🌄", bg: "linear-gradient(135deg,#a8c870,#90a955)", badge: null, lat: 19.2920, lng: -99.1654, isNew: false, tags: ["tlalpan", "terreno", "grande"] },
];

// ── ESTADO ─────────────────────────────────────────────────────────────────
let selectedId = null;
let favorites = new Set();
let activeFilter = 'all';
let filtered = [...properties];

// Referencias al mapa y marcadores
let googleMap = null;
let infoWindow = null;
const gMarkers = {};

// ── INICIALIZAR GOOGLE MAPS (callback desde la API) ────────────────────────
function initMap() {
  googleMap = new google.maps.Map(document.getElementById("map"), {
    zoom: 11,
    center: { lat: 19.38, lng: -99.17 },
    mapId: "b41fd1d4737f6f92ba307825",
    zoomControl: true,
    streetViewControl: false,
    mapTypeControl: false,
    fullscreenControl: false,
  });

  infoWindow = new google.maps.InfoWindow();

  // ── Places Autocomplete en la barra de búsqueda ──────────────────────
  const searchInput = document.getElementById('search-input');
  const autocomplete = new google.maps.places.Autocomplete(searchInput, {
    fields: ["geometry", "name", "formatted_address"],
  });

  autocomplete.addListener("place_changed", () => {
    const place = autocomplete.getPlace();
    if (!place.geometry || !place.geometry.location) {
      applyFilter();
      return;
    }
    // Mover el mapa al lugar seleccionado
    if (place.geometry.viewport) {
      googleMap.fitBounds(place.geometry.viewport);
    } else {
      googleMap.setCenter(place.geometry.location);
      googleMap.setZoom(14);
    }
    applyFilter();
  });

  // Cerrar selección al hacer clic en el mapa
  googleMap.addListener("click", () => {
    selectedId = null;
    infoWindow.close();
    renderCards();
    renderGoogleMarkers();
  });

  renderCards();
  renderGoogleMarkers();
}

// ── BÚSQUEDA INTELIGENTE ───────────────────────────────────────────────────
function matchesSearch(p, query) {
  if (!query) return true;
  const words = query.toLowerCase().trim().split(/\s+/);
  const searchable = [
    p.title, p.address, p.type, p.badge || '',
    ...(p.tags || []),
    p.price,
    `${p.beds} recamara`,
    `${p.m2} m2`,
    `${p.m2} metros`,
  ].join(' ').toLowerCase();
  return words.every(w => searchable.includes(w));
}

// ── CREAR ELEMENTO VISUAL DEL MARCADOR ────────────────────────────────────
function buildMarkerElement(p, isActive = false) {
  const div = document.createElement("div");
  div.className = "marker-bubble" + (isActive ? " active-marker" : "");
  div.innerHTML = `🏠 ${p.price}`;
  return div;
}

// ── RENDERIZAR MARCADORES EN GOOGLE MAPS ──────────────────────────────────
function renderGoogleMarkers() {
  if (!googleMap) return;

  // Limpiar marcadores anteriores
  Object.values(gMarkers).forEach(m => m.setMap(null));
  Object.keys(gMarkers).forEach(k => delete gMarkers[k]);

  filtered.forEach(p => {
    const marker = new google.maps.Marker({
      map: googleMap,
      position: { lat: p.lat, lng: p.lng },
      title: p.title,
      label: {
        text: p.price,
        fontSize: "11px",
        fontWeight: "bold",
        color: "#4f772d",
      },
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 8,
        fillColor: "#4f772d",
        fillOpacity: 1,
        strokeColor: "#ffffff",
        strokeWeight: 2,
      },
    });
    marker.addListener("click", () => selectProperty(p.id, true));
    gMarkers[p.id] = marker;
  });
}

// ── INFO WINDOW DE GOOGLE MAPS ─────────────────────────────────────────────
function openInfoWindow(p, marker) {
  const specsHtml = p.type !== 'terreno'
    ? `<div class="iw-specs"><span>🛏 ${p.beds}</span><span>🚿 ${p.baths}</span><span>📐 ${p.m2} m²</span></div>`
    : `<div class="iw-specs"><span>📐 ${p.m2} m²</span><span>🌿 Terreno</span></div>`;

  infoWindow.setContent(`
    <div class="gm-iw">
      <div class="gm-iw-img" style="background:${p.bg}">
        <span>${p.emoji}</span>
        ${p.badge ? `<span class="gm-iw-badge">${p.badge}</span>` : ''}
      </div>
      <div class="gm-iw-body">
        <div class="gm-iw-price">${p.price}</div>
        <div class="gm-iw-title">${p.title}</div>
        <div class="gm-iw-loc">📍 ${p.address}</div>
        ${specsHtml}
      </div>
    </div>
  `);
  infoWindow.open({ map: googleMap, anchor: marker });
}

// ── RENDERIZAR TARJETAS ────────────────────────────────────────────────────
function renderCards() {
  const list = document.getElementById('property-list');
  document.getElementById('count-badge').textContent = filtered.length;
  list.innerHTML = '';

  if (filtered.length === 0) {
    list.innerHTML = `
      <div style="text-align:center; padding:40px 20px; color:var(--brown-light);">
        <div style="font-size:2.5rem; margin-bottom:12px;">🔍</div>
        <div style="font-weight:600; color:var(--charcoal); margin-bottom:6px;">Sin resultados</div>
        <div style="font-size:0.85rem;">Intenta con otro término<br>o limpia los filtros</div>
        <button onclick="clearSearch()" style="margin-top:16px; background:var(--rust); color:white; border:none; border-radius:50px; padding:8px 20px; font-family:'DM Sans',sans-serif; font-size:0.85rem; font-weight:600; cursor:pointer;">Limpiar búsqueda</button>
      </div>`;
    return;
  }

  filtered.forEach((p, i) => {
    const card = document.createElement('div');
    card.className = 'property-card' + (selectedId === p.id ? ' selected' : '');
    card.style.animationDelay = i * 0.06 + 's';
    card.dataset.id = p.id;

    const isFav = favorites.has(p.id);
    const specs = p.type !== 'terreno'
      ? `<div class="spec">🛏 ${p.beds}</div><div class="spec">🚿 ${p.baths}</div><div class="spec">📐 ${p.m2} m²</div>`
      : `<div class="spec">📐 ${p.m2} m²</div><div class="spec">🌿 Terreno</div>`;

    card.innerHTML = `
      <div class="card-img-mock" style="background:${p.bg}">
        <span>${p.emoji}</span>
        ${p.badge ? `<span class="card-badge">${p.badge}</span>` : ''}
        <button class="card-fav" data-fav="${p.id}">${isFav ? '❤️' : '🤍'}</button>
      </div>
      <div class="card-body">
        <div class="card-price">${p.price}</div>
        <div class="card-title">${p.title}</div>
        <div class="card-location">📍 ${p.address}</div>
        <div class="card-specs">${specs}</div>
      </div>`;

    card.addEventListener('click', e => {
      if (e.target.closest('[data-fav]')) return;
      selectProperty(p.id);
    });
    card.querySelector('[data-fav]').addEventListener('click', e => {
      e.stopPropagation();
      favorites[favorites.has(p.id) ? 'delete' : 'add'](p.id);
      renderCards();
    });

    list.appendChild(card);
  });
}

// ── SELECCIONAR PROPIEDAD ──────────────────────────────────────────────────
function selectProperty(id, fromMap = false) {
  selectedId = selectedId === id ? null : id;
  renderCards();
  renderGoogleMarkers();
  if (selectedId) {
    const p = properties.find(x => x.id === id);
    if (googleMap) {
      googleMap.panTo({ lat: p.lat, lng: p.lng });
      googleMap.setZoom(14);
    }
    const marker = gMarkers[id];
    if (marker) openInfoWindow(p, marker);
    if (!fromMap) {
      const card = document.querySelector(`.property-card[data-id="${id}"]`);
      if (card) card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  } else {
    if (infoWindow) infoWindow.close();
  }
}

// ── LIMPIAR BÚSQUEDA ───────────────────────────────────────────────────────
function clearSearch() {
  document.getElementById('search-input').value = '';
  activeFilter = 'all';
  document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
  document.querySelector('[data-filter="all"]').classList.add('active');
  filtered = [...properties];
  selectedId = null;
  infoWindow && infoWindow.close();
  googleMap && googleMap.panTo({ lat: 19.38, lng: -99.17 });
  googleMap && googleMap.setZoom(11);
  renderCards();
  renderGoogleMarkers();
}

// ── FILTROS ────────────────────────────────────────────────────────────────
document.querySelectorAll('.filter-chip').forEach(chip => {
  chip.addEventListener('click', () => {
    document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    activeFilter = chip.dataset.filter;
    applyFilter();
  });
});

function applyFilter() {
  const s = document.getElementById('search-input').value;
  filtered = properties.filter(p => {
    const f = activeFilter;
    const byType =
      f === 'all' ||
      (f === 'casa' && p.type === 'casa') ||
      (f === 'departamento' && p.type === 'departamento') ||
      (f === 'terreno' && p.type === 'terreno') ||
      (f === 'menos3' && p.priceNum < 3000000) ||
      (f === '3a5' && p.priceNum >= 3000000 && p.priceNum <= 5000000) ||
      (f === 'mas5' && p.priceNum > 5000000) ||
      (f === 'nuevo' && p.isNew);
    return byType && matchesSearch(p, s);
  });
  selectedId = null;
  infoWindow && infoWindow.close();
  renderCards();
  renderGoogleMarkers();
}

document.getElementById('search-input').addEventListener('input', applyFilter);
