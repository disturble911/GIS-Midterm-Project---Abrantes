const SUPABASE_URL = 'https://mwpjamrcvingdznjcwta.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im13cGphbXJjdmluZ2R6bmpjd3RhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE5NjcwOTcsImV4cCI6MjA4NzU0MzA5N30.GlIXhWQL4u1xevupCvoMFNbkYS5TVfPidrUZPUrzFY8';

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const map = L.map('map').setView([8.233246492636708, 124.24181829598899], 14);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '© OpenStreetMap contributors'
}).addTo(map);

const drawControl = new L.Control.Draw({
  draw: {
    marker: true,
    polygon: false,
    circle: false,
    polyline: false,
    rectangle: false,
    circlemarker: false
  },
  edit: false
});
map.addControl(drawControl);

let tempMarker = null;
let markerLayer = L.layerGroup().addTo(map);
let allLocations = [];
let editingId = null;

const pinForm = document.getElementById('pinForm');
const formHeading = document.getElementById('formHeading');
const recordIdInput = document.getElementById('recordId');
const latInput = document.getElementById('lat');
const lngInput = document.getElementById('lng');
const nameInput = document.getElementById('name');
const descriptionInput = document.getElementById('description');
const photoUrlInput = document.getElementById('photoUrl');
const addPhotoBtn = document.getElementById('addPhotoBtn');
const photoListEl = document.getElementById('photoList');
const ratingInput = document.getElementById('rating');
const saveBtn = document.getElementById('saveBtn');
const cancelBtn = document.getElementById('cancelBtn');
const refreshBtn = document.getElementById('refreshBtn');
const toggleListBtn = document.getElementById('toggleListBtn');
const locationCount = document.getElementById('locationCount');
const selectedCoords = document.getElementById('selectedCoords');
const statusBar = document.getElementById('statusBar');
const locationsContainer = document.getElementById('locationsContainer');
const locationList = document.getElementById('locationList');
const modal = document.getElementById('imageModal');
const modalImg = document.getElementById('modalImage');
const modalClose = document.querySelector('.modal-close');
const modalPrev = document.getElementById('modalPrev');
const modalNext = document.getElementById('modalNext');
const modalCounter = document.getElementById('modalCounter');

let currentPhotos = [];
let currentPhotoIndex = 0;

function setStatus(message, isError = false) {
  statusBar.textContent = message;
  statusBar.style.background = isError ? 'rgba(199, 60, 47, 0.95)' : 'rgba(24, 50, 74, 0.9)';
}

function getCoords(location) {
  const latitude = location.lat;
  const longitude = location.lng ?? location.long;
  return { latitude, longitude };
}

function clearRenderedMarkers() {
  markerLayer.clearLayers();
}

function removeTempMarker() {
  if (tempMarker) {
    map.removeLayer(tempMarker);
    tempMarker = null;
  }
}

function resetForm() {
  pinForm.reset();
  pinForm.classList.add('hidden');
  editingId = null;
  recordIdInput.value = '';
  formHeading.textContent = 'Add New Location';
  saveBtn.textContent = 'Save';
  selectedCoords.textContent = 'No coordinates selected yet.';
  removeTempMarker();
  currentPhotos = [];
  renderPhotoList();
}

function renderPhotoList() {
  photoListEl.innerHTML = currentPhotos.map((url, index) => `
    <div class="photo-item">
      <img src="${escapeHtml(url)}" alt="Photo ${index + 1}">
      <span class="photo-remove" onclick="removePhoto(${index})">&times;</span>
    </div>
  `).join('');
}

window.removePhoto = function(index) {
  currentPhotos.splice(index, 1);
  renderPhotoList();
};

function addPhoto() {
  const url = photoUrlInput.value.trim();
  if (url) {
    currentPhotos.push(url);
    photoUrlInput.value = '';
    renderPhotoList();
  }
}

