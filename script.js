function selectProperty(id, fromMap = false) {
  selectedId = selectedId === id ? null : id;
  renderCards();

  if (!googleMap) return; // ✅ evita error si mapa no está listo

  renderGoogleMarkers().then(() => {
    if (selectedId) {

      const p = properties.find(x => x.id === id);
      if (!p) return;

      if (googleMap) {
        googleMap.panTo({ lat: p.lat, lng: p.lng });
        googleMap.setZoom(14);
      }

      const marker = gMarkers[id];
      if (marker) openInfoWindow(p, marker);

      if (!fromMap) {
        const card = document.querySelector(`.property-card[data-id="${id}"]`);
        if (card) {
          card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      }

    } else {
      infoWindow && infoWindow.close();
    }
  });
}