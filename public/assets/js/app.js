const API_BASE = "/api";

const state = {
  catalogPage: 1,
  hasMoreCatalog: false,
  lastQuery: {},
};

function $(selector, scope = document) {
  return scope.querySelector(selector);
}
function $$(selector, scope = document) {
  return Array.from(scope.querySelectorAll(selector));
}
function formatCurrency(value) {
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(Number(value || 0));
}
function formatDate(value) {
  if (!value) return "-";
  const d = new Date(value);
  return new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium", timeStyle: "short" }).format(d);
}

function paymentMethodLabel(value) {
  return {
    cod: "Tiền mặt khi nhận hàng",
    bank_transfer: "Chuyển khoản ngân hàng",
    momo: "Ví MoMo",
  }[value] || value || "-";
}
function paymentStatusLabel(value) {
  return {
    pending: "Chờ thu tiền",
    awaiting_confirmation: "Chờ xác nhận chuyển khoản",
    paid: "Đã thanh toán",
    refunded: "Đã hoàn tiền",
  }[value] || value || "-";
}
function orderStatusLabel(value) {
  return {
    new: "Mới tạo",
    confirmed: "Đã xác nhận",
    processing: "Đang xử lý",
    shipping: "Đang giao",
    completed: "Hoàn tất",
    cancelled: "Đã hủy",
  }[value] || value || "-";
}
function bookingStatusLabel(value) {
  return {
    pending: "Chờ tiếp nhận",
    inspecting: "Đang kiểm tra",
    fixing: "Đang sửa chữa",
    ready: "Sẵn sàng bàn giao",
    completed: "Đã hoàn tất",
    cancelled: "Đã hủy",
  }[value] || value || "-";
}
function getRatingText(value) {
  return {
    1: "1 sao - Chưa hài lòng",
    2: "2 sao - Cần cải thiện",
    3: "3 sao - Tạm ổn",
    4: "4 sao - Hài lòng",
    5: "5 sao - Rất hài lòng",
  }[value] || "5 sao - Rất hài lòng";
}
function renderPaymentInstructions(info) {
  if (!info) return "";
  const title = info.type === "bank_transfer" ? "Hướng dẫn chuyển khoản ngân hàng" : "Hướng dẫn thanh toán ví MoMo";
  const accountLabel = info.type === "bank_transfer" ? "Số tài khoản" : "Số điện thoại ví";
  const accountValue = info.type === "bank_transfer" ? info.accountNumber : info.phoneNumber;
  const nameLabel = info.type === "bank_transfer" ? "Tên tài khoản" : "Tên ví";
  const nameValue = info.type === "bank_transfer" ? info.accountName : info.walletName;
  const bankLine = info.type === "bank_transfer" ? `<div class="payment-detail-item"><span>Ngân hàng</span><strong>${info.bankName}</strong></div>` : "";
  return `
    <div class="payment-info-grid">
      <div>
        <span class="section-tag">${title}</span>
        <div class="payment-detail-list">
          ${bankLine}
          <div class="payment-detail-item"><span>${nameLabel}</span><strong>${nameValue}</strong></div>
          <div class="payment-detail-item"><span>${accountLabel}</span><strong>${accountValue}</strong></div>
          <div class="payment-detail-item"><span>Nội dung</span><strong>${info.content}</strong></div>
        </div>
        <p class="muted mt-12">${info.note || ""}</p>
      </div>
      <div class="payment-qr-card center">
        <img src="${info.qrImage}" alt="QR thanh toán" />
        <strong>Quét mã để thanh toán nhanh</strong>
        <div class="muted mt-8">Mã QR dùng để khách chuyển khoản và cửa hàng đối soát đơn hàng.</div>
      </div>
    </div>
  `;
}
function slugify(text) {
  return String(text || "")
    .normalize("NFD")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\+/g, " plus ")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