function openForm({ lat, lng, mode = 'create', record = null }) {
  latInput.value = lat;
  lngInput.value = lng;
  selectedCoords.textContent = `Selected coordinates: ${Number(lat).toFixed(6)}, ${Number(lng).toFixed(6)}`;
  pinForm.classList.remove('hidden');

  if (mode === 'edit' && record) {
    editingId = record.id;
    recordIdInput.value = record.id;
    formHeading.textContent = 'Edit Location';
    saveBtn.textContent = 'Update';
    nameInput.value = record.name || '';
    descriptionInput.value = record.description || '';
    ratingInput.value = record.rating || '';
    try {
      currentPhotos = record.photos ? JSON.parse(record.photos) : [];
    } catch {
      currentPhotos = [];
    }
  } else {
    editingId = null;
    recordIdInput.value = '';
    formHeading.textContent = 'Add New Location';
    saveBtn.textContent = 'Save';
    nameInput.value = '';
    descriptionInput.value = '';
    photoUrlInput.value = '';
    ratingInput.value = '';
    currentPhotos = [];
  }
  renderPhotoList();
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function buildPopup(location) {
  const { latitude, longitude } = getCoords(location);
  const stars = location.rating ? '★'.repeat(location.rating) + '☆'.repeat(5 - location.rating) : 'No rating';
  let photos = [];
  try {
    photos = location.photos ? JSON.parse(location.photos) : [];
  } catch {
    photos = [];
  }
  if (!Array.isArray(photos)) photos = [];
  let photoHtml = '';
  
  if (photos.length > 0) {
    const photosJson = JSON.stringify(photos).replace(/'/g, "&#39;");
    if (photos.length === 1) {
      photoHtml = `<img src="${escapeHtml(photos[0])}" alt="${escapeHtml(location.name)}" style="width:100%;max-height:150px;object-fit:cover;border-radius:6px;margin:8px 0;cursor:pointer;" class="clickable-photo" data-photos='${photosJson}' data-src="${escapeHtml(photos[0])}">`;
    } else {
      photoHtml = `<div class="popup-photos">` + photos.map((p, i) => 
        `<img src="${escapeHtml(p)}" alt="Photo ${i+1}" style="width:60px;height:60px;object-fit:cover;border-radius:4px;margin:2px;cursor:pointer;" class="clickable-photo" data-photos='${photosJson}' data-src="${escapeHtml(p)}">`
      ).join('') + `</div>`;
    }
  }
  
  return `
    <div>
      ${photoHtml}
      <strong>${escapeHtml(location.name)}</strong><br>
      ${escapeHtml(location.description || 'No description')}<br>
      <span style="color:#f59e0b;">${stars}</span><br>
      <small>${Number(latitude).toFixed(5)}, ${Number(longitude).toFixed(5)}</small>
      <div class="popup-actions">
        <button class="popup-btn-edit" onclick="editLocation('${location.id}')">Edit</button>
        <button class="popup-btn-delete" onclick="deleteLocation('${location.id}')">Delete</button>
      </div>
    </div>
  `;
}

async function loadMarkers() {
  clearRenderedMarkers();
  setStatus('Loading locations from Supabase...');

  const { data, error } = await supabaseClient
    .from('locations')
    .select('*')
    .order('name', { ascending: true });

  if (error) {
    console.error('Error loading markers:', error);
    setStatus(`Failed to load locations: ${error.message}`, true);
    return;
  }

  allLocations = data || [];

  let validCount = 0;
  const bounds = [];

  allLocations.forEach((location) => {
    const { latitude, longitude } = getCoords(location);

    if (typeof latitude !== 'number' || typeof longitude !== 'number') {
      console.warn('Skipping location with missing coords:', location);
      return;
    }

    const marker = L.marker([latitude, longitude]).addTo(markerLayer);
    marker.bindPopup(buildPopup(location));
    bounds.push([latitude, longitude]);
    validCount += 1;
  });

  locationCount.textContent = `Showing ${validCount} location${validCount !== 1 ? 's' : ''}`;

  if (bounds.length === 1) {
    map.setView(bounds[0], 14);
  } else if (bounds.length > 1) {
    map.fitBounds(bounds, { padding: [40, 40] });
  }

  setStatus(`Loaded ${validCount} location${validCount !== 1 ? 's' : ''}.`);
  
  renderLocationList();
}

function renderLocationList() {
  if (allLocations.length === 0) {
    locationsContainer.innerHTML = '<p class="no-locations">No locations yet. Click on the map to add one!</p>';
    return;
  }
  
  locationsContainer.innerHTML = allLocations.map(location => {
    const { latitude, longitude } = getCoords(location);
    const stars = location.rating ? '★'.repeat(location.rating) + '☆'.repeat(5 - location.rating) : 'No rating';
    return `
      <div class="location-item" onclick="focusLocation('${location.id}')">
        <div class="loc-name">${escapeHtml(location.name)}</div>
        <div class="loc-desc">${escapeHtml(location.description || 'No description')}</div>
        <div class="loc-rating">${stars}</div>
        <div class="loc-coords">${Number(latitude).toFixed(4)}, ${Number(longitude).toFixed(4)}</div>
      </div>
    `;
  }).join('');
}

window.focusLocation = function focusLocation(id) {
  const location = allLocations.find((item) => item.id === id);
  if (!location) return;
  
  const { latitude, longitude } = getCoords(location);
  map.setView([latitude, longitude], 15);
  
  markerLayer.eachLayer(marker => {
    const markerLoc = marker.getLatLng();
    if (markerLoc.lat === latitude && markerLoc.lng === longitude) {
      marker.openPopup();
    }
  });
};

map.on('draw:created', (event) => {
  removeTempMarker();
  tempMarker = event.layer.addTo(map);

  const { lat, lng } = tempMarker.getLatLng();
  openForm({ lat, lng, mode: 'create' });
  setStatus('New marker selected. Enter details and save.');
});

window.editLocation = function editLocation(id) {
  const location = allLocations.find((item) => item.id === id);
  if (!location) return;

  const { latitude, longitude } = getCoords(location);

  removeTempMarker();
  tempMarker = L.marker([latitude, longitude]).addTo(map);
  map.setView([latitude, longitude], 15);
  openForm({ lat: latitude, lng: longitude, mode: 'edit', record: location });
  setStatus(`Editing ${location.name}. Update the details and save.`);
};

window.deleteLocation = async function deleteLocation(id) {
  const location = allLocations.find((item) => item.id === id);
  if (!location) return;

  const confirmed = window.confirm(`Delete ${location.name}?`);
  if (!confirmed) return;

  setStatus(`Deleting ${location.name}...`);

  const { error } = await supabaseClient
    .from('locations')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Delete error:', error);
    setStatus(`Delete failed: ${error.message}`, true);
    return;
  }

  if (editingId === id) {
    resetForm();
  }

  await loadMarkers();
  setStatus(`${location.name} deleted successfully.`);
};

pinForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  const isEditing = Boolean(editingId);
  const currentEditingId = editingId;
  const name = nameInput.value.trim();
  const description = descriptionInput.value.trim();
  const rating = ratingInput.value ? parseInt(ratingInput.value) : null;
  const lat = parseFloat(latInput.value);
  const lng = parseFloat(lngInput.value);

  if (!name) {
    setStatus('Location name is required.', true);
    return;
  }

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    setStatus('Coordinates are missing or invalid.', true);
    return;
  }

  setStatus(isEditing ? 'Updating location...' : 'Saving location...');

  let response;

  if (isEditing) {
    response = await supabaseClient
      .from('locations')
      .update({ name, description, lat, long: lng, photos: JSON.stringify(currentPhotos), rating })
      .eq('id', currentEditingId);
  } else {
    response = await supabaseClient
      .from('locations')
      .insert([{ name, description, lat, long: lng, photos: JSON.stringify(currentPhotos), rating }]);
  }

  if (response.error) {
    console.error('Save error:', response.error);
    setStatus(`Save failed: ${response.error.message}`, true);
    return;
  }

  resetForm();
  await loadMarkers();
  setStatus(isEditing ? 'Location updated successfully.' : 'Location saved successfully.');
});

