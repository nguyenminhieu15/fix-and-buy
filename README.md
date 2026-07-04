# Fix and Buy Smartphone

Website bán điện thoại, phụ kiện, linh kiện và sửa chữa điện thoại chạy bằng **Node.js + Express + MongoDB**.

## Tính năng chính

- Frontend chạy qua Express, không cần Live Server
- MongoDB lưu dữ liệu sản phẩm, đơn hàng, phiếu sửa, đánh giá
- Chat realtime giữa khách ngoài website và admin bằng Socket.IO
- Lưu lịch sử chat, nhiều hội thoại, trạng thái khách online/offline
- Admin upload nhiều ảnh sản phẩm, quản lý gallery và ảnh đại diện
- Seed dữ liệu demo gồm:
  - 52 mẫu điện thoại
  - 28 phụ kiện / linh kiện
  - 8 gói dịch vụ sửa chữa
- Giỏ hàng, checkout, địa chỉ giao hàng, phương thức thanh toán
- Đánh giá khách hàng theo từng sản phẩm
- Đặt lịch sửa chữa và tra cứu phiếu sửa
- Tra cứu đơn hàng theo mã đơn / email / số điện thoại
- Admin dashboard:
  - đăng nhập admin
  - CRUD sản phẩm
  - cập nhật trạng thái đơn hàng
  - cập nhật phiếu sửa
  - ẩn / hiện đánh giá
  - xuất dữ liệu JSON
  - reset dữ liệu demo

## Cấu trúc thư mục

```bash
phone-repair-pro/
├─ public/
│  ├─ assets/
│  │  ├─ css/style.css
│  │  ├─ js/app.js
│  │  ├─ js/admin.js
│  │  └─ products/*.svg
│  ├─ index.html
│  ├─ catalog.html
│  ├─ detail.html
│  ├─ cart.html
│  ├─ checkout.html
│  ├─ booking.html
│  ├─ tracking.html
│  └─ admin.html
├─ src/
│  ├─ config/db.js
│  ├─ data/seedData.js
│  ├─ middleware/auth.js
│  ├─ models/
│  │  ├─ ChatConversation.js
│  │  └─ ChatMessage.js
│  ├─ routes/
│  │  ├─ chatRoutes.js
│  │  └─ uploadRoutes.js
│  ├─ realtime/chatSocket.js
│  └─ utils/seed.js
├─ .env.example
├─ package.json
└─ server.js
```

## Cách chạy

### 1) Cài MongoDB local
Đảm bảo MongoDB đang chạy ở máy bạn.

Ví dụ URI mặc định:

```env
MONGODB_URI=mongodb://127.0.0.1:27017/fix_buy_smartphone
```

### 2) Tạo file `.env`

Copy từ `.env.example`:

```bash
cp .env.example .env
```

### 3) Cài package

```bash
npm install
```

### 4) Chạy project

Chế độ dev:

```bash
npm run dev
```

Chế độ thường:

```bash
npm start
```

Mở trình duyệt:

```text
http://localhost:3000
```

## Tài khoản admin demo

```text
Email: admin@fixbuy.vn
Password: 12345678
```

Bạn có thể đổi trong file `.env`.

## Chat và upload ảnh

- Khách mở website sẽ thấy nút **Chat với cửa hàng** ở góc dưới bên phải.
- Admin vào `http://localhost:3000/admin.html`, tab **Chat khách hàng** để xem và trả lời realtime.
- Trong tab **Sản phẩm**, bấm thêm/sửa sản phẩm để upload nhiều ảnh hoặc dán nhiều URL ảnh, mỗi dòng một ảnh.
- Ảnh upload local được lưu tại `public/uploads/products` và được gắn vào trường `images` của sản phẩm.

## Ghi chú

- Ảnh sản phẩm trong bản demo dùng **SVG local** để project chạy ngay không phụ thuộc nguồn ngoài.
- Khi triển khai thực tế, bạn chỉ cần thay trường `images` của sản phẩm bằng ảnh thật hoặc tích hợp upload ảnh.
- Seed sẽ tự chạy khi database chưa có dữ liệu.
- Nếu muốn reset dữ liệu demo, vào trang **Admin** và bấm **Khôi phục demo**.

## Mở rộng tiếp theo

- Thêm đăng nhập / đăng ký khách hàng
- Thêm thanh toán online thật (VNPay / MoMo / ZaloPay)
- Thêm upload ảnh sản phẩm bằng Cloudinary
- Thêm phân quyền admin / nhân viên kỹ thuật
- Thêm báo giá sửa theo model tự động