function getCart() {
  return JSON.parse(localStorage.getItem("fixbuy_cart") || "[]");
}
function setCart(cart) {
  localStorage.setItem("fixbuy_cart", JSON.stringify(cart));
  updateCartBadge();
}
function updateCartBadge() {
  const total = getCart().reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  const el = $("#cartCount");
  if (el) el.textContent = total;
}
function toast(message, type = "info") {
  const wrap = $("#toastWrap");
  if (!wrap) return;
  const item = document.createElement("div");
  item.className = `toast ${type}`;
  item.innerHTML = `<strong>${type === "error" ? "Có lỗi" : type === "success" ? "Thành công" : "Thông báo"}</strong><div class="mt-8">${message}</div>`;
  wrap.appendChild(item);
  setTimeout(() => {
    item.style.opacity = "0";
    item.style.transform = "translateY(6px)";
    setTimeout(() => item.remove(), 240);
  }, 3400);
}
async function api(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });

  let data = null;
  try {
    data = await response.json();
  } catch (_) {
    data = null;
  }

  if (!response.ok) {
    throw new Error(data?.message || "Yêu cầu thất bại.");
  }
  return data;
}
function productBadge(type) {
  if (type === "phone") return `<span class="badge blue">Điện thoại</span>`;
  if (type === "accessory") return `<span class="badge orange">Phụ kiện / linh kiện</span>`;
  return `<span class="badge green">Dịch vụ</span>`;
}
function stockBadge(product) {
  if (product.type === "service") return `<span class="badge green">Nhận lịch liên tục</span>`;
  if (product.stock <= 0) return `<span class="badge red">Hết hàng</span>`;
  if (product.stock <= 10) return `<span class="badge orange">Sắp hết • ${product.stock}</span>`;
  return `<span class="badge green">Còn ${product.stock}</span>`;
}
function defaultProductImage(productOrType = "phone") {
  const type = typeof productOrType === "string" ? productOrType : productOrType?.type;
  if (type === "service") return "/assets/products/photos/thay-man-hinh-oled-cao-cap.jpg";
  if (type === "accessory") return "/assets/products/photos/cu-sac-gan-65w-3-cong.jpg";
  return "/assets/products/photos/iphone-16-pro-max.jpg";
}
function productImage(product) {
  const firstImage = product?.images?.find(Boolean);
  if (firstImage && (/^https?:\/\//.test(firstImage) || firstImage.startsWith("/uploads/") || firstImage.includes("/uploads/"))) {
    return firstImage;
  }
  if (product?.slug) return `/assets/products/photos/${product.slug}.jpg`;
  if (firstImage) return firstImage;
  return defaultProductImage(product);
}
function imageFallbackAttr(productOrType = "phone") {
  return `onerror="this.onerror=null;this.src='${defaultProductImage(productOrType)}'"`;
}
function renderProductCard(product) {
  const compare = Number(product.comparePrice || 0) > Number(product.price || 0)
    ? `<del>${formatCurrency(product.comparePrice)}</del>`
    : "";
  const discountPercent = Number(product.comparePrice || 0) > Number(product.price || 0)
    ? Math.round((1 - product.price / product.comparePrice) * 100)
    : 0;
  return `
    <article class="product-card">
      <a class="cover" href="/detail.html?slug=${product.slug}">
        <img src="${productImage(product)}" alt="${product.name}" ${imageFallbackAttr(product)} />
        <div class="top-tags">
          ${product.featured ? '<span class="badge blue">Nổi bật</span>' : '<span></span>'}
          ${discountPercent > 0 ? `<span class="badge red">-${discountPercent}%</span>` : ""}
        </div>
        <div class="cover-title">
          <strong>${product.name}</strong>
          <span>${formatCurrency(product.price)}</span>
        </div>
      </a>
      <div class="body">
        <div class="meta">
          ${productBadge(product.type)}
          <span>${product.brand}</span>
          <span>Đánh giá ${Number(product.rating || 0).toFixed(1)} / 5 • ${(product.reviewCount || 0)} lượt</span>
        </div>
        <h3><a href="/detail.html?slug=${product.slug}">${product.name}</a></h3>
        <p class="muted">${product.shortDescription || product.description || ""}</p>
        <div class="price-row">
          <div>
            <strong>${formatCurrency(product.price)}</strong>
            ${compare}
          </div>
          ${stockBadge(product)}
        </div>
        <div class="card-actions">
          <button class="btn btn-primary add-cart-btn" data-id="${product._id}" type="button">${product.type === "service" ? "Đặt kèm dịch vụ" : "Thêm vào giỏ"}</button>
          <a class="icon-btn" href="/detail.html?slug=${product.slug}" title="Xem chi tiết">→</a>
        </div>
      </div>
    </article>
  `;
}
function renderShowcaseCards(items) {
  return items.map((product) => `
    <a class="showcase-card" href="/detail.html?slug=${product.slug}">
      <img src="${productImage(product)}" alt="${product.name}" ${imageFallbackAttr(product)} />
      <div>
        <strong>${product.name}</strong>
        <span>${product.brand} • ${product.type === "phone" ? "Smartphone" : "Linh kiện"}</span>
      </div>
    </a>
  `).join("");
}

function attachAddToCart(scope = document) {
  $$(".add-cart-btn", scope).forEach((button) => {
    button.addEventListener("click", async () => {
      try {
        const product = await api(`/products/${button.dataset.id}`);
        addToCart(product, 1);
      } catch (error) {
        toast(error.message, "error");
      }
    });
  });
}
function addToCart(product, quantity = 1) {
  const cart = getCart();
  const existing = cart.find((item) => item.productId === product._id);
  if (existing) {
    existing.quantity += quantity;
  } else {
    cart.push({
      productId: product._id,
      name: product.name,
      slug: product.slug,
      type: product.type,
      image: productImage(product),
      price: product.price,
      quantity,
      brand: product.brand,
    });
  }
  setCart(cart);
  toast(`Đã thêm "${product.name}" vào giỏ hàng.`, "success");
}
function setActiveNav() {
  const page = document.body.dataset.page;
  $$("[data-nav]").forEach((link) => {
    if (link.dataset.nav === page) link.classList.add("active");
  });
}

async function loadHome() {
  const [meta, featuredPhones, featuredAccessories, services, showcasePhones, showcaseAccessories] = await Promise.all([
    api("/products/meta/site"),
    api("/products?type=phone&featured=true&limit=8"),
    api("/products?type=accessory&featured=true&limit=8"),
    api("/products?type=service&featured=true&limit=8"),
    api("/products?type=phone&sort=rating&limit=14"),
    api("/products?type=accessory&sort=rating&limit=14"),
  ]);

  $("#statPhones").textContent = meta.counts.phoneCount;
  $("#statAccessories").textContent = meta.counts.accessoryCount;
  $("#statServices").textContent = meta.counts.serviceCount;

  $("#featuredPhones").innerHTML = featuredPhones.items.map(renderProductCard).join("");
  $("#featuredAccessories").innerHTML = featuredAccessories.items.map(renderProductCard).join("");
  $("#serviceGrid").innerHTML = services.items.map((product) => `
    <article class="service-card">
      <div class="meta">
        ${productBadge(product.type)}
        <span>Đánh giá ${Number(product.rating || 0).toFixed(1)} / 5 • ${(product.reviewCount || 0)} lượt</span>
      </div>
      <h3>${product.name}</h3>
      <p class="muted">${product.description}</p>
      <ul>
        ${Object.entries(product.specs || {}).slice(0,4).map(([key,val]) => `<li><strong>${key}:</strong> ${val}</li>`).join("")}
      </ul>
      <div class="price-row">
        <strong>${formatCurrency(product.price)}</strong>
        <span class="badge green">Có bảo hành</span>
      </div>
      <div class="card-actions">
        <button class="btn btn-primary add-cart-btn" data-id="${product._id}" type="button">Thêm vào giỏ</button>
        <a class="icon-btn" href="/booking.html" title="Đặt lịch">→</a>
      </div>
    </article>
  `).join("");
  $("#testimonialGrid").innerHTML = meta.testimonials.map((item) => `
    <article class="testimonial-card">
      <div class="rating-stars">${"★".repeat(Math.round(item.rating || 5))}</div>
      <p>${item.comment}</p>
      <div class="author"><strong>${item.name}</strong><span>${item.role}</span></div>
    </article>
  `).join("");

  const showcaseA = document.getElementById("showcaseTrackA");
  const showcaseB = document.getElementById("showcaseTrackB");
  if (showcaseA && showcaseB) {
    const phones = showcasePhones.items || [];
    const accessories = showcaseAccessories.items || [];
    showcaseA.innerHTML = `<div class="showcase-row-inner">${renderShowcaseCards([...phones, ...phones])}</div>`;
    showcaseB.innerHTML = `<div class="showcase-row-inner">${renderShowcaseCards([...accessories, ...accessories])}</div>`;
  }

  attachAddToCart();
}

async function loadCatalog(reset = true) {
  const grid = $("#catalogGrid");
  const loadMoreBtn = $("#loadMoreBtn");
  if (!grid) return;

  const query = {
    search: $("#searchInput")?.value?.trim() || "",
    type: $("#typeFilter")?.value || "all",
    brand: $("#brandFilter")?.value || "all",
    minPrice: $("#minPrice")?.value || "",
    maxPrice: $("#maxPrice")?.value || "",
    sort: $("#sortFilter")?.value || "featured",
    page: state.catalogPage,
    limit: 12,
  };

  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value !== "" && value !== undefined && value !== null) params.set(key, value);
  });

  const data = await api(`/products?${params.toString()}`);
  const html = data.items.map(renderProductCard).join("");
  if (reset) {
    grid.innerHTML = html || `<div class="empty-state"><h3>Không tìm thấy sản phẩm phù hợp</h3><p>Hãy thử giảm bớt điều kiện lọc hoặc đổi từ khóa tìm kiếm.</p></div>`;
  } else {
    grid.insertAdjacentHTML("beforeend", html);
  }

  $("#catalogTitle").textContent = `Tìm thấy ${data.pagination.total} sản phẩm`;
  state.hasMoreCatalog = data.pagination.page < data.pagination.pages;
  loadMoreBtn.classList.toggle("hidden", !state.hasMoreCatalog);
  attachAddToCart(grid);
}