cancelBtn.addEventListener('click', () => {
  resetForm();
  setStatus('Action cancelled.');
});

addPhotoBtn.addEventListener('click', addPhoto);

photoUrlInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    addPhoto();
  }
});

map.on('click', (e) => {
  if (!pinForm.classList.contains('hidden')) return;
  removeTempMarker();
  tempMarker = L.marker([e.latlng.lat, e.latlng.lng]).addTo(map);
  openForm({ lat: e.latlng.lat, lng: e.latlng.lng, mode: 'create' });
  setStatus('Click on map to select location or use draw tool.');
});

toggleListBtn.addEventListener('click', () => {
  locationList.classList.toggle('collapsed');
  toggleListBtn.textContent = locationList.classList.contains('collapsed') ? 'Show List' : 'Hide List';
  setTimeout(() => {
    map.invalidateSize();
  }, 350);
});

refreshBtn.addEventListener('click', loadMarkers);

window.openImageModal = function(src, photos) {
  if (photos && photos.length > 0) {
    currentPhotos = photos;
    currentPhotoIndex = photos.indexOf(src);
    if (currentPhotoIndex === -1) currentPhotoIndex = 0;
  } else {
    currentPhotos = [src];
    currentPhotoIndex = 0;
  }
  modalImg.src = src;
  updateModalControls();
  modal.classList.remove('hidden');
};

