
const ADMIN_API = "/api/admin";

function a$(selector, scope = document) {
  return scope.querySelector(selector);
}
function a$$(selector, scope = document) {
  return Array.from(scope.querySelectorAll(selector));
}
function getAdminToken() {
  return localStorage.getItem("fixbuy_admin_token") || "";
}
function setAdminToken(token) {
  localStorage.setItem("fixbuy_admin_token", token);
}
function clearAdminToken() {
  localStorage.removeItem("fixbuy_admin_token");
}
function formatCurrencyAdmin(value) {
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(Number(value || 0));
}
function formatDateAdmin(value) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}
function parseMaybeJSON(input) {
  if (!input) return {};
  try {
    return JSON.parse(input);
  } catch (_) {
    return {};
  }
}
function slugifyAdmin(text) {
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
function paymentMethodLabelAdmin(value) {
  return {
    cod: "Tiền mặt khi nhận hàng",
    bank_transfer: "Chuyển khoản",
    momo: "MoMo",
  }[value] || value || "-";
}
function defaultAdminProductImage(productOrType = "phone") {
  const type = typeof productOrType === "string" ? productOrType : productOrType?.type;
  if (type === "service") return "/assets/products/photos/thay-man-hinh-oled-cao-cap.jpg";
  if (type === "accessory") return "/assets/products/photos/cu-sac-gan-65w-3-cong.jpg";
  return "/assets/products/photos/iphone-16-pro-max.jpg";
}
function adminProductImage(product) {
  const firstImage = product?.images?.find(Boolean);
  if (firstImage && (/^https?:\/\//.test(firstImage) || firstImage.startsWith("/uploads/") || firstImage.includes("/uploads/"))) {
    return firstImage;
  }
  if (product?.slug) return `/assets/products/photos/${product.slug}.jpg`;
  if (firstImage) return firstImage;
  return defaultAdminProductImage(product);
}
function adminImageFallbackAttr(productOrType = "phone") {
  return `onerror="this.onerror=null;this.src='${defaultAdminProductImage(productOrType)}'"`;
}
function paymentStatusLabelAdmin(value) {
  return {
    pending: "Chờ thu tiền",
    awaiting_confirmation: "Chờ xác nhận",
    paid: "Đã thanh toán",
    refunded: "Đã hoàn tiền",
  }[value] || value || "-";
}
function orderStatusLabelAdmin(value) {
  return {
    new: "Mới tạo",
    confirmed: "Đã xác nhận",
    processing: "Đang xử lý",
    shipping: "Đang giao",
    completed: "Hoàn tất",
    cancelled: "Đã hủy",
  }[value] || value || "-";
}
function bookingStatusLabelAdmin(value) {
  return {
    pending: "Chờ tiếp nhận",
    inspecting: "Đang kiểm tra",
    fixing: "Đang sửa",
    ready: "Sẵn sàng bàn giao",
    completed: "Hoàn tất",
    cancelled: "Đã hủy",
  }[value] || value || "-";
}
function adminToast(message, type = "info") {
  if (typeof toast === "function") {
    toast(message, type);
    return;
  }
  const wrap = document.getElementById("toastWrap");
  if (!wrap) {
    alert(message);
    return;
  }
  const item = document.createElement("div");
  item.className = `toast ${type}`;
  item.innerHTML = `<strong>${type === "error" ? "Có lỗi" : type === "success" ? "Thành công" : "Thông báo"}</strong><div class="mt-8">${message}</div>`;
  wrap.appendChild(item);
  setTimeout(() => item.remove(), 3200);
}
function stockBadgeClass(stock) {
  if (stock <= 0) return "red";
  if (stock <= 10) return "orange";
  return "green";
}
function adminHeaders() {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${getAdminToken()}`,
  };
}
async function adminApi(path, options = {}) {
  const response = await fetch(`${ADMIN_API}${path}`, {
    headers: {
      ...adminHeaders(),
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
  if (!response.ok) throw new Error(data?.message || "Yêu cầu admin thất bại.");
  return data;
}
async function adminFetchJson(url, options = {}) {
  const response = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getAdminToken()}`,
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
  if (!response.ok) throw new Error(data?.message || "Yêu cầu thất bại.");
  return data;
}
function parseImageList(value) {
  return String(value || "")
    .split(/[\n,]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}
function renderImagePreview(urls = []) {
  const wrap = a$("#productImagePreview");
  if (!wrap) return;
  wrap.innerHTML = urls.length
    ? urls.map((url) => `<img src="${url}" alt="Ảnh sản phẩm" />`).join("")
    : `<div class="muted">Chưa có ảnh trong gallery.</div>`;
}
async function uploadProductImages(files) {
  if (!files?.length) return [];
  const formData = new FormData();
  Array.from(files).forEach((file) => formData.append("images", file));
  const response = await fetch("/api/admin/uploads/products", {
    method: "POST",
    headers: { Authorization: `Bearer ${getAdminToken()}` },
    body: formData,
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data?.message || "Upload ảnh thất bại.");
  return (data.files || []).map((file) => file.url);
}

const adminState = {
  products: [],
  orders: [],
  bookings: [],
  reviews: [],
  chats: [],
  selectedChatId: null,
  chatSocket: null,
};

function switchTab(tabName) {
  a$$(".admin-sidebar .tab").forEach((tab) => {
    tab.classList.toggle("active", tab.dataset.tab === tabName);
  });
  a$$("[data-pane]").forEach((pane) => {
    pane.classList.toggle("hidden", pane.dataset.pane !== tabName);
  });
}

function renderStats(stats) {
  const wrap = a$("#adminStats");
  if (!wrap) return;
  wrap.innerHTML = `
    <div class="kpi accent"><span>Tổng sản phẩm</span><strong>${stats.products}</strong><small>Kho smartphone & linh kiện</small></div>
    <div class="kpi"><span>Đơn hàng</span><strong>${stats.orders}</strong><small>${stats.pendingOrders || 0} đơn mới</small></div>
    <div class="kpi"><span>Phiếu sửa</span><strong>${stats.bookings}</strong><small>${stats.fixingBookings || 0} đang xử lý</small></div>
    <div class="kpi"><span>Đánh giá</span><strong>${stats.reviews}</strong><small>${Number(stats.avgRating || 0).toFixed(1)} / 5 trung bình</small></div>
    <div class="kpi accent"><span>Doanh thu ghi nhận</span><strong>${formatCurrencyAdmin(stats.revenue)}</strong><small>Đơn đã xác nhận, đang giao hoặc hoàn tất</small></div>
    <div class="kpi"><span>Thanh toán đã nhận</span><strong>${stats.paidOrders || 0}</strong><small>${stats.awaitingPayments || 0} chờ xác nhận</small></div>
  `;
}

function renderHighlights(stats) {
  const wrap = a$("#adminHighlights");
  if (!wrap) return;
  wrap.innerHTML = `
    <article class="highlight-card premium">
      <span class="section-tag">Đơn cần xử lý</span>
      <h3>${stats.pendingOrders || 0} đơn mới cần xác nhận</h3>
      <p>Ưu tiên gọi xác nhận, chốt tồn kho, phương thức giao và thời gian giao hàng.</p>
    </article>
    <article class="highlight-card premium">
      <span class="section-tag">Thanh toán cần xác nhận</span>
      <h3>${stats.awaitingPayments || 0} đơn chờ xác nhận chuyển khoản</h3>
      <p>Đối soát nội dung FIXBUY theo mã đơn để chuyển trạng thái sang đã thanh toán.</p>
    </article>
    <article class="highlight-card premium">
      <span class="section-tag">Kỹ thuật & bàn giao</span>
      <h3>${stats.fixingBookings || 0} đang sửa • ${stats.readyBookings || 0} sẵn sàng bàn giao</h3>
      <p>Theo dõi tiến độ sửa chữa, gọi khách khi máy đã hoàn tất và sẵn sàng nhận lại.</p>
    </article>
  `;
}

function renderRevenueChart(points = []) {
  const wrap = a$("#revenueChart");
  if (!wrap) return;
  const max = Math.max(...points.map((item) => Number(item.value || 0)), 1);
  wrap.innerHTML = points.length ? points.map((item) => `
    <div class="chart-bar-col">
      <div class="chart-bar-value">${item.value ? formatCurrencyAdmin(item.value).replace(/\s?₫/, "đ") : "0đ"}</div>
      <div class="chart-bar-track"><div class="chart-bar-fill" style="height:${Math.max(12, Math.round(Number(item.value || 0) / max * 100))}%"></div></div>
      <span>${item.label}</span>
    </div>
  `).join("") : `<div class="empty-state"><h3>Chưa có dữ liệu doanh thu</h3></div>`;
}

function renderInventoryMix(mix = {}) {
  const wrap = a$("#inventoryMix");
  if (!wrap) return;
  const items = [
    { label: "Smartphone", value: mix.phone || 0 },
    { label: "Linh kiện", value: mix.accessory || 0 },
    { label: "Dịch vụ", value: mix.service || 0 },
  ];
  const total = items.reduce((sum, item) => sum + item.value, 0) || 1;
  wrap.innerHTML = items.map((item) => `
    <article class="mix-card">
      <strong>${item.label}</strong>
      <h3>${item.value}</h3>
      <div class="mix-bar"><div class="mix-bar-fill" style="width:${Math.round(item.value / total * 100)}%"></div></div>
      <span>${Math.round(item.value / total * 100)}%</span>
    </article>
  `).join("");
}

function renderDashboardTables(data) {
  const lowStockBody = a$("#lowStockBody");
  if (lowStockBody) {
    lowStockBody.innerHTML = data.lowStockProducts.length
      ? data.lowStockProducts.map((item) => `
        <tr>
          <td>${item.name}</td>
          <td>${item.sku}</td>
          <td>${item.brand}</td>
          <td><span class="badge ${stockBadgeClass(item.stock)}">Tồn ${item.stock}</span></td>
        </tr>
      `).join("")
      : `<tr><td colspan="4">Không có sản phẩm tồn thấp.</td></tr>`;
  }

  const latestOrdersBody = a$("#latestOrdersBody");
  if (latestOrdersBody) {
    latestOrdersBody.innerHTML = data.latestOrders.length
      ? data.latestOrders.map((item) => `
        <tr>
          <td>${item.orderCode}</td>
          <td>${item.customer?.name || "-"}</td>
          <td>${formatCurrencyAdmin(item.total)}</td>
          <td><span class="badge blue">${orderStatusLabelAdmin(item.orderStatus)}</span></td>
        </tr>
      `).join("")
      : `<tr><td colspan="4">Chưa có đơn hàng.</td></tr>`;
  }

  const paymentPendingBody = a$("#paymentPendingBody");
  if (paymentPendingBody) {
    paymentPendingBody.innerHTML = data.paymentPendingOrders.length
      ? data.paymentPendingOrders.map((item) => `
        <tr>
          <td>${item.orderCode}</td>
          <td>${item.customer?.name || "-"}</td>
          <td>${paymentMethodLabelAdmin(item.paymentMethod)}</td>
          <td><span class="badge orange">${paymentStatusLabelAdmin(item.paymentStatus)}</span></td>
        </tr>
      `).join("")
      : `<tr><td colspan="4">Không có đơn chờ xác nhận thanh toán.</td></tr>`;
  }

  const latestReviewsBody = a$("#latestReviewsBody");
  if (latestReviewsBody) {
    latestReviewsBody.innerHTML = data.latestReviews.length
      ? data.latestReviews.map((item) => `
        <tr>
          <td>${item.customerName}</td>
          <td>${item.product?.name || "-"}</td>
          <td>${item.rating} / 5</td>
          <td><span class="badge ${item.status === "approved" ? "green" : "gray"}">${item.status}</span></td>
        </tr>
      `).join("")
      : `<tr><td colspan="4">Chưa có đánh giá.</td></tr>`;
  }

  const latestBookingsBody = a$("#latestBookingsBody");
  if (latestBookingsBody) {
    latestBookingsBody.innerHTML = data.latestBookings.length
      ? data.latestBookings.map((item) => `
        <tr>
          <td>${item.bookingCode}</td>
          <td>${item.customerName}</td>
          <td>${item.brand} ${item.model}</td>
          <td>${item.issueType}</td>
          <td><span class="badge green">${bookingStatusLabelAdmin(item.status)}</span></td>
        </tr>
      `).join("")
      : `<tr><td colspan="5">Chưa có phiếu sửa.</td></tr>`;
  }
}

async function loadDashboard() {
  const data = await adminApi("/dashboard");
  renderStats(data.stats);
  renderHighlights(data.stats);
  renderRevenueChart(data.revenueTrend || []);
  renderInventoryMix(data.stats?.inventoryMix || {});
  renderDashboardTables(data);
}

async function loadProducts() {
  const search = a$("#adminSearchInput")?.value?.trim() || "";
  const type = a$("#adminTypeFilter")?.value || "all";
  const brand = a$("#adminBrandFilter")?.value || "all";
  const selectedBrandBeforeRender = brand;
  const params = new URLSearchParams({ search, type, brand });
  const items = await adminApi(`/products?${params.toString()}`);
  adminState.products = items;

  a$("#adminProductsBody").innerHTML = items.map((product) => `
    <tr>
      <td>
        <div style="display:flex; gap:12px; align-items:flex-start">
          <img src="${adminProductImage(product)}" alt="${product.name}" ${adminImageFallbackAttr(product)} style="width:68px;height:68px;object-fit:cover;border-radius:8px;background:#f8fbff;border:1px solid #e2e8f0" />
          <div>
            <strong>${product.name}</strong>
            <div class="muted mt-8">${product.shortDescription || product.description?.slice(0, 90) || ""}</div>
            <div class="muted mt-8">${product.images?.length || 0} ảnh trong gallery</div>
          </div>
        </div>
      </td>
      <td>${product.sku}<div class="muted mt-8">${product.brand}</div></td>
      <td><span class="badge blue">${product.type}</span><div class="muted mt-8">${product.category}</div></td>
      <td><strong>${formatCurrencyAdmin(product.price)}</strong><div class="muted mt-8">${product.comparePrice ? formatCurrencyAdmin(product.comparePrice) : "-"}</div></td>
      <td><span class="badge ${stockBadgeClass(product.stock)}">${product.stock}</span></td>
      <td>${product.featured ? "Có" : "-"}</td>
      <td>
        <div class="row-actions">
          <button class="mini-btn edit" type="button" data-action="edit" data-id="${product._id}">Sửa</button>
          <button class="mini-btn delete" type="button" data-action="delete" data-id="${product._id}">Xóa</button>
        </div>
      </td>
    </tr>
  `).join("") || `<tr><td colspan="7">Không có sản phẩm phù hợp.</td></tr>`;

  const brands = [...new Set(adminState.products.map((item) => item.brand))].sort();
  a$("#adminBrandFilter").innerHTML = `<option value="all">Tất cả hãng</option>` + brands.map((brandName) => `<option value="${brandName}" ${selectedBrandBeforeRender === brandName ? "selected" : ""}>${brandName}</option>`).join("");
}

async function loadOrders() {
  const items = await adminApi("/orders");
  adminState.orders = items;
  a$("#adminOrdersBody").innerHTML = items.map((order) => `
    <tr>
      <td><strong>${order.orderCode}</strong><div class="muted mt-8">${formatDateAdmin(order.createdAt)}</div></td>
      <td>${order.customer?.name || "-"}<div class="muted mt-8">${order.customer?.phone || "-"}</div></td>
      <td>${(order.items || []).map((item) => `${item.name} × ${item.quantity}`).join("<br>")}</td>
      <td><strong>${formatCurrencyAdmin(order.total)}</strong><div class="muted mt-8">${paymentMethodLabelAdmin(order.paymentMethod)}</div></td>
      <td>
        <select class="select" data-order-payment="${order._id}">
          ${["pending","awaiting_confirmation","paid","refunded"].map((status) => `<option value="${status}" ${order.paymentStatus === status ? "selected" : ""}>${paymentStatusLabelAdmin(status)}</option>`).join("")}
        </select>
      </td>
      <td>
        <select class="select" data-order-status="${order._id}">
          ${["new","confirmed","processing","shipping","completed","cancelled"].map((status) => `<option value="${status}" ${order.orderStatus === status ? "selected" : ""}>${orderStatusLabelAdmin(status)}</option>`).join("")}
        </select>
      </td>
      <td><button class="mini-btn edit" type="button" data-order-save="${order._id}">Lưu</button></td>
    </tr>
  `).join("") || `<tr><td colspan="7">Chưa có đơn hàng.</td></tr>`;
}

async function loadBookings() {
  const items = await adminApi("/bookings");
  adminState.bookings = items;
  a$("#adminBookingsBody").innerHTML = items.map((booking) => `
    <tr>
      <td><strong>${booking.bookingCode}</strong><div class="muted mt-8">${formatDateAdmin(booking.createdAt)}</div></td>
      <td>${booking.customerName}<div class="muted mt-8">${booking.phone}</div></td>
      <td>${booking.brand} ${booking.model}</td>
      <td>${booking.issueType}<div class="muted mt-8">${booking.issueDetail || "-"}</div></td>
      <td>${booking.appointmentDate}<div class="muted mt-8">${booking.preferredTime || "-"}</div></td>
      <td>
        <select class="select" data-booking-status="${booking._id}">
          ${["pending","inspecting","fixing","ready","completed","cancelled"].map((status) => `<option value="${status}" ${booking.status === status ? "selected" : ""}>${bookingStatusLabelAdmin(status)}</option>`).join("")}
        </select>
      </td>
      <td><textarea class="textarea" data-booking-note="${booking._id}" style="min-height:68px">${booking.note || ""}</textarea></td>
      <td><button class="mini-btn edit" type="button" data-booking-save="${booking._id}">Lưu</button></td>
    </tr>
  `).join("") || `<tr><td colspan="8">Chưa có phiếu sửa.</td></tr>`;
}

async function loadReviews() {
  const items = await adminApi("/reviews");
  adminState.reviews = items;
  a$("#adminReviewsBody").innerHTML = items.map((review) => `
    <tr>
      <td>${review.customerName}<div class="muted mt-8">${review.customerEmail || "-"}</div></td>
      <td>${review.product?.name || "-"}</td>
      <td>${review.rating} / 5</td>
      <td><strong>${review.title || "Đánh giá"}</strong><div class="muted mt-8">${review.comment}</div></td>
      <td>
        <select class="select" data-review-status="${review._id}">
          ${["approved","hidden"].map((status) => `<option value="${status}" ${review.status === status ? "selected" : ""}>${status}</option>`).join("")}
        </select>
      </td>
      <td><button class="mini-btn edit" type="button" data-review-save="${review._id}">Lưu</button></td>
    </tr>
  `).join("") || `<tr><td colspan="6">Chưa có đánh giá.</td></tr>`;
}

function openProductModal(product = null) {
  const modal = a$("#productModal");
  const form = a$("#productForm");
  form.reset();
  form.name.value = product?.name || "";
  form.id.value = product?._id || "";
  form.slug.value = product?.slug || "";
  form.sku.value = product?.sku || "";
  form.type.value = product?.type || "phone";
  form.brand.value = product?.brand || "";
  form.category.value = product?.category || "";
  form.tier.value = product?.tier || "";
  form.colorLabel.value = product?.colorLabel || "";
  form.price.value = product?.price || "";
  form.comparePrice.value = product?.comparePrice || "";
  form.stock.value = product?.stock ?? 0;
  form.images.value = (product?.images || []).join("\n");
  form.shortDescription.value = product?.shortDescription || "";
  form.description.value = product?.description || "";
  form.tags.value = (product?.tags || []).join(", ");
  form.specs.value = JSON.stringify(product?.specs || {}, null, 2);
  form.featured.checked = !!product?.featured;
  form.bestseller.checked = !!product?.bestseller;
  renderImagePreview(product?.images || []);
  a$("#productModalTitle").textContent = product ? "Cập nhật sản phẩm" : "Thêm sản phẩm mới";
  modal.classList.add("show");
}
function closeProductModal() {
  a$("#productModal")?.classList.remove("show");
}

function renderAdminChatList() {
  const wrap = a$("#adminChatList");
  if (!wrap) return;
  wrap.innerHTML = adminState.chats.length
    ? adminState.chats.map((chat) => `
      <button class="chat-list-item ${adminState.selectedChatId === chat._id ? "active" : ""}" type="button" data-chat-id="${chat._id}">
        <strong>${chat.customerName || "Khách đang xem web"}</strong>
        <span>${chat.lastMessage || "Chưa có tin nhắn"}</span>
        <small>${chat.customerOnline ? "Online" : "Offline"}${chat.unreadAdmin ? ` • ${chat.unreadAdmin} tin mới` : ""}</small>
      </button>
    `).join("")
    : `<div class="empty-state"><h3>Chưa có hội thoại</h3><p>Khách nhắn từ website sẽ hiện tại đây.</p></div>`;
}

function renderAdminMessages(items = []) {
  const wrap = a$("#adminChatMessages");
  if (!wrap) return;
  wrap.innerHTML = items.length
    ? items.map((item) => `
      <div class="chat-bubble ${item.sender === "admin" ? "admin" : "customer"}">
        <span>${item.sender === "admin" ? "Admin" : "Khách"}</span>
        <p>${item.body}</p>
        <small>${formatDateAdmin(item.createdAt)}</small>
      </div>
    `).join("")
    : `<div class="empty-state"><h3>Chưa có tin nhắn</h3></div>`;
  wrap.scrollTop = wrap.scrollHeight;
}

async function loadAdminChats() {
  const items = await adminFetchJson("/api/chat/admin/conversations");
  adminState.chats = items;
  renderAdminChatList();
}

async function selectAdminChat(id) {
  adminState.selectedChatId = id;
  const chat = adminState.chats.find((item) => item._id === id);
  const head = a$("#adminChatHead");
  if (head && chat) {
    head.innerHTML = `<strong>${chat.customerName || "Khách đang xem web"}</strong><span class="muted">${chat.customerPhone || chat.customerEmail || chat.sessionId}</span>`;
  }
  renderAdminChatList();
  adminState.chatSocket?.emit("chat:admin:watch", { conversationId: id });
  const items = await adminFetchJson(`/api/chat/admin/conversations/${id}/messages`);
  renderAdminMessages(items);
  await loadAdminChats();
}

function initAdminChatSocket() {
  if (adminState.chatSocket || typeof io !== "function") return;
  const socket = io();
  adminState.chatSocket = socket;
  socket.emit("chat:admin:join", { token: getAdminToken() }, (result) => {
    if (!result?.ok) adminToast(result?.message || "Không kết nối được chat admin.", "error");
  });
  socket.on("chat:conversation:update", async (conversation) => {
    const index = adminState.chats.findIndex((item) => item._id === conversation._id);
    if (index >= 0) adminState.chats.splice(index, 1);
    adminState.chats.unshift(conversation);
    renderAdminChatList();
  });
  socket.on("chat:message:new", async (message) => {
    if (String(message.conversation) === String(adminState.selectedChatId)) {
      const items = await adminFetchJson(`/api/chat/admin/conversations/${adminState.selectedChatId}/messages`);
      renderAdminMessages(items);
    } else if (message.sender === "customer") {
      adminToast("Có tin nhắn mới từ khách hàng.", "info");
    }
  });
}

async function handleAdminLogin(event) {
  event.preventDefault();
  const formData = new FormData(event.currentTarget);
  try {
    const response = await fetch("/api/auth/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: formData.get("email"),
        password: formData.get("password"),
      }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data?.message || "Đăng nhập thất bại.");
    setAdminToken(data.token);
    adminToast("Đăng nhập admin thành công.", "success");
    window.location.href = "/admin.html";
  } catch (error) {
    adminToast(error.message, "error");
  }
}

async function setupAdminDashboardEvents() {
  a$("#adminLogoutBtn")?.addEventListener("click", () => {
    clearAdminToken();
    adminToast("Đã đăng xuất admin.", "success");
    window.location.href = "/admin-login.html";
  });

  a$("#openProductModalBtn")?.addEventListener("click", () => openProductModal());
  a$("#closeProductModalBtn")?.addEventListener("click", closeProductModal);
  a$("#productModal")?.addEventListener("click", (event) => {
    if (event.target.id === "productModal") closeProductModal();
  });
  a$("#productImageFiles")?.addEventListener("change", (event) => {
    const current = parseImageList(a$("#productForm")?.images?.value || "");
    const localPreview = Array.from(event.target.files || []).map((file) => URL.createObjectURL(file));
    renderImagePreview([...current, ...localPreview]);
  });

  a$("#productForm")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    let images = parseImageList(form.images.value);
    const payload = {
      name: form.name.value.trim(),
      slug: form.slug.value.trim() || slugifyAdmin(form.name.value.trim()),
      sku: form.sku.value.trim(),
      type: form.type.value,
      brand: form.brand.value.trim(),
      category: form.category.value.trim(),
      tier: form.tier.value.trim(),
      colorLabel: form.colorLabel.value.trim(),
      price: Number(form.price.value || 0),
      comparePrice: Number(form.comparePrice.value || 0),
      stock: Number(form.stock.value || 0),
      images,
      shortDescription: form.shortDescription.value.trim(),
      description: form.description.value.trim(),
      tags: form.tags.value.split(",").map((item) => item.trim()).filter(Boolean),
      specs: parseMaybeJSON(form.specs.value.trim()),
      featured: form.featured.checked,
      bestseller: form.bestseller.checked,
    };
    try {
      const uploadedUrls = await uploadProductImages(a$("#productImageFiles")?.files || []);
      if (uploadedUrls.length) {
        images = [...images, ...uploadedUrls];
        payload.images = images;
        form.images.value = images.join("\n");
        renderImagePreview(images);
      }
      if (form.id.value) {
        await adminApi(`/products/${form.id.value}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
        adminToast("Đã cập nhật sản phẩm.", "success");
      } else {
        await adminApi("/products", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        adminToast("Đã thêm sản phẩm mới.", "success");
      }
      closeProductModal();
      await loadProducts();
      await loadDashboard();
    } catch (error) {
      adminToast(error.message, "error");
    }
  });

  a$(".admin-sidebar")?.addEventListener("click", async (event) => {
    const tab = event.target.closest(".tab");
    if (!tab) return;
    switchTab(tab.dataset.tab);
    if (tab.dataset.tab === "products") await loadProducts();
    if (tab.dataset.tab === "orders") await loadOrders();
    if (tab.dataset.tab === "bookings") await loadBookings();
    if (tab.dataset.tab === "reviews") await loadReviews();
    if (tab.dataset.tab === "chats") {
      initAdminChatSocket();
      await loadAdminChats();
    }
  });

  a$("#reloadChatsBtn")?.addEventListener("click", loadAdminChats);
  a$("#adminChatList")?.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-chat-id]");
    if (!button) return;
    await selectAdminChat(button.dataset.chatId);
  });
  a$("#adminChatForm")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const body = a$("#adminChatInput")?.value?.trim();
    if (!adminState.selectedChatId || !body) return;
    const done = async () => {
      a$("#adminChatInput").value = "";
      const items = await adminFetchJson(`/api/chat/admin/conversations/${adminState.selectedChatId}/messages`);
      renderAdminMessages(items);
      await loadAdminChats();
    };
    if (adminState.chatSocket?.connected) {
      adminState.chatSocket.emit("chat:message", { conversationId: adminState.selectedChatId, sender: "admin", body }, async (result) => {
        if (!result?.ok) return adminToast(result?.message || "Gửi tin nhắn thất bại.", "error");
        await done();
      });
      return;
    }
    await adminFetchJson(`/api/chat/admin/conversations/${adminState.selectedChatId}/messages`, {
      method: "POST",
      body: JSON.stringify({ body }),
    });
    await done();
  });

  a$("#adminProductFilterBtn")?.addEventListener("click", loadProducts);
  a$("#adminReloadProductsBtn")?.addEventListener("click", loadProducts);
  a$("#adminSearchInput")?.addEventListener("input", () => {
    clearTimeout(a$("#adminSearchInput")._deb);
    a$("#adminSearchInput")._deb = setTimeout(loadProducts, 250);
  });

  a$("#adminProductsBody")?.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-action]");
    if (!button) return;
    const product = adminState.products.find((item) => item._id === button.dataset.id);
    if (!product) return;

    if (button.dataset.action === "edit") {
      openProductModal(product);
      return;
    }
    if (button.dataset.action === "delete") {
      const ok = confirm(`Xóa sản phẩm "${product.name}"?`);
      if (!ok) return;
      try {
        await adminApi(`/products/${product._id}`, { method: "DELETE" });
        adminToast("Đã xóa sản phẩm.", "success");
        await loadProducts();
        await loadDashboard();
      } catch (error) {
        adminToast(error.message, "error");
      }
    }
  });

  a$("#adminOrdersBody")?.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-order-save]");
    if (!button) return;
    const id = button.dataset.orderSave;
    const orderStatus = a$(`[data-order-status="${id}"]`).value;
    const paymentStatus = a$(`[data-order-payment="${id}"]`).value;
    try {
      await adminApi(`/orders/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ orderStatus, paymentStatus }),
      });
      adminToast("Đã cập nhật đơn hàng.", "success");
      await loadOrders();
      await loadDashboard();
    } catch (error) {
      adminToast(error.message, "error");
    }
  });

  a$("#adminBookingsBody")?.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-booking-save]");
    if (!button) return;
    const id = button.dataset.bookingSave;
    const status = a$(`[data-booking-status="${id}"]`).value;
    const note = a$(`[data-booking-note="${id}"]`).value;
    try {
      await adminApi(`/bookings/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status, note }),
      });
      adminToast("Đã cập nhật phiếu sửa.", "success");
      await loadBookings();
      await loadDashboard();
    } catch (error) {
      adminToast(error.message, "error");
    }
  });

  a$("#adminReviewsBody")?.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-review-save]");
    if (!button) return;
    const id = button.dataset.reviewSave;
    const status = a$(`[data-review-status="${id}"]`).value;
    try {
      await adminApi(`/reviews/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      adminToast("Đã cập nhật review.", "success");
      await loadReviews();
      await loadProducts();
      await loadDashboard();
    } catch (error) {
      adminToast(error.message, "error");
    }
  });

  a$("#resetDemoBtn")?.addEventListener("click", async () => {
    const ok = confirm("Khôi phục dữ liệu sẽ xóa dữ liệu hiện tại. Tiếp tục?");
    if (!ok) return;
    try {
      await adminApi("/reset-demo", { method: "POST" });
      adminToast("Đã khôi phục dữ liệu.", "success");
      await bootAdminData();
    } catch (error) {
      adminToast(error.message, "error");
    }
  });

  a$("#exportDataBtn")?.addEventListener("click", async () => {
    try {
      const data = await adminApi("/export");
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `fix-and-buy-export-${Date.now()}.json`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      adminToast(error.message, "error");
    }
  });
}

