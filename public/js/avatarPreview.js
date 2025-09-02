document.addEventListener('DOMContentLoaded', function () {
  const input = document.getElementById('avatarInput');
  const preview = document.getElementById('avatarPreview');
  if (!input || !preview) return;
  input.addEventListener('change', function (e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = function () {preview.src = reader.result;};
    reader.readAsDataURL(file);
  });
});