function updateModalControls() {
  modalCounter.textContent = currentPhotos.length > 1 ? `${currentPhotoIndex + 1} / ${currentPhotos.length}` : '';
  modalPrev.style.display = currentPhotos.length > 1 ? 'block' : 'none';
  modalNext.style.display = currentPhotos.length > 1 ? 'block' : 'none';
}

modalClose.addEventListener('click', () => {
  modal.classList.add('hidden');
});

modalPrev.addEventListener('click', (e) => {
  e.stopPropagation();
  currentPhotoIndex = (currentPhotoIndex - 1 + currentPhotos.length) % currentPhotos.length;
  modalImg.src = currentPhotos[currentPhotoIndex];
  updateModalControls();
});

modalNext.addEventListener('click', (e) => {
  e.stopPropagation();
  currentPhotoIndex = (currentPhotoIndex + 1) % currentPhotos.length;
  modalImg.src = currentPhotos[currentPhotoIndex];
  updateModalControls();
});

modal.addEventListener('click', (e) => {
  if (e.target === modal) {
    modal.classList.add('hidden');
  }
});

document.addEventListener('keydown', (e) => {
  if (modal.classList.contains('hidden')) return;
  if (e.key === 'ArrowLeft') {
    currentPhotoIndex = (currentPhotoIndex - 1 + currentPhotos.length) % currentPhotos.length;
    modalImg.src = currentPhotos[currentPhotoIndex];
    updateModalControls();
  } else if (e.key === 'ArrowRight') {
    currentPhotoIndex = (currentPhotoIndex + 1) % currentPhotos.length;
    modalImg.src = currentPhotos[currentPhotoIndex];
    updateModalControls();
  }
});

document.addEventListener('click', (e) => {
  if (e.target.classList.contains('clickable-photo')) {
    const src = e.target.dataset.src;
    const photos = JSON.parse(e.target.dataset.photos);
    currentPhotos = photos;
    currentPhotoIndex = photos.indexOf(src);
    if (currentPhotoIndex === -1) currentPhotoIndex = 0;
    modalImg.src = src;
    updateModalControls();
    modal.classList.remove('hidden');
  }
});

loadMarkers();