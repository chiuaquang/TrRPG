# TrRPG — Dịch trực tiếp game RPG Maker MV/MZ

Plugin dịch **runtime** cho game RPG Maker MV/MZ: chơi game tiếng Anh/Nhật/Trung, đọc **tiếng Việt trực tiếp trong game**, không cần tool ngoài, không cần sửa file game.

## ✨ Tính năng

- **Dịch ở lớp vẽ chữ (renderHook)** — chặn mọi text vẽ lên cửa sổ (menu custom, Save/Load, lựa chọn do plugin vẽ...), kiểu MTool; tự vẽ lại khi dịch xong
- **Ép hiện tiếng Việt** — hội thoại, lựa chọn, thông báo NotifyMessage đợi dịch xong mới hiện, không nhấp nháy tiếng Anh gốc
- **Tự co chữ vừa khung** — tiếng Việt dài hơn tiếng Anh, plugin tự thu nhỏ cỡ chữ/giữ căn giữa để không bị cắt chữ
- **3 engine miễn phí**: Google Dịch, Bing Microsoft, Index-Translate 35B (AI)
- **Từ điển Việt sẵn (60 từ)** — từ menu thông dụng (Save→Lưu, Load→Tải, Warp→Dịch chuyển...) dịch tức thì, không cần mạng
- **Bắt mọi loại text**: hội thoại chuẩn (101/401), lựa chọn (102), chữ chạy (105/405), text battle, plugin NotifyMessage/TextPicture/DTextPicture, database, tên map, System.json
- **An toàn**: chỉ dịch lớp hiển thị, không động vào logic/code game; bảo vệ control code (`\V[1]`, `\C[3]`...)
- **Chống lag/treo**: cache localStorage, hàng đợi chống 429, tự đổi engine dự phòng, watchdog chống treo, tự tắt hook khi rảnh (`autoOff`)
- **Panel cài đặt ⚙** ngay trong game: đổi engine, bật/tắt, xem trạng thái API (OK/Fail), xóa cache, quét dịch trước

## 📦 Cài đặt

1. Copy `TrRPG.js` vào thư mục `js/plugins/` của game
2. Mở RPG Maker → Plugin Manager → thêm **TrRPG** (kéo lên **đầu danh sách** để hiệu quả nhất)
3. Chạy game — xong!

> Cần mạng **lúc dịch lần đầu**. Các lần sau đọc từ cache, không cần mạng.

## ⚙️ Tham số

| Tham số | Mặc định | Mô tả |
|---|---|---|
| Ngôn ngữ đích | `vi` | `vi`, `en`, `ja`, `ko`, `zh-CN`... |
| Ngôn ngữ gốc | `auto` | Tự nhận diện |
| Engine | `google` | `google` / `bing` / `indextranslate` |
| Engine dự phòng | `google` | Tự đổi khi engine chính lỗi |
| Số luồng song song | `2` | 1–5 |
| Dịch ở lớp vẽ chữ | `true` | **Khuyên dùng** — dịch mọi text vẽ lên cửa sổ |
| Tự tắt khi rảnh | `true` | Hết việc dịch thì dừng hook, đỡ tốn CPU |
| Chế độ quét mạnh | `false` | Mở rộng vùng quét (tốn CPU hơn) |
| Dịch tham số plugin | `false` | ⚠️ Chỉ bật khi hiểu rõ game (params có thể chứa code) |
| Hiện nút cài đặt | `true` | Nút ⚙ trên màn hình |

## 🛠 Cách hoạt động

```
Text vẽ lên cửa sổ → renderHook chặn → từ điển/cached? → có: hiện tiếng Việt ngay
                                                        → không: dịch ngầm → tự vẽ lại cửa sổ
Hội thoại/lựa chọn   → đợi dịch xong mới mở cửa sổ (không nhấp nháy tiếng Anh)
```

- **Bảo vệ control code**: `\V[1]`, `\N[2]`, `\C[3]`, `\n`... được thay bằng marker trước khi gửi API, khôi phục sau khi dịch
- **Cache 2 lớp**: RAM + localStorage — câu đã dịch không bao giờ dịch lại
- **Chống 429**: hàng đợi, exponential backoff, tự đổi engine dự phòng

## 📋 Lịch sử phiên bản

- **v2.2.0** — renderHook: dịch ở lớp vẽ chữ + tự co chữ vừa khung
- **v1.8.0** — Từ điển Việt sẵn cho từ menu thông dụng
- **v1.7.0** — Tắt dịch tham số plugin mặc định (an toàn); ép hiện tiếng Việt cho NotifyMessage
- **v1.6.0** — Menu tự refresh khi có bản dịch mới
- **v1.5.0** — Dịch tham số plugin (opt-in)
- **v1.4.0** — Chống treo/lag, chẩn đoán API, dịch thêm System.json
- **v1.3.0** — Hỗ trợ TorigoyaMZ_NotifyMessage, TextPicture
- **v1.1–1.2** — Ép hiện tiếng Việt, chữ chạy, text battle
- **v1.0.0** — Bản đầu tiên

## 📁 File trong repo

- `TrRPG.js` — plugin chính (v2.2.0)
- `HUONG_DAN.md` — hướng dẫn chi tiết tiếng Việt
- `TrRPG_Offline.py` — tool dự phòng: dịch trực tiếp vào file game

## ⚠️ Lưu ý

- Font mặc định của game có thể thiếu dấu tiếng Việt → nếu chữ hiển thị ô vuông, thay font hỗ trợ Unicode cho game
- API miễn phí là không chính thức, có thể bị giới hạn khi dùng quá nhiều

---
Made with ❤️ cho cộng đồng game RPG Maker Việt Nam