async function bootAdminData() {
  try {
    await loadDashboard();
    await loadProducts();
    await loadOrders();
    await loadBookings();
    await loadReviews();
    switchTab("dashboard");
  } catch (error) {
    adminToast(error.message, "error");
    if (/token|quyen|401|403/i.test(error.message)) {
      clearAdminToken();
      window.location.href = "/admin-login.html";
    }
  }
}

async function initAdminPage() {
  const loginForm = a$("#adminLoginForm");
  const fillBtn = a$("#fillDemoAdminBtn");

  if (loginForm) {
    loginForm.addEventListener("submit", handleAdminLogin);
    fillBtn?.addEventListener("click", () => {
      loginForm.email.value = "admin@fixbuy.vn";
      loginForm.password.value = "12345678";
    });
    if (getAdminToken()) {
      window.location.href = "/admin.html";
    }
    return;
  }

  if (!a$("#adminApp")) return;
  if (!getAdminToken()) {
    document.body.innerHTML = `
      <main class="section"><div class="container"><section class="login-redirect-card center"><span class="section-tag">Yêu cầu đăng nhập</span><h2>Bạn cần đăng nhập quản trị trước khi vào khu quản trị</h2><p class="muted">Vui lòng đăng nhập bằng tài khoản quản trị để tiếp tục.</p><div class="mt-20"><a class="btn btn-primary" href="/admin-login.html">Đến trang đăng nhập</a></div></section></div></main>
      <div class="toast-wrap" id="toastWrap"></div>`;
    return;
  }

  await setupAdminDashboardEvents();
  await bootAdminData();
}

document.addEventListener("DOMContentLoaded", initAdminPage);