async function setupCatalog() {
  const meta = await api("/products/meta/site");
  const brandFilter = $("#brandFilter");
  const chipsWrap = $("#quickBrandChips");

  brandFilter.innerHTML = `<option value="all">Tất cả hãng</option>` +
    meta.brands.sort().map((brand) => `<option value="${brand}">${brand}</option>`).join("");

  chipsWrap.innerHTML = meta.brands.slice(0, 12).map((brand) => `<button class="chip" data-brand="${brand}" type="button">${brand}</button>`).join("");

  const url = new URL(window.location.href);
  const initialType = url.searchParams.get("type");
  if (initialType && $("#typeFilter")) $("#typeFilter").value = initialType;

  const runReset = async () => {
    state.catalogPage = 1;
    await loadCatalog(true);
  };

  ["searchInput", "typeFilter", "brandFilter", "sortFilter", "minPrice", "maxPrice"].forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    const eventName = el.tagName === "INPUT" ? "input" : "change";
    el.addEventListener(eventName, () => {
      if (id === "searchInput") {
        clearTimeout(el._debounce);
        el._debounce = setTimeout(runReset, 250);
      } else {
        runReset();
      }
    });
  });

  chipsWrap.addEventListener("click", (event) => {
    const chip = event.target.closest("[data-brand]");
    if (!chip) return;
    $("#brandFilter").value = chip.dataset.brand;
    runReset();
    $$(".chip", chipsWrap).forEach((item) => item.classList.toggle("active", item === chip));
  });

  $("#clearFiltersBtn")?.addEventListener("click", () => {
    $("#searchInput").value = "";
    $("#typeFilter").value = "all";
    $("#brandFilter").value = "all";
    $("#minPrice").value = "";
    $("#maxPrice").value = "";
    $("#sortFilter").value = "featured";
    $$(".chip", chipsWrap).forEach((chip) => chip.classList.remove("active"));
    runReset();
  });

  $("#loadMoreBtn")?.addEventListener("click", async () => {
    state.catalogPage += 1;
    await loadCatalog(false);
  });

  await runReset();
}

function cartTotals(cart) {
  const subtotal = cart.reduce((sum, item) => sum + Number(item.price) * Number(item.quantity), 0);
  const shippingFee = subtotal > 1500000 ? 0 : cart.length ? 30000 : 0;
  return {
    subtotal,
    shippingFee,
    total: subtotal + shippingFee,
  };
}

