/**
 * NOSTRA - Fashion E-Commerce Client Application Logic
 * Integración con FakeStore API y Electron
 */

// Estado global de la aplicación
let allProducts = [];
let filteredProducts = [];
let selectedProduct = null;
let cartItemsCount = 0;

// Configuración de Paginación
const ITEMS_PER_PAGE = 9;
let currentPage = 1;

// Elementos del DOM Principales
const productsGrid = document.getElementById('products-grid');
const templateProduct = document.getElementById('template-product').content;
const loadingSection = document.getElementById('loading');
const feedbackMessage = document.getElementById('feedback-message');
const showingCountEl = document.getElementById('showing-count');
const totalCountEl = document.getElementById('total-count');
const appliedTagsContainer = document.getElementById('applied-tags-container');
const appliedFiltersBar = document.getElementById('applied-filters-bar');
const paginationNumbers = document.getElementById('pagination-numbers');
const btnPagePrev = document.getElementById('btn-page-prev');
const btnPageNext = document.getElementById('btn-page-next');
const cartBadge = document.getElementById('cart-badge');

// Controles de Búsqueda y Filtros
const inputSearch = document.getElementById('input-search');
const selectSort = document.getElementById('select-sort');
const btnClearAll = document.getElementById('btn-clear-all');
const navLinkBtns = document.querySelectorAll('.nav-link-btn');

// Elementos del Modal de Detalles
const modalDetails = document.getElementById('modal-details');
const btnCloseModal = document.getElementById('btn-close-modal');
const modalImg = document.getElementById('modal-img');
const modalTag = document.getElementById('modal-tag');
const modalTitle = document.getElementById('modal-title');
const modalRating = document.getElementById('modal-rating');
const modalPrice = document.getElementById('modal-price');
const modalDesc = document.getElementById('modal-desc');
const btnModalNotify = document.getElementById('btn-modal-notify');

/**
 * 1. Consulta Inicial a FakeStore API
 */
const fetchProducts = async () => {
    try {
        setLoading(true);
        const res = await fetch('https://fakestoreapi.com/products');

        if (!res.ok) {
            throw new Error(`Error en la consulta: ${res.statusText}`);
        }

        allProducts = await res.json();
        updateCategoryCounts();
        applyFiltersAndRender();
    } catch (error) {
        console.error("Error al obtener productos:", error);
        showFeedback(true);
    } finally {
        setLoading(false);
    }
};

/**
 * Actualiza los contadores de productos por categoría en la barra lateral
 */
const updateCategoryCounts = () => {
    const counts = {
        all: allProducts.length,
        women: allProducts.filter(p => p.category === "women's clothing").length,
        men: allProducts.filter(p => p.category === "men's clothing").length,
        jewelery: allProducts.filter(p => p.category === "jewelery").length,
        electronics: allProducts.filter(p => p.category === "electronics").length
    };

    const countAll = document.getElementById('count-all');
    const countWomen = document.getElementById('count-women');
    const countMen = document.getElementById('count-men');
    const countJewelery = document.getElementById('count-jewelery');
    const countElectronics = document.getElementById('count-electronics');

    if (countAll) countAll.textContent = `(${counts.all})`;
    if (countWomen) countWomen.textContent = `(${counts.women})`;
    if (countMen) countMen.textContent = `(${counts.men})`;
    if (countJewelery) countJewelery.textContent = `(${counts.jewelery})`;
    if (countElectronics) countElectronics.textContent = `(${counts.electronics})`;
};

const setLoading = (isLoading) => {
    if (isLoading) {
        loadingSection.classList.remove('d-none');
    } else {
        loadingSection.classList.add('d-none');
    }
};

/**
 * 2. Aplicación de Filtros Múltiples y Búsqueda
 */
