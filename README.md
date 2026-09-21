# Quizlet Clone - Nền Tảng Học Từ Vựng Tiếng Anh Thông Minh

Ứng dụng học từ vựng tiếng Anh cá nhân hóa phong cách Quizlet, tối ưu hóa trải nghiệm di động (Mobile-First Progressive Web App), tích hợp thuật toán lặp lại ngắt quãng (Spaced Repetition System - SM-2), tự động gợi ý nghĩa tiếng Việt và ví dụ bằng từ điển kết hợp AI (Claude Haiku), cùng đầy đủ các chế độ học: Flashcards 3D, Học (Learn), Kiểm tra (Test), Ghép thẻ (Match).

---

## Mục lục
1. [Tính năng nổi bật](#tính-năng-nổi-bật)
2. [Công nghệ sử dụng](#công-nghệ-sử-dụng)
3. [Yêu cầu hệ thống](#yêu-cầu-hệ-thống)
4. [Cài đặt & Chạy dưới Local](#cài-đặt--chạy-dưới-local)
5. [Tài khoản dùng thử (Demo)](#tài-khoản-dùng-thử-demo)
6. [Biến môi trường (Environment Variables)](#biến-môi-trường-environment-variables)
7. [Hướng dẫn triển khai lên Vercel + Turso DB](#hướng-dẫn-triển-khai-lên-vercel--turso-db)
8. [Cài đặt PWA trên Điện thoại (iOS / Android)](#cài-đặt-pwa-trên-điện-thoại-ios--android)
9. [Sao lưu và Khôi phục Dữ liệu (Backup & Restore)](#sao-lưu-và-khôi-phục-dữ-liệu-backup--restore)
10. [Phím tắt & Thao tác cử chỉ](#phím-tắt--thao-tác-cử-chỉ)
11. [Kiểm thử & Đảm bảo chất lượng (Quality Gate)](#kiểm-thử--đảm-bảo-chất-lượng-quality-gate)

---

## Tính năng nổi bật

- **Flashcards 3D & Cử chỉ vuốt**: Hiệu ứng lật thẻ 3D mượt mà, hỗ trợ vuốt trái (Chưa nhớ / Again), vuốt phải (Đã nhớ / Good) trên điện thoại và phím tắt đầy đủ trên máy tính.
- **Thuật toán Spaced Repetition (SRS SM-2)**: Quản lý hàng đợi "Ôn hôm nay" khoa học dựa trên độ khó và số lần lặp lại, hiển thị trước khoảng thời gian ôn tập (`10m`, `1d`, `3d`, `5d`).
- **Gợi ý từ điển & AI đa tầng**: Tự động gợi ý từ qua Datamuse API, truy xuất phiên âm IPA, từ loại, phát âm giọng chuẩn qua Free Dictionary API, và gợi ý nghĩa tiếng Việt súc tích qua Claude 3.5 Haiku.
- **Các chế độ học toàn diện**:
  - **Thẻ ghi nhớ (Flashcards)**: Học tự do hoặc theo lịch ôn SRS, hỗ trợ hoàn tác (Undo), đổi chiều hiển thị (Anh-Việt, Việt-Anh, Trộn lẫn).
  - **Chế độ Học (Learn)**: Hệ thống 3 giai đoạn (Mới ➔ Quen thuộc ➔ Thành thạo) kết hợp trắc nghiệm 4 lựa chọn và gõ từ tự luận.
  - **Kiểm tra (Test)**: Tùy biến số câu và loại câu hỏi (Trắc nghiệm, Đúng/Sai, Tự luận), chấm điểm tự động và cho phép làm lại câu sai.
  - **Ghép thẻ (Match)**: Trò chơi ghép 6 cặp từ tính giờ với bảng lưu kỷ lục cá nhân tốt nhất.
- **Thư mục & Chia sẻ công khai**: Gom nhóm học phần theo thư mục, tạo đường dẫn chia sẻ công khai (`/s/[slug]`) cho phép người khác xem và sao chép về tài khoản.
- **Nhập/Xuất linh hoạt**: Thêm từ hàng loạt bằng dán văn bản (Bulk Add), xuất/nhập file CSV chuẩn RFC 4180 và sao lưu toàn diện định dạng JSON.
- **Giao diện tiếng Việt chuẩn hóa**: Hỗ trợ Dark Mode / Light Mode theo hệ thống, thiết kế Mobile-First đạt chuẩn tiếp cận WCAG AA.
- **Bảo mật cao**: Phân quyền nghiêm ngặt theo người dùng (Multi-tenant isolation), mã hóa mật khẩu bcrypt (12 rounds), phiên đăng nhập JWT qua HttpOnly Cookie, bảo vệ Rate Limit chống dò mật khẩu, và thiết lập HTTP Security Headers (CSP, X-Frame-Options, X-Content-Type-Options).

---

## Công nghệ sử dụng

- **Frontend & Backend**: [Next.js 16 (App Router)](https://nextjs.org), React 19, TypeScript.
- **Styling**: Tailwind CSS v4, Lucide React icons.
- **Cơ sở dữ liệu & ORM**: LibSQL / Turso SQLite, [Drizzle ORM](https://orm.drizzle.team).
- **Xác thực & Bảo mật**: `jose` (JWT), `bcryptjs`, Rate limiter dựa trên SQLite.
- **Xác thực dữ liệu**: `zod`.
- **Kiểm thử**: `vitest` (105+ unit & integration tests).

---

## Yêu cầu hệ thống

- **Node.js**: Phiên bản 20.x hoặc mới hơn.
- **npm**: Phiên bản 10.x hoặc mới hơn.

---

## Cài đặt & Chạy dưới Local

Chỉ cần vài bước đơn giản để khởi chạy dự án dưới máy tính cá nhân mà không cần tài khoản ngoài nào:

```bash
# 1. Clone mã nguồn
git clone https://github.com/khanhtq/quizlet-clone.git
cd quizlet-clone

# 2. Cài đặt các gói phụ thuộc
npm install

# 3. Tạo file cấu hình môi trường từ mẫu
cp .env.example .env

# 4. Tạo cơ sở dữ liệu SQLite cục bộ (lưu tại ./data/local.db)
npm run db:migrate

# 5. Khởi tạo dữ liệu mẫu (Tài khoản demo & 20 từ vựng phong phú)
npm run db:seed

# 6. Khởi chạy máy chủ phát triển
npm run dev
```

Truy cập ứng dụng tại: `http://localhost:3000`

---

## Tài khoản dùng thử (Demo)

Sau khi chạy lệnh `npm run db:seed`, bạn có thể đăng nhập ngay bằng tài khoản demo có sẵn 20 từ vựng mẫu chất lượng cao:

- **Email**: `demo@quizlet.local`
- **Mật khẩu**: `Demo123456`

---

## Biến môi trường (Environment Variables)

Các biến cấu hình trong file `.env`:

| Tên biến | Bắt buộc | Mặc định | Mô tả |
| :--- | :---: | :--- | :--- |
| `DATABASE_URL` | Có | `file:./data/local.db` | Đường dẫn kết nối CSDL (SQLite local hoặc Turso `libsql://...`) |
| `DATABASE_AUTH_TOKEN` | Khi dùng Turso | `""` | Auth Token do Turso cung cấp cho database |
| `SESSION_SECRET` | Có (Production) | Chuỗi 32+ ký tự | Khóa bí mật dùng để ký và xác thực JWT cookie đăng nhập |
| `ALLOW_SIGNUP` | Không | `true` | Đặt `false` trong production để khóa đăng ký mới sau khi tạo tài khoản của bạn |
| `GEMINI_API_KEY` | Không | `""` | **(Khuyến nghị)** API Key miễn phí từ Google AI Studio (`aistudio.google.com`) để gợi ý nghĩa tiếng Việt |
| `GEMINI_MODEL` | Không | `gemini-1.5-flash` | Model Gemini sử dụng (`gemini-1.5-flash` hoặc `gemini-2.0-flash`) |
| `ANTHROPIC_API_KEY` | Không | `""` | API Key của Anthropic nếu muốn sử dụng Claude AI |
| `LLM_MODEL` | Không | `claude-haiku-4-5-20251001` | Model Claude sử dụng nếu dùng Anthropic |
| `LLM_PROVIDER` | Không | `""` | Tùy chọn ưu tiên: `gemini` hoặc `anthropic` (mặc định tự nhận diện key có sẵn) |
| `LLM_DAILY_CAP` | Không | `200` | Giới hạn số lượt gọi AI tối đa trong một ngày trên toàn hệ thống |

> **Lưu ý về AI Tra cứu nghĩa tiếng Việt**:
> - **Google Gemini (Khuyến nghị)**: Miễn phí hoàn toàn với hạn mức cao (1.500 yêu cầu/ngày) tại [Google AI Studio](https://aistudio.google.com). Bạn chỉ cần tạo API key miễn phí và điền `GEMINI_API_KEY` là ứng dụng sẽ tự động kích hoạt.
> - **Anthropic Claude**: Tùy chọn bổ sung nếu bạn muốn dùng model của Anthropic.
> - Nếu không cấu hình bất kỳ API Key AI nào, ứng dụng vẫn hoạt động 100% bình thường (tra cứu phiên âm & định nghĩa qua Free Dictionary API và cho phép nhập nghĩa thủ công).

---

## Hướng dẫn triển khai lên Vercel + Turso DB

Hệ thống được tối ưu hoàn hảo để chạy trên Vercel (Serverless) kết hợp với Turso SQLite (Database ở Edge).

### Bước 1: Tạo Database trên Turso

Cài đặt Turso CLI và tạo database:

```bash
# Cài đặt CLI (nếu chưa có)
curl -sSfL https://get.tur.so/install.sh | bash

# Đăng nhập vào Turso
turso auth login

# Tạo database cho dự án
turso db create quizlet-clone

# Lấy Database URL (dạng: libsql://quizlet-clone-[username].turso.io)
turso db show quizlet-clone --url

# Tạo Auth Token truy cập database
turso db tokens create quizlet-clone
```

### Bước 2: Chạy Migration và Seed dữ liệu vào Turso

Chạy lệnh migration từ máy của bạn lên Turso:

```bash
# Thay thế URL và Token thực tế từ Bước 1
export DATABASE_URL="libsql://quizlet-clone-[username].turso.io"
export DATABASE_AUTH_TOKEN="your-turso-auth-token"

# Đẩy schema bảng vào Turso
npm run db:migrate

# (Tùy chọn) Khởi tạo tài khoản demo và dữ liệu mẫu lên Turso
npm run db:seed
```

### Bước 3: Triển khai lên Vercel

1. Đăng nhập vào [Vercel](https://vercel.com) và bấm **Add New...** ➔ **Project**.
2. Nhập repository `https://github.com/khanhtq/quizlet-clone.git`.
3. Trong mục **Environment Variables**, điền các biến sau:
   - `DATABASE_URL`: `libsql://quizlet-clone-[username].turso.io`
   - `DATABASE_AUTH_TOKEN`: Token lấy từ lệnh `turso db tokens create`
   - `SESSION_SECRET`: Chuỗi ngẫu nhiên tối thiểu 32 ký tự (ví dụ tạo bằng: `openssl rand -base64 32`)
   - `ALLOW_SIGNUP`: Đặt là `true` để đăng ký tài khoản đầu tiên của bạn
   - `ANTHROPIC_API_KEY`: (Tùy chọn) API key nếu muốn dùng gợi ý nghĩa bằng Claude
   - `LLM_DAILY_CAP`: `200`
4. Bấm **Deploy**. Vercel sẽ tự động build và xuất bản ứng dụng.

### Bước 4: Khóa đăng ký mới (Bảo vệ tài khoản cá nhân)

Sau khi truy cập trang web đã deploy và đăng ký thành công tài khoản cá nhân của bạn:
1. Vào mục **Project Settings** ➔ **Environment Variables** trên Vercel.
2. Sửa biến `ALLOW_SIGNUP` thành `false`.
3. Bấm **Redeploy** phiên bản mới nhất để áp dụng. Kể từ lúc này, không ai ngoài bạn có thể đăng ký tài khoản mới trên hệ thống.

### Bước 5: Cấu hình hạn mức chi tiêu Anthropic (Khuyến nghị)

Nếu bạn cấu hình `ANTHROPIC_API_KEY`:
1. Vào [Anthropic Console](https://console.anthropic.com/settings/limits).
2. Thiết lập **Spend Limit** hàng tháng (ví dụ: \$5/tháng) để đảm bảo không bị vượt ngân sách chi tiêu ngoài ý muốn.

---

## Cài đặt PWA trên Điện thoại (iOS / Android)

Ứng dụng hỗ trợ Progressive Web App đầy đủ, cho phép cài đặt vào màn hình chính hoạt động toàn màn hình như ứng dụng native:

### Trên iPhone / iPad (Safari)
1. Mở Safari và truy cập vào trang web ứng dụng.
2. Nhấn vào nút **Chia sẻ** (biểu tượng hình vuông có mũi tên trỏ lên) ở thanh điều hướng dưới cùng.
3. Cuộn xuống và chọn **Thêm vào MH chính** (Add to Home Screen).
4. Nhấn **Thêm** (Add) ở góc phải trên. Biểu tượng ứng dụng sẽ xuất hiện trên màn hình chính của bạn.

### Trên điện thoại Android (Chrome / Brave)
1. Mở trình duyệt Chrome và truy cập vào trang web ứng dụng.
2. Nhấn vào biểu tượng **Menu 3 chấm** ở góc trên bên phải.
3. Chọn **Cài đặt ứng dụng** (Install app) hoặc **Thêm vào Màn hình chính** (Add to Home screen).
4. Xác nhận cài đặt.

---

## Sao lưu và Khôi phục Dữ liệu (Backup & Restore)

Ứng dụng cung cấp các công cụ xuất và nhập dữ liệu mạnh mẽ, đảm bảo dữ liệu học tập của bạn luôn an toàn:

### 1. Xuất/Nhập từng bộ thẻ qua CSV
- Trong trang chi tiết học phần, nhấn vào biểu tượng **Tải xuống (Export CSV)** để tải về file CSV chuẩn UTF-8 bao gồm các cột: `term, definition, phonetic, part_of_speech, example`.
- Khi tạo hoặc chỉnh sửa học phần, bạn có thể chọn tính năng **Thêm hàng loạt (Bulk Add)** để dán danh sách hoặc tải file CSV lên để nhập tự động.

### 2. Sao lưu toàn bộ tài khoản qua JSON (Full Backup)
- Vào mục **Cài đặt (Settings)** ➔ **Sao lưu & Khôi phục dữ liệu**.
- Nhấn **Xuất dữ liệu dự phòng (JSON)**: Hệ thống sẽ tải về file `quizlet-backup-[date].json` chứa toàn bộ các học phần, thẻ ghi nhớ, thư mục, tiến độ lặp lại ngắt quãng (SRS) và lịch sử ôn tập.
- Để khôi phục: Chọn file JSON đã sao lưu và nhấn **Khôi phục dữ liệu**.

---

## Phím tắt & Thao tác cử chỉ

### Khi học Thẻ ghi nhớ (Flashcards):
- **Phím Space / Enter**: Lật thẻ (Flip) giữa mặt trước và mặt sau.
- **Phím 1**: Đánh giá **Chưa nhớ (Again)**.
- **Phím 2**: Đánh giá **Khó (Hard)** (ở chế độ Ôn tập SRS) hoặc chuyển thẻ trước.
- **Phím 3**: Đánh giá **Nhớ (Good)** (ở chế độ Ôn tập SRS) hoặc chuyển thẻ kế.
- **Phím 4**: Đánh giá **Dễ (Easy)** (ở chế độ Ôn tập SRS).
- **Phím Mũi tên Trái / Phải**: Lùi lại thẻ trước / Chuyển sang thẻ tiếp theo.
- **Phím S**: Phát âm từ vựng (Text-to-Speech / Audio).
- **Phím U**: Hoàn tác (Undo) lượt đánh giá trước đó.
- **Cử chỉ vuốt (Trên điện thoại)**:
  - Vuốt thẻ sang **Phải**: Đã nhớ (Good).
  - Vuốt thẻ sang **Trái**: Chưa nhớ (Again).

### Khi học ở Chế độ Học (Learn Mode):
- **Phím 1 - 4**: Chọn nhanh đáp án trắc nghiệm tương ứng.
- **Phím Enter**: Gửi câu trả lời tự luận hoặc chuyển sang câu hỏi tiếp theo.

---

## Kiểm thử & Đảm bảo chất lượng (Quality Gate)

Dự án tuân thủ quy chuẩn kiểm thử nghiêm ngặt. Để chạy toàn bộ quy trình kiểm tra chất lượng trước khi commit:

```bash
# Chạy toàn bộ Lint, Typecheck và Test
npm run check

# Chạy riêng biệt:
npm run lint         # Kiểm tra chuẩn mã nguồn ESLint
npm run typecheck    # Kiểm tra kiểu dữ liệu TypeScript
npm run test         # Chạy toàn bộ 15 suites và 108+ unit/integration tests qua Vitest
npm run build        # Build production kiểm tra biên dịch 33+ trang và API routes
```

---

## Giấy phép (License)

Dự án được phân phối dưới giấy phép mã nguồn mở MIT.