function renderCartSummary(cart) {
  const totals = cartTotals(cart);
  return `
    ${cart.map((item) => `
      <div class="summary-row">
        <span>${item.name} × ${item.quantity}</span>
        <strong>${formatCurrency(item.price * item.quantity)}</strong>
      </div>
    `).join("")}
    <div class="summary-row"><span>Tạm tính</span><strong>${formatCurrency(totals.subtotal)}</strong></div>
    <div class="summary-row"><span>Phí giao hàng</span><strong>${formatCurrency(totals.shippingFee)}</strong></div>
    <div class="summary-row total"><span>Tổng cộng</span><strong>${formatCurrency(totals.total)}</strong></div>
  `;
}

function loadCartPage() {
  const cart = getCart();
  const itemsWrap = $("#cartItems");
  const summaryWrap = $("#cartSummary");
  if (!itemsWrap || !summaryWrap) return;

  if (!cart.length) {
    itemsWrap.innerHTML = `<div class="empty-state"><h3>Giỏ hàng đang trống</h3><p>Bạn hãy quay lại danh mục để thêm điện thoại, phụ kiện hoặc dịch vụ sửa chữa.</p></div>`;
    summaryWrap.innerHTML = `<div class="summary-row total"><span>Tổng cộng</span><strong>${formatCurrency(0)}</strong></div>`;
    return;
  }

  itemsWrap.innerHTML = cart.map((item) => `
    <article class="cart-item">
      <img src="${item.image || defaultProductImage(item.type)}" alt="${item.name}" ${imageFallbackAttr(item.type)} />
      <div>
        <div class="meta">${productBadge(item.type)} <span>${item.brand || ""}</span></div>
        <h3><a href="/detail.html?slug=${item.slug}">${item.name}</a></h3>
        <p>Giá bán: <strong>${formatCurrency(item.price)}</strong></p>
        <div class="qty-box">
          <div class="qty-control">
            <button type="button" data-action="minus" data-id="${item.productId}">-</button>
            <input value="${item.quantity}" readonly />
            <button type="button" data-action="plus" data-id="${item.productId}">+</button>
          </div>
          <button class="btn btn-secondary" type="button" data-action="remove" data-id="${item.productId}">Xóa</button>
        </div>
      </div>
      <div class="price-stack">
        <span class="badge gray">Thành tiền</span>
        <strong>${formatCurrency(item.price * item.quantity)}</strong>
      </div>
    </article>
  `).join("");

  summaryWrap.innerHTML = renderCartSummary(cart);

  itemsWrap.addEventListener("click", (event) => {
    const actionEl = event.target.closest("[data-action]");
    if (!actionEl) return;
    const action = actionEl.dataset.action;
    const id = actionEl.dataset.id;
    let cartData = getCart();
    const item = cartData.find((entry) => entry.productId === id);
    if (!item) return;

    if (action === "plus") item.quantity += 1;
    if (action === "minus") item.quantity = Math.max(1, item.quantity - 1);
    if (action === "remove") cartData = cartData.filter((entry) => entry.productId !== id);

    setCart(cartData);
    loadCartPage();
  }, { once: true });
}