const applyFiltersAndRender = () => {
    const searchTerm = inputSearch.value.trim().toLowerCase();
    
    // Categoría seleccionada
    const checkedCategoryRadio = document.querySelector('input[name="category"]:checked');
    const selectedCategory = checkedCategoryRadio ? checkedCategoryRadio.value : '';

    // Rango de precio seleccionado
    const checkedPriceRadio = document.querySelector('input[name="price-range"]:checked');
    const selectedPriceRange = checkedPriceRadio ? checkedPriceRadio.value : '';

    // Calificación mínima
    const checkedRatingRadio = document.querySelector('input[name="rating-min"]:checked');
    const selectedRatingMin = checkedRatingRadio ? parseFloat(checkedRatingRadio.value) : 0;

    // Ordenación
    const selectedSort = selectSort.value;

    filteredProducts = allProducts.filter((product) => {
        // Búsqueda por texto (título y descripción)
        const matchesSearch = !searchTerm ||
            product.title.toLowerCase().includes(searchTerm) ||
            product.description.toLowerCase().includes(searchTerm);

        // Filtro 1: Categoría
        const matchesCategory = !selectedCategory || product.category === selectedCategory;

        // Filtro 2: Rango de precio
        let matchesPrice = true;
        if (selectedPriceRange === 'under-50') {
            matchesPrice = product.price < 50;
        } else if (selectedPriceRange === '50-100') {
            matchesPrice = product.price >= 50 && product.price <= 100;
        } else if (selectedPriceRange === 'over-100') {
            matchesPrice = product.price > 100;
        }

        // Filtro 3: Calificación mínima
        const matchesRating = !selectedRatingMin || (product.rating && product.rating.rate >= selectedRatingMin);

        return matchesSearch && matchesCategory && matchesPrice && matchesRating;
    });

    // Ordenación
    if (selectedSort === 'price-asc') {
        filteredProducts.sort((a, b) => a.price - b.price);
    } else if (selectedSort === 'price-desc') {
        filteredProducts.sort((a, b) => b.price - a.price);
    } else if (selectedSort === 'rating-desc') {
        filteredProducts.sort((a, b) => (b.rating?.rate || 0) - (a.rating?.rate || 0));
    }

    // Sincronizar botones de navegación superior
    navLinkBtns.forEach(btn => {
        const cat = btn.getAttribute('data-category');
        if (cat === selectedCategory) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    // Renderizar tags de filtros aplicados
    renderAppliedFilterTags(selectedCategory, selectedPriceRange, selectedRatingMin, searchTerm);

    // Ajustar paginación y renderizar la página 1
    currentPage = 1;
    renderCurrentPage();
};

/**
 * Renderiza los tags de filtros activos (Applied Filters)
 */
const renderAppliedFilterTags = (category, priceRange, ratingMin, search) => {
    appliedTagsContainer.textContent = '';
    const tags = [];

    if (category) {
        tags.push({ label: formatCategoryName(category), type: 'category' });
    }
    if (priceRange) {
        let label = 'Under $50';
        if (priceRange === '50-100') label = '$50 - $100';
        if (priceRange === 'over-100') label = 'Over $100';
        tags.push({ label, type: 'price' });
    }
    if (ratingMin > 0) {
        tags.push({ label: `${ratingMin}★ and above`, type: 'rating' });
    }
    if (search) {
        tags.push({ label: `"${search}"`, type: 'search' });
    }

    if (tags.length === 0) {
        appliedFiltersBar.classList.add('d-none');
        return;
    }

    appliedFiltersBar.classList.remove('d-none');

    tags.forEach(tag => {
        const span = document.createElement('span');
        span.className = 'filter-tag';
        span.innerHTML = `${tag.label} <span class="close">&times;</span>`;
        span.addEventListener('click', () => {
            removeFilter(tag.type);
        });
        appliedTagsContainer.appendChild(span);
    });
};

const removeFilter = (type) => {
    if (type === 'category') {
        const radio = document.querySelector('input[name="category"][value=""]');
        if (radio) radio.checked = true;
    } else if (type === 'price') {
        const radio = document.querySelector('input[name="price-range"][value=""]');
        if (radio) radio.checked = true;
    } else if (type === 'rating') {
        const radio = document.querySelector('input[name="rating-min"][value="0"]');
        if (radio) radio.checked = true;
    } else if (type === 'search') {
        inputSearch.value = '';
    }
    applyFiltersAndRender();
};

/**
 * 3. Renderizado de Productos con Paginación
 */
const renderCurrentPage = () => {
    productsGrid.textContent = '';

    const total = filteredProducts.length;
    showingCountEl.textContent = total;
    totalCountEl.textContent = allProducts.length;

    if (total === 0) {
        showFeedback(true);
        updatePaginationControls(0, 1);
        return;
    }

    showFeedback(false);

    const totalPages = Math.ceil(total / ITEMS_PER_PAGE);
    if (currentPage > totalPages) currentPage = totalPages;

    const startIdx = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIdx = Math.min(startIdx + ITEMS_PER_PAGE, total);
    const pageItems = filteredProducts.slice(startIdx, endIdx);

    showingCountEl.textContent = `${pageItems.length}`;

    const fragment = document.createDocumentFragment();

    pageItems.forEach((product) => {
        const clone = templateProduct.cloneNode(true);

        // Imagen
        const img = clone.querySelector('img');
        img.src = product.image;
        img.alt = product.title;

        // Badge de Calificación
        clone.querySelector('.rate-num').textContent = product.rating ? product.rating.rate : '4.5';

        // Título
        clone.querySelector('.product-title').textContent = product.title;

        // Precios (precio real y precio anterior tachado para dar estilo de catálogo con descuento)
        clone.querySelector('.product-price').textContent = `$${Math.round(product.price)}`;
        clone.querySelector('.product-price-old').textContent = `$${Math.round(product.price * 1.35)}`;

        // Subtítulo
        clone.querySelector('.product-subtitle').textContent = `${formatCategoryName(product.category)} • 2 Colors`;

        // Evento al hacer click en la tarjeta para abrir el modal
        const card = clone.querySelector('.product-card');
        card.addEventListener('click', () => {
            openProductDetails(product);
        });

        fragment.appendChild(clone);
    });

    productsGrid.appendChild(fragment);
    updatePaginationControls(total, totalPages);
};

/**
 * Controles de Paginación
 */
const updatePaginationControls = (totalItems, totalPages) => {
    paginationNumbers.textContent = '';

    if (totalPages <= 1) {
        btnPagePrev.disabled = true;
        btnPageNext.disabled = true;
        return;
    }

    btnPagePrev.disabled = currentPage <= 1;
    btnPageNext.disabled = currentPage >= totalPages;

    for (let i = 1; i <= totalPages; i++) {
        const btn = document.createElement('button');
        btn.className = `page-btn ${i === currentPage ? 'active' : ''}`;
        btn.textContent = i;
        btn.addEventListener('click', () => {
            currentPage = i;
            renderCurrentPage();
            window.scrollTo({ top: 120, behavior: 'smooth' });
        });
        paginationNumbers.appendChild(btn);
    }
};

const formatCategoryName = (cat) => {
    switch (cat) {
        case "women's clothing": return "Women";
        case "men's clothing": return "Men";
        case "jewelery": return "Jewelery";
        case "electronics": return "Electronics";
        default: return cat;
    }
};

/**
 * 4. Modal de Detalles de Producto
 */
const openProductDetails = (product) => {
    selectedProduct = product;
    modalImg.src = product.image;
    modalImg.alt = product.title;
    modalTag.textContent = formatCategoryName(product.category).toUpperCase();
    modalTitle.textContent = product.title;
    modalRating.textContent = `★ ${product.rating?.rate || '4.5'} / 5.0 (${product.rating?.count || 120} reviews)`;
    modalPrice.textContent = `$${product.price.toFixed(2)} USD`;
    modalDesc.textContent = product.description;

    modalDetails.classList.remove('d-none');
};

const closeModal = () => {
    modalDetails.classList.add('d-none');
    selectedProduct = null;
};

const showFeedback = (show) => {
    if (show) {
        feedbackMessage.classList.remove('d-none');
    } else {
        feedbackMessage.classList.add('d-none');
    }
};

// Eventos de Navegación de Categorías Superiores
navLinkBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        const categoryVal = btn.getAttribute('data-category');
        const targetRadio = document.querySelector(`input[name="category"][value="${categoryVal}"]`);
        if (targetRadio) {
            targetRadio.checked = true;
            applyFiltersAndRender();
        }
    });
});

