# cms-base

Khung backend cho CMS: NestJS 11, Fastify, MongoDB, Redis, vai trò động.

## Chạy dự án

Cần Node.js >= 22.12 và Docker.

```bash
npm install
cp .env.example .env        # điền JWT_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD
docker compose up -d mongo redis   # chỉ MongoDB và Redis
npm run start:dev
```

Chạy cả API trong Docker (không cần `npm run start:dev`, hai cách dùng chung cổng 8000):

```bash
docker compose up -d --build     # build lại sau khi sửa code
docker compose logs -f api
```

- API: `http://localhost:8000`
- Swagger (không bật ở production): `http://localhost:8000/docs`
- Health check: `GET /health`

Lần chạy đầu tạo vai trò `super_admin`, `editor`, `author` và tài khoản quản trị từ `ADMIN_EMAIL`,
`ADMIN_PASSWORD`. `editor` và `author` chưa có quyền nào cho đến khi bạn gán.

## Lệnh

| Lệnh | Việc làm |
|---|---|
| `npm run lint` | Kiểm tra code, gồm cả chiều phụ thuộc giữa các tầng |
| `npm run typecheck` | Kiểm tra kiểu |
| `npm test` | Unit test |
| `npm run test:e2e` | Test toàn bộ API (lần đầu tải MongoDB, khá lâu; Redis được thay bằng bộ nhớ) |
| `npm run build` | Build vào `dist/` |

## Cấu trúc

```
src/
  config/     đọc và kiểm tra biến môi trường
  core/       hạ tầng: database, cache
  common/     decorator, filter, interceptor, phân trang, validation
  modules/    nghiệp vụ: auth, user, role, health, seed
```

Trong mỗi module, khai báo field tách khỏi xử lý logic:

```
modules/<tên>/
  schemas/     field lưu trong database
  dto/         field của request, response và rule validation
  services/    xử lý logic
  controllers/ khai báo API, nhận request và gọi service
  <tên>.module.ts, <tên>.permissions.ts
```

Phụ thuộc một chiều: `modules` -> `common` -> `core` -> `config`. ESLint chặn import ngược.

## API

| Method | Đường dẫn | Quyền |
|---|---|---|
| POST | `/auth/login`, `/auth/refresh` | công khai |
| GET | `/auth/me` | đã đăng nhập |
| POST | `/auth/logout` | đã đăng nhập |
| PUT | `/auth/password` | đã đăng nhập |
| GET | `/permissions`, `/roles`, `/roles/:id` | `role:read` |
| POST, PATCH, DELETE | `/roles`, `/roles/:id` | `role:manage` |
| GET | `/users`, `/users/:id` | `user:read` |
| POST, PATCH, DELETE | `/users`, `/users/:id` | `user:manage` |
| PUT | `/users/:id/roles` | `user:manage` |

Response thành công: `{ "data": ..., "meta": ... }`. Lỗi: `{ "statusCode": ..., "message": ... }`.

## Phân quyền

- Mọi API **mặc định yêu cầu đăng nhập**. Gắn `@Public()` để mở công khai.
- `@RequirePermissions('x:y')` yêu cầu quyền. API không gắn decorator này thì ai đăng nhập cũng gọi được.
- Vai trò do người dùng tạo qua API. Danh sách quyền khai báo trong code.
- Thay đổi vai trò có hiệu lực ngay ở request kế tiếp.
- Không ai cấp, sửa hoặc chiếm được quyền cao hơn quyền của chính mình.
- Luôn còn ít nhất một super admin đang hoạt động.

## Thêm module mới

Ví dụ module `content`:

1. Tạo `src/modules/content/` theo khuôn của `role/`: `module`, `permissions`,
   `schemas/`, `dto/`, `services/`, `controllers/`.
2. Thêm quyền vào `content.permissions.ts`, rồi khai báo trong `src/modules/permissions.ts`.
3. Gắn `@RequirePermissions()` cho các API quản trị.
4. Đăng ký module trong `app.module.ts`.
5. Trả dữ liệu qua response DTO, không trả thẳng document.

Quyền kiểu "chỉ sửa bài của mình" (`content:update:own`) cần kiểm tra thêm trong service.

Nếu module tham chiếu tới vai trò, đăng ký `roleService.registerUsageCheck()` để chặn xoá vai trò đang dùng.

## Trước khi lên production

- Đặt `NODE_ENV=production`, `CORS_ORIGINS`, và `TRUST_PROXY` nếu chạy sau reverse proxy.
- Bật mật khẩu cho MongoDB và Redis. `docker-compose.yml` chỉ dành cho máy phát triển.
- Chạy nhiều instance thì chuyển bộ đếm rate limit sang Redis.