async function loadDetailPage() {
  const slug = new URL(window.location.href).searchParams.get("slug");
  if (!slug) {
    window.location.href = "/catalog.html";
    return;
  }
  const data = await api(`/products/slug/${slug}`);
  const reviews = await api(`/reviews?productId=${data.product._id}`);
  const product = data.product;

  $("#detailImage").src = productImage(product);
  $("#detailImage").alt = product.name;
  $("#detailImage").onerror = () => {
    $("#detailImage").onerror = null;
    $("#detailImage").src = defaultProductImage(product);
  };
  const galleryImages = (product.images || []).filter(Boolean);
  const thumbWrap = $("#detailThumbs");
  if (thumbWrap) {
    thumbWrap.innerHTML = galleryImages.map((image, index) => `
      <button class="gallery-thumb ${index === 0 ? "active" : ""}" type="button" data-image="${image}">
        <img src="${image}" alt="${product.name} ${index + 1}" ${imageFallbackAttr(product)} />
      </button>
    `).join("");
    thumbWrap.addEventListener("click", (event) => {
      const button = event.target.closest("[data-image]");
      if (!button) return;
      $("#detailImage").src = button.dataset.image;
      $$(".gallery-thumb", thumbWrap).forEach((item) => item.classList.toggle("active", item === button));
    });
  }
  $("#detailMeta").innerHTML = `
    <div class="meta">
      ${productBadge(product.type)}
      <span>${product.brand}</span>
      <span>${product.category}</span>
      <span>Đánh giá ${Number(data.ratingSummary.average || product.rating || 0).toFixed(1)} / 5 (${data.ratingSummary.count || product.reviewCount || 0} lượt)</span>
    </div>
    <h1>${product.name}</h1>
    <p class="intro">${product.description}</p>
    <div class="price-row">
      <div>
        <strong>${formatCurrency(product.price)}</strong>
        ${Number(product.comparePrice || 0) > Number(product.price || 0) ? `<del>${formatCurrency(product.comparePrice)}</del>` : ""}
      </div>
      ${stockBadge(product)}
    </div>
    <div class="qty-box">
      <div class="qty-control">
        <button type="button" id="detailMinusBtn">-</button>
        <input id="detailQtyInput" value="1" readonly />
        <button type="button" id="detailPlusBtn">+</button>
      </div>
      <button class="btn btn-primary" id="detailAddCartBtn" type="button">${product.type === "service" ? "Đặt kèm dịch vụ" : "Thêm vào giỏ"}</button>
      ${product.type !== "service" ? `<a class="btn btn-secondary" href="/checkout.html">Mua nhanh</a>` : `<a class="btn btn-secondary" href="/booking.html">Đặt lịch riêng</a>`}
    </div>
  `;
  $("#detailDescription").innerHTML = `
    <p class="muted">${product.shortDescription || ""}</p>
    <div class="chips mt-16">${(product.tags || []).map((tag) => `<span class="chip">${tag}</span>`).join("")}</div>
  `;
  $("#specGrid").innerHTML = Object.entries(product.specs || {}).map(([key, value]) => `
    <div class="spec-item">
      <span>${key}</span>
      <strong>${value}</strong>
    </div>
  `).join("");
  const ratingAverage = Number(data.ratingSummary.average || product.rating || 0).toFixed(1);
  const totalReviews = reviews.length || data.ratingSummary.count || product.reviewCount || 0;
  const ratingCounts = [5,4,3,2,1].map((score) => ({
    score,
    count: reviews.filter((review) => Number(review.rating) === score).length,
  }));
  $("#reviewSummary").innerHTML = `
    <div class="summary-card-grid">
      <div class="summary-card">
        <span class="section-tag">Điểm trung bình</span>
        <h3>${ratingAverage} / 5</h3>
        <div class="rating-stars">${"★".repeat(Math.round(Number(ratingAverage || 0)))}</div>
      </div>
      <div class="summary-card">
        <span class="section-tag">Tổng đánh giá</span>
        <h3>${totalReviews}</h3>
        <div class="muted">Đã hiển thị công khai trên trang sản phẩm</div>
      </div>
    </div>
  `;
  $("#reviewBreakdown").innerHTML = ratingCounts.map((item) => {
    const percent = totalReviews ? Math.round(item.count / totalReviews * 100) : 0;
    return `
      <div class="review-bar">
        <strong>${item.score} sao</strong>
        <div class="review-bar-track"><div class="review-bar-fill" style="width:${percent}%"></div></div>
        <span class="muted">${item.count}</span>
      </div>
    `;
  }).join("");
  $("#reviewList").innerHTML = reviews.length ? reviews.map((review) => `
    <article class="review-item">
      <h4>${review.title || "Đánh giá từ khách hàng"} • ${"★".repeat(Math.round(review.rating))}</h4>
      <small>${review.customerName} • ${formatDate(review.createdAt)}</small>
      <p>${review.comment}</p>
    </article>
  `).join("") : `<div class="empty-state"><h3>Chưa có review nào</h3><p>Hãy là người đầu tiên để lại cảm nhận cho sản phẩm này.</p></div>`;
  $("#relatedGrid").innerHTML = data.related.map(renderProductCard).join("");

  let qty = 1;
  const qtyInput = $("#detailQtyInput");
  $("#detailMinusBtn").addEventListener("click", () => {
    qty = Math.max(1, qty - 1);
    qtyInput.value = qty;
  });
  $("#detailPlusBtn").addEventListener("click", () => {
    qty += 1;
    qtyInput.value = qty;
  });
  $("#detailAddCartBtn").addEventListener("click", () => addToCart(product, qty));
  attachAddToCart($("#relatedGrid"));

  const ratingInput = $('#reviewForm [name="rating"]');
  const ratingText = $("#ratingText");
  $$("#ratingPicker [data-rate]").forEach((button) => {
    button.addEventListener("click", () => {
      const value = Number(button.dataset.rate);
      ratingInput.value = value;
      ratingText.textContent = getRatingText(value);
      $$("#ratingPicker [data-rate]").forEach((item) => {
        item.classList.toggle("active", Number(item.dataset.rate) === value);
        item.classList.toggle("is-on", Number(item.dataset.rate) <= value);
      });
    });
  });
  $$("#ratingPicker [data-rate]").forEach((item) => item.classList.toggle("is-on", Number(item.dataset.rate) <= 5));

  $("#reviewForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      await api("/reviews", {
        method: "POST",
        body: JSON.stringify({
          productId: product._id,
          customerName: form.get("customerName"),
          customerEmail: form.get("customerEmail"),
          rating: Number(form.get("rating")),
          title: form.get("title"),
          comment: form.get("comment"),
        }),
      });
      toast("Gửi đánh giá thành công.", "success");
      event.currentTarget.reset();
      if (ratingInput) ratingInput.value = 5;
      await loadDetailPage();
    } catch (error) {
      toast(error.message, "error");
    }
  });
}

function renderCheckoutSummary(paymentMethod = "cod") {
  const cart = getCart();
  const wrap = $("#checkoutSummary");
  if (!wrap) return;
  if (!cart.length) {
    wrap.innerHTML = `<div class="empty-state"><h3>Không có sản phẩm để thanh toán</h3><p>Giỏ hàng trống nên bạn chưa thể thanh toán.</p></div>`;
    return;
  }
  const bankPreview = paymentMethod === "bank_transfer"
    ? renderPaymentInstructions({
        type: "bank_transfer",
        bankName: "MB Bank",
        accountName: "FIX AND BUY SMARTPHONE",
        accountNumber: "0396351501",
        content: "FIXBUY <Mã đơn>",
        qrImage: "/assets/products/payment-qr-bank.svg",
        note: "Sau khi tạo đơn, hệ thống sẽ cấp nội dung chuyển khoản theo mã đơn để admin đối soát nhanh.",
      })
    : paymentMethod === "momo"
      ? renderPaymentInstructions({
          type: "momo",
          walletName: "MoMo",
          phoneNumber: "0396351501",
          content: "FIXBUY <Mã đơn>",
          qrImage: "/assets/products/payment-qr-bank.svg",
          note: "Ví MoMo giúp khách thanh toán nhanh bằng QR và cửa hàng đối soát đơn.",
        })
      : "";
  wrap.innerHTML = renderCartSummary(cart) + bankPreview;
}