// Eventos de Búsqueda
inputSearch.addEventListener('input', () => {
    applyFiltersAndRender();
});

// Eventos de Radio Buttons de la Barra Lateral
document.querySelectorAll('input[name="category"]').forEach(r => {
    r.addEventListener('change', applyFiltersAndRender);
});

document.querySelectorAll('input[name="price-range"]').forEach(r => {
    r.addEventListener('change', applyFiltersAndRender);
});

document.querySelectorAll('input[name="rating-min"]').forEach(r => {
    r.addEventListener('change', applyFiltersAndRender);
});

// Ordenación
selectSort.addEventListener('change', applyFiltersAndRender);

// Limpiar Filtros
btnClearAll.addEventListener('click', () => {
    inputSearch.value = '';
    const defCat = document.querySelector('input[name="category"][value=""]');
    if (defCat) defCat.checked = true;
    const defPrice = document.querySelector('input[name="price-range"][value=""]');
    if (defPrice) defPrice.checked = true;
    const defRating = document.querySelector('input[name="rating-min"][value="0"]');
    if (defRating) defRating.checked = true;
    selectSort.value = 'popularity';
    applyFiltersAndRender();
});

// Botones de Paginación Anterior / Siguiente
btnPagePrev.addEventListener('click', () => {
    if (currentPage > 1) {
        currentPage--;
        renderCurrentPage();
        window.scrollTo({ top: 120, behavior: 'smooth' });
    }
});

btnPageNext.addEventListener('click', () => {
    const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE);
    if (currentPage < totalPages) {
        currentPage++;
        renderCurrentPage();
        window.scrollTo({ top: 120, behavior: 'smooth' });
    }
});

// Eventos del Modal
btnCloseModal.addEventListener('click', closeModal);

modalDetails.addEventListener('click', (e) => {
    if (e.target === modalDetails) {
        closeModal();
    }
});

// Añadir a la Bolsa y Notificación de Electron
btnModalNotify.addEventListener('click', () => {
    if (selectedProduct) {
        cartItemsCount++;
        cartBadge.textContent = cartItemsCount;

        if (window.electronAPI && window.electronAPI.showNotification) {
            window.electronAPI.showNotification(
                'NOSTRA Shopping Bag',
                `"${selectedProduct.title}" has been added to your bag ($${selectedProduct.price.toFixed(2)} USD).`
            );
        }

        closeModal();
    }
});

// Teclado Escape
window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        if (!modalDetails.classList.contains('d-none')) {
            closeModal();
        } else if (document.activeElement === inputSearch) {
            inputSearch.value = '';
            applyFiltersAndRender();
            inputSearch.blur();
        }
    }
});

// Iniciar aplicación
fetchProducts();
