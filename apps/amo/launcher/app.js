const STORAGE_KEY = 'amo_launcher_server_url';
const input = document.getElementById('serverUrl');
const form  = document.getElementById('launchForm');

input.value = localStorage.getItem(STORAGE_KEY) ?? '';

function normalizeUrl(raw) {
    let url = (raw ?? '').trim();
    if (!url) return null;
    if (!/^https?:\/\//i.test(url)) url = `http://${url}`;
    return url.replace(/\/+$/, '');
}

form.addEventListener('submit', (ev) => {
    ev.preventDefault();
    const url = normalizeUrl(input.value);
    if (!url) {
        input.focus();
        return;
    }
    localStorage.setItem(STORAGE_KEY, url);
    window.location.href = url;
});
