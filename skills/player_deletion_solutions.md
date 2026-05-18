# Giải Pháp Xử Lý Khi Vận Động Viên (Player) Bị Xóa

Trong các hệ thống quản lý tài chính và sự kiện (như quản lý buổi chơi cầu lông chia tiền), việc **Xóa cứng (Hard Delete)** một vận động viên ra khỏi cơ sở dữ liệu sẽ gây ra hiện tượng **mất toàn vẹn dữ liệu lịch sử** (Lịch sử thanh toán, doanh thu sân, tiền cầu của các buổi chơi cũ).

Dưới đây là phân tích chi tiết và **2 giải pháp tối ưu nhất** dành cho ứng dụng của bạn.

---

## 🚫 Tại sao KHÔNG NÊN Xóa Cứng (Hard Delete) & Cascade Delete?
Nếu bạn xóa hoàn toàn bản ghi Player và xóa họ khỏi các buổi đấu cũ (hoặc xóa luôn buổi đấu đó):
1. **Lịch sử tài chính bị sai lệch:** Nếu buổi đấu cũ có 4 người, mỗi người chia 50k. Khi xóa đi 1 người, số người tham gia giảm xuống còn 3, tiền chia mỗi người sẽ tự động tăng lên ~66k. Điều này làm sai lệch báo cáo tài chính của quá khứ.
2. **Mất thông tin đối soát:** Bạn không còn biết ai là người đã chơi và đóng tiền vào ngày đó nữa.

---

## 💡 Giải Pháp 1: Soft Delete (Xóa Mềm) — ⭐ KHUYÊN DÙNG LỚN NHẤT

Thay vì xóa hẳn bản ghi khỏi database, bạn chỉ cần đánh dấu vận động viên đó là **đã xóa/ngưng hoạt động** (ví dụ: `isDeleted: true`).

### Cách Hoạt Động:
* **Khi xóa:** Thay vì `deleteOne()`, bạn dùng `updateOne()` để đặt `isDeleted = true`.
* **Khi tạo buổi đấu mới:** Chỉ hiển thị những vận động viên hoạt động (`isDeleted: { $ne: true }`).
* **Khi hiển thị lịch sử:** Vận động viên đó vẫn tồn tại trong cơ sở dữ liệu, vì thế các thông tin như Tên, Số điện thoại, Cấp độ của họ trong các buổi đấu lịch sử vẫn hiển thị hoàn hảo.

### Hướng Dẫn Cấu Trúc Code:

#### 1. Cập nhật API Xóa vận động viên (`PATCH` hoặc đổi `DELETE` thành Xóa mềm)
Trong file [route.ts (players/[id])](file:///Users/votruong/Desktop/ME/me/long-la/src/app/api/players/[id]/route.ts):

```typescript
// Thay vì deleteOne, chúng ta dùng updateOne để chuyển trạng thái
export async function DELETE(_request: Request, context: RouteContext) {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "Chưa đăng nhập" }, { status: 401 });

  const { id } = await context.params;
  if (!ObjectId.isValid(id)) return NextResponse.json({ message: "Vận động viên không hợp lệ" }, { status: 400 });

  const players = await playersCollection();
  const result = await players.updateOne(
    { _id: new ObjectId(id), ownerId: session.sub },
    { $set: { isDeleted: true, deletedAt: new Date() } }
  );

  if (result.matchedCount === 0) {
    return NextResponse.json({ message: "Không tìm thấy vận động viên" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, message: "Đã xóa mềm vận động viên" });
}
```

#### 2. Lọc danh sách Vận động viên khi hiển thị để tạo buổi đấu
Khi lấy danh sách để hiển thị ở Form tạo buổi chơi, bạn chỉ lấy những người chưa bị xóa:
```typescript
const activePlayers = await players.find({ 
  ownerId: session.sub, 
  isDeleted: { $ne: true } // Lọc ra các vận động viên chưa bị xóa
}).toArray();
```

---

## 💡 Giải Pháp 2: Denormalization / Transaction Snapshot (Lưu Bản Chụp Thông Tin)

Bạn lưu trực tiếp thông tin cần thiết (như `name`, `level`) của vận động viên **vào trực tiếp tài liệu buổi chơi (Session Document)** ngay tại thời điểm tạo. 

> 📌 **Ưu điểm lớn:** Dự án của bạn **ĐÃ** được thiết kế một phần theo hướng này! Bạn đã có trường `participants` lưu `displayName` (bản chụp tên của vận động viên lúc chơi).

### Cách Hoạt Động:
* Khi buổi đấu được tạo, bạn chụp lại Tên của họ và lưu vào `participants: [{ playerId, displayName }]`.
* Nếu vận động viên đó bị xóa hẳn khỏi bảng `players`, buổi đấu cũ vẫn lưu giữ giá trị `displayName` là `"Nguyễn Văn A"`, không cần phải truy vấn sang bảng `players` để lấy tên nữa.

### Điều chỉnh để tối ưu hóa Giải pháp này:

Hiện tại, khi cập nhật (`PATCH`) hoặc tạo mới (`POST`) buổi đấu, bạn có đoạn code kiểm tra tính tồn tại của vận động viên trong bảng `players`:
```typescript
if (existingPlayers.length !== selectedPlayerIds.length) {
  return NextResponse.json({ message: "Có vận động viên không tồn tại" }, { status: 400 });
}
```

Nếu một vận động viên đã bị xóa cứng, điều kiện trên sẽ bị lỗi (khiến bạn không thể lưu hoặc chỉnh sửa buổi đấu cũ). 

#### Cách xử lý:
1. **Khi hiển thị lịch sử buổi chơi (GET):** Sử dụng trực tiếp `displayName` được lưu trong `participants` thay vì map lại từ danh sách `players` đang hoạt động.
2. **Khi chỉnh sửa buổi đấu cũ (PATCH):** 
   Tách danh sách vận động viên ra làm 2 nhóm:
   * **Nhóm mới thêm vào:** Bắt buộc phải tồn tại trong bảng `players`.
   * **Nhóm cũ đã có sẵn từ trước:** Giữ nguyên thông tin lưu vết (`displayName`) cũ nếu không có thay đổi.

---

## 🏆 ĐÁNH GIÁ & ĐỀ XUẤT

| Tiêu chí | Giải pháp 1: Soft Delete (Xóa mềm) 🌟 | Giải pháp 2: Snapshot |
| :--- | :--- | :--- |
| **Độ phức tạp code** | **Rất thấp** (chỉ thêm 1 điều kiện lọc `{ isDeleted: { $ne: true } }`) | Trung bình (phải xử lý logic cập nhật phức tạp khi sửa buổi chơi cũ) |
| **Bảo toàn dữ liệu** | **Tuyệt đối** (giữ lại toàn bộ lịch sử) | Tuyệt đối (tuy nhiên nếu đổi tên sẽ không tự động cập nhật trừ khi muốn vậy) |
| **Độ tin cậy** | **Cực kỳ cao** (đây là tiêu chuẩn công nghiệp) | Rất tốt (chuẩn thiết kế NoSQL) |

### Khuyên dùng:
Bạn nên triển khai **Giải pháp 1 (Soft Delete)** vì nó giải quyết triệt để bài toán này một cách tự nhiên nhất, code sạch nhất, hạn chế tối đa bug phát sinh khi viết các API chỉnh sửa buổi đấu (`PATCH`).
