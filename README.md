# TrRPG — Dịch trực tiếp game RPG Maker MV/MZ

Plugin dịch **runtime** cho game RPG Maker MV/MZ: chơi game tiếng Anh/Nhật/Trung, đọc **tiếng Việt trực tiếp trong game**, không cần tool ngoài, không cần sửa file game.

## ✨ Tính năng

- **Ép hiện tiếng Việt** — hội thoại, lựa chọn, thông báo đợi dịch xong mới hiện, không nhấp nháy tiếng Anh gốc
- **3 engine miễn phí**: Google Dịch, Bing Microsoft, Index-Translate 35B (AI)
- **Từ điển Việt sẵn** — 50+ từ menu thông dụng (Save→Lưu, Load→Tải...) dịch tức thì, không cần mạng
- **Bắt mọi loại text**: hội thoại chuẩn, lựa chọn, chữ chạy, text battle, plugin NotifyMessage/TextPicture, database (item/skill/quái...), tên map, System.json
- **An toàn**: chỉ dịch lớp hiển thị, không động vào logic/code game; bảo vệ control code (`\V[1]`, `\C[3]`...)
- **Chống lag/treo**: cache localStorage, hàng đợi chống 429, watchdog chống treo game
- **Panel cài đặt ⚙** ngay trong game: đổi engine, bật/tắt, xem trạng thái API, xóa cache

## 📦 Cài đặt

1. Copy `TrRPG.js` vào thư mục `js/plugins/` của game
2. Mở RPG Maker → Plugin Manager → thêm **TrRPG** (kéo lên **đầu danh sách** để hiệu quả nhất)
3. Chạy game — xong!

> Cần mạng **lúc dịch lần đầu**. Các lần sau đọc từ cache, không cần mạng.

## ⚙️ Tham số

| Tham số | Mặc định | Mô tả |
|---|---|---|
| Engine | `google` | `google` / `bing` / `indextranslate` |
| Engine dự phòng | `google` | Tự đổi khi engine chính lỗi |
| Ngôn ngữ đích | `vi` | `vi`, `en`, `ja`... |
| Ngôn ngữ gốc | `auto` | Tự nhận diện |
| Số luồng song song | `2` | 1–5, càng cao càng nhanh nhưng dễ bị chặn |
| Chế độ quét mạnh | `false` | Dịch cả text vẽ trực tiếp (quest journal...) |
| Dịch tham số plugin | `false` | ⚠️ Chỉ bật khi hiểu rõ game (có thể chứa code) |

## 🛠 Cách hoạt động

```
Game hiện text → TrRPG chặn lại → từ điển/cached? → có: hiện ngay
                                                   → không: đợi API dịch → hiện tiếng Việt
```

- **Bảo vệ control code**: `\V[1]`, `\N[2]`, `\C[3]`... được thay bằng marker trước khi gửi API, khôi phục sau khi dịch
- **Cache 2 lớp**: RAM + localStorage, không dịch lại câu đã dịch bao giờ
- **Chống 429**: hàng đợi, exponential backoff, tự đổi engine dự phòng

## 📋 Lịch sử phiên bản

- **v1.8.0** — Từ điển Việt sẵn cho từ menu thông dụng
- **v1.7.0** — Tắt dịch tham số plugin mặc định (an toàn); ép hiện tiếng Việt cho NotifyMessage
- **v1.6.0** — Menu tự refresh khi có bản dịch mới
- **v1.5.0** — Dịch tham số plugin (opt-in)
- **v1.4.0** — Chống treo/lag, chẩn đoán API, dịch thêm System.json
- **v1.3.0** — Hỗ trợ plugin TorigoyaMZ_NotifyMessage, TextPicture
- **v1.2.0** — Chữ chạy (scrolling text), text battle, chế độ quét mạnh
- **v1.1.0** — Ép hiện tiếng Việt cho hội thoại/lựa chọn
- **v1.0.0** — Bản đầu tiên

## 📁 File trong repo

- `TrRPG.js` — plugin chính
- `HUONG_DAN.md` — hướng dẫn chi tiết tiếng Việt
- `TrRPG_Offline.py` — tool dự phòng: dịch trực tiếp vào file game (kiểu MTool)
- `test_*.js` — test tự động

## ⚠️ Lưu ý

- Font mặc định của game có thể thiếu dấu tiếng Việt → nếu chữ hiển thị ô vuông, thay font hỗ trợ Unicode cho game
- API miễn phí là không chính thức, có thể bị giới hạn khi dùng quá nhiều

---
Made with ❤️ cho cộng đồng game RPG Maker Việt Nam