async function setupCheckout() {
  const cart = getCart();
  if (!cart.length) {
    toast("Giỏ hàng đang trống.", "error");
    $("#checkoutForm").classList.add("hidden");
    renderCheckoutSummary();
    return;
  }
  const methodInputs = $$('input[name="paymentMethod"]');
  const methodInfo = $("#paymentMethodInfo");
  const renderMethodInfo = (method) => {
    if (!methodInfo) return;
    if (method === "bank_transfer") {
      methodInfo.innerHTML = renderPaymentInstructions({
        type: "bank_transfer",
        bankName: "MB Bank",
        accountName: "FIX AND BUY SMARTPHONE",
        accountNumber: "0396351501",
        content: "FIXBUY <Mã đơn>",
        qrImage: "/assets/products/payment-qr-bank.svg",
        note: "Sau khi bấm đặt hàng, hệ thống trả về mã đơn và nội dung chuyển khoản riêng theo mã đó.",
      });
    } else if (method === "momo") {
      methodInfo.innerHTML = renderPaymentInstructions({
        type: "momo",
        walletName: "MoMo",
        phoneNumber: "0396351501",
        content: "FIXBUY <Mã đơn>",
        qrImage: "/assets/products/payment-qr-bank.svg",
        note: "Mã QR giúp khách thanh toán nhanh và đúng nội dung đơn hàng.",
      });
    } else {
      methodInfo.innerHTML = `<div class="payment-info-grid"><div><span class="section-tag">Thanh toán tiền mặt khi nhận hàng</span><h3>Khách thanh toán trực tiếp khi nhận hàng</h3><p class="muted">Phù hợp với đơn cần kiểm tra hàng trước khi thanh toán. Admin vẫn có thể chuyển trạng thái đơn và trạng thái thu tiền trong khu quản trị.</p></div><div class="payment-qr-card center"><strong>Không cần chuyển khoản trước</strong><div class="muted mt-8">Khách nhận hàng rồi thanh toán cho đơn vị giao nhận hoặc cửa hàng.</div></div></div>`;
    }
    renderCheckoutSummary(method);
  };
  const currentMethod = methodInputs.find((input) => input.checked)?.value || "cod";
  renderMethodInfo(currentMethod);
  methodInputs.forEach((input) => input.addEventListener("change", () => renderMethodInfo(input.value)));

  $("#checkoutForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const payload = {
      customer: {
        name: form.get("fullName"),
        email: form.get("email"),
        phone: form.get("phone"),
      },
      shippingAddress: {
        fullName: form.get("fullName"),
        phone: form.get("phone"),
        city: form.get("city"),
        district: form.get("district"),
        ward: form.get("ward"),
        addressLine: form.get("addressLine"),
        note: form.get("note"),
      },
      paymentMethod: form.get("paymentMethod"),
      paymentMeta: {
        payerName: form.get("fullName"),
        transferNote: form.get("note") || "",
      },
      items: cart.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
      })),
    };

    try {
      const data = await api("/orders", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      localStorage.removeItem("fixbuy_cart");
      updateCartBadge();
      const paymentNote = data.paymentInstructions ? ` Nội dung thanh toán: ${data.paymentInstructions.content}.` : "";
      toast(`Đặt hàng thành công. Mã đơn của bạn là ${data.orderCode}.${paymentNote}`, "success");
      window.location.href = `/tracking.html?orderCode=${data.orderCode}`;
    } catch (error) {
      toast(error.message, "error");
    }
  });
}

async function setupBooking() {
  const services = await api("/products?type=service&featured=true&limit=8");
  $("#bookingServiceGrid").innerHTML = services.items.map((product) => `
    <article class="service-card">
      <div class="meta">${productBadge(product.type)}</div>
      <h3>${product.name}</h3>
      <p class="muted">${product.description}</p>
      <div class="price-row">
        <strong>${formatCurrency(product.price)}</strong>
        <button class="btn btn-soft add-cart-btn" data-id="${product._id}" type="button">Thêm vào giỏ</button>
      </div>
    </article>
  `).join("");
  attachAddToCart($("#bookingServiceGrid"));

  $("#bookingForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      const data = await api("/bookings", {
        method: "POST",
        body: JSON.stringify(Object.fromEntries(form.entries())),
      });
      toast(`Đã tạo phiếu sửa ${data.bookingCode}.`, "success");
      event.currentTarget.reset();
      window.location.href = `/tracking.html?bookingCode=${data.bookingCode}`;
    } catch (error) {
      toast(error.message, "error");
    }
  });
}

