document.querySelectorAll('[data-category]').forEach(btn => {
  btn.addEventListener('click', () => {
    const category = btn.dataset.category;
    window.location.href = `image-manager/index.html?category=${category}`;
  });
});