function renderOrderCard(order) {
  const paymentAlert = order.paymentInstructions && order.paymentStatus === "awaiting_confirmation"
    ? `<div class="order-alert"><strong>Đơn đang chờ xác nhận thanh toán.</strong><div class="muted mt-8">${paymentMethodLabel(order.paymentMethod)} • nội dung chuyển khoản: <strong>${order.paymentInstructions.content}</strong></div></div>`
    : "";
  return `
    <article class="track-card">
      <div class="section-head">
        <div>
          <span class="section-tag">Đơn hàng ${order.orderCode}</span>
          <h2 class="mt-8">${order.customer?.name || order.shippingAddress?.fullName || "Khách hàng"}</h2>
        </div>
        <div class="text-right">
          <div class="badge blue">${orderStatusLabel(order.orderStatus)}</div>
          <div class="muted mt-8">${formatDate(order.createdAt)}</div>
        </div>
      </div>
      <div class="inline-badge-row">
        <span class="status-inline">${paymentMethodLabel(order.paymentMethod)}</span>
        <span class="status-inline">${paymentStatusLabel(order.paymentStatus)}</span>
      </div>
      <div class="summary-list mt-16">
        ${order.items.map((item) => `
          <div class="summary-row">
            <span>${item.name} × ${item.quantity}</span>
            <strong>${formatCurrency(item.price * item.quantity)}</strong>
          </div>
        `).join("")}
        <div class="summary-row"><span>Thanh toán</span><strong>${paymentMethodLabel(order.paymentMethod)} • ${paymentStatusLabel(order.paymentStatus)}</strong></div>
        <div class="summary-row total"><span>Tổng tiền</span><strong>${formatCurrency(order.total)}</strong></div>
      </div>
      ${paymentAlert}
      ${order.paymentInstructions ? renderPaymentInstructions(order.paymentInstructions) : ""}
      <div class="timeline">
        ${(order.timeline || []).map((step) => `
          <div class="timeline-item">
            <div class="timeline-dot"></div>
            <div>
              <strong>${step.label}</strong>
              <div class="muted mt-8">${step.note || ""}</div>
              <small class="muted">${formatDate(step.time)}</small>
            </div>
          </div>
        `).join("")}
      </div>
    </article>
  `;
}
function renderBookingCard(booking) {
  return `
    <article class="track-card">
      <div class="section-head">
        <div>
          <span class="section-tag">Phiếu sửa ${booking.bookingCode}</span>
          <h2 class="mt-8">${booking.brand} ${booking.model}</h2>
        </div>
        <div class="text-right">
          <div class="badge green">${bookingStatusLabel(booking.status)}</div>
          <div class="muted mt-8">Hẹn ${booking.appointmentDate} ${booking.preferredTime || ""}</div>
        </div>
      </div>
      <div class="summary-list">
        <div class="summary-row"><span>Khách hàng</span><strong>${booking.customerName}</strong></div>
        <div class="summary-row"><span>Số điện thoại</span><strong>${booking.phone}</strong></div>
        <div class="summary-row"><span>Lỗi ghi nhận</span><strong>${booking.issueType}</strong></div>
        <div class="summary-row"><span>Mô tả thêm</span><strong>${booking.issueDetail || "-"}</strong></div>
        <div class="summary-row"><span>Ghi chú kỹ thuật</span><strong>${booking.note || "-"}</strong></div>
      </div>
    </article>
  `;
}

async function setupTracking() {
  const result = $("#lookupResult");
  const url = new URL(window.location.href);
  const initialOrderCode = url.searchParams.get("orderCode");
  const initialBookingCode = url.searchParams.get("bookingCode");
  if (initialOrderCode) $("#orderCodeInput").value = initialOrderCode;
  if (initialBookingCode) $("#bookingCodeInput").value = initialBookingCode;

  async function trackOrder() {
    const code = ($("#orderCodeInput").value || "").trim();
    if (!code) return toast("Hãy nhập mã đơn hàng.", "error");
    try {
      const order = await api(`/orders/tracking/${encodeURIComponent(code)}`);
      result.innerHTML = renderOrderCard(order);
    } catch (error) {
      toast(error.message, "error");
      result.innerHTML = "";
    }
  }

  async function trackBooking() {
    const code = ($("#bookingCodeInput").value || "").trim();
    if (!code) return toast("Hãy nhập mã phiếu sửa.", "error");
    try {
      const booking = await api(`/bookings/tracking/${encodeURIComponent(code)}`);
      result.innerHTML = renderBookingCard(booking);
    } catch (error) {
      toast(error.message, "error");
      result.innerHTML = "";
    }
  }

  async function lookupOrders() {
    const email = ($("#lookupEmailInput").value || "").trim();
    const phone = ($("#lookupPhoneInput").value || "").trim();
    if (!email && !phone) return toast("Hãy nhập email hoặc số điện thoại.", "error");
    try {
      const items = await api(`/orders/lookup/list?${new URLSearchParams({ email, phone }).toString()}`);
      result.innerHTML = items.length
        ? items.map(renderOrderCard).join("")
        : `<div class="empty-state"><h3>Chưa có đơn hàng phù hợp</h3><p>Kiểm tra lại email / số điện thoại hoặc thử bằng mã đơn cụ thể.</p></div>`;
    } catch (error) {
      toast(error.message, "error");
    }
  }

  $("#trackOrderBtn").addEventListener("click", trackOrder);
  $("#trackBookingBtn").addEventListener("click", trackBooking);
  $("#lookupOrdersBtn").addEventListener("click", lookupOrders);

  if (initialOrderCode) await trackOrder();
  if (initialBookingCode) await trackBooking();
}

const chatState = {
  socket: null,
  conversation: null,
  opened: false,
};

function getChatSessionId() {
  let sessionId = localStorage.getItem("fixbuy_chat_session");
  if (!sessionId) {
    sessionId = `guest-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    localStorage.setItem("fixbuy_chat_session", sessionId);
  }
  return sessionId;
}

function appendCustomerChatMessage(message) {
  const wrap = $("#customerChatMessages");
  if (!wrap) return;
  const item = document.createElement("div");
  item.className = `chat-bubble ${message.sender === "admin" ? "admin" : "customer"}`;
  item.innerHTML = `<span>${message.sender === "admin" ? "Tư vấn viên" : "Bạn"}</span><p>${message.body}</p>`;
  wrap.appendChild(item);
  wrap.scrollTop = wrap.scrollHeight;
}

async function loadCustomerChatMessages() {
  if (!chatState.conversation?._id) return;
  const items = await api(`/chat/conversations/${chatState.conversation._id}/messages`);
  const wrap = $("#customerChatMessages");
  if (!wrap) return;
  wrap.innerHTML = "";
  items.forEach(appendCustomerChatMessage);
}

function connectCustomerChat() {
  if (chatState.socket || typeof io !== "function") return;
  const socket = io();
  chatState.socket = socket;
  const profile = JSON.parse(localStorage.getItem("fixbuy_chat_profile") || "{}");
  socket.emit("chat:customer:join", {
    sessionId: getChatSessionId(),
    customerName: profile.name || "Khách đang xem web",
    customerPhone: profile.phone || "",
    customerEmail: profile.email || "",
  }, async (result) => {
    if (!result?.ok) return toast(result?.message || "Không kết nối được chat.", "error");
    chatState.conversation = result.conversation;
    await loadCustomerChatMessages();
  });
  socket.on("chat:message:new", (message) => {
    if (String(message.conversation) === String(chatState.conversation?._id)) appendCustomerChatMessage(message);
  });
}

function initCustomerChatWidget() {
  const page = document.body.dataset.page || "";
  if (page.startsWith("admin")) return;
  if ($("#customerChatWidget")) return;
  const wrap = document.createElement("div");
  wrap.id = "customerChatWidget";
  wrap.className = "customer-chat-widget";
  wrap.innerHTML = `
    <button class="customer-chat-toggle" id="customerChatToggle" type="button">Chat với cửa hàng</button>
    <section class="customer-chat-box" id="customerChatBox">
      <div class="customer-chat-head">
        <strong>Fix and Buy hỗ trợ</strong>
        <span>Admin sẽ trả lời trực tiếp tại đây</span>
      </div>
      <div class="customer-chat-profile">
        <input class="input" id="chatCustomerName" placeholder="Tên của bạn" />
        <input class="input" id="chatCustomerPhone" placeholder="Số điện thoại" />
        <button class="btn btn-soft" id="saveChatProfileBtn" type="button">Lưu thông tin</button>
      </div>
      <div class="customer-chat-messages" id="customerChatMessages"></div>
      <form class="customer-chat-form" id="customerChatForm">
        <input class="input" id="customerChatInput" placeholder="Nhập tin nhắn cần tư vấn..." required />
        <button class="btn btn-primary" type="submit">Gửi</button>
      </form>
    </section>
  `;
  document.body.appendChild(wrap);

  const profile = JSON.parse(localStorage.getItem("fixbuy_chat_profile") || "{}");
  $("#chatCustomerName").value = profile.name || "";
  $("#chatCustomerPhone").value = profile.phone || "";

  $("#customerChatToggle").addEventListener("click", async () => {
    chatState.opened = !chatState.opened;
    $("#customerChatBox").classList.toggle("show", chatState.opened);
    connectCustomerChat();
  });

  $("#saveChatProfileBtn").addEventListener("click", () => {
    const profileData = {
      name: $("#chatCustomerName").value.trim(),
      phone: $("#chatCustomerPhone").value.trim(),
    };
    localStorage.setItem("fixbuy_chat_profile", JSON.stringify(profileData));
    chatState.socket?.disconnect();
    chatState.socket = null;
    connectCustomerChat();
    toast("Đã lưu thông tin chat.", "success");
  });

  $("#customerChatForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    connectCustomerChat();
    const input = $("#customerChatInput");
    const body = input.value.trim();
    if (!body) return;
    const sendFallback = async () => {
      const result = await api(`/chat/conversations/${chatState.conversation._id}/messages`, {
        method: "POST",
        body: JSON.stringify({ body }),
      });
      appendCustomerChatMessage(result.message);
    };
    if (chatState.socket?.connected && chatState.conversation?._id) {
      chatState.socket.emit("chat:message", { conversationId: chatState.conversation._id, sender: "customer", body }, (result) => {
        if (!result?.ok) return toast(result?.message || "Gửi tin nhắn thất bại.", "error");
      });
    } else if (chatState.conversation?._id) {
      await sendFallback();
    }
    input.value = "";
  });
}

async function route() {
  setActiveNav();
  updateCartBadge();

  const page = document.body.dataset.page;
  if (!String(page || "").startsWith("admin")) initCustomerChatWidget();
  try {
    if (page === "home") await loadHome();
    if (page === "catalog") await setupCatalog();
    if (page === "detail") await loadDetailPage();
    if (page === "cart") loadCartPage();
    if (page === "checkout") await setupCheckout();
    if (page === "booking") await setupBooking();
    if (page === "tracking") await setupTracking();
  } catch (error) {
    console.error(error);
    toast(error.message || "Có lỗi xảy ra khi tải dữ liệu.", "error");
  }
}

document.addEventListener("DOMContentLoaded", route);
