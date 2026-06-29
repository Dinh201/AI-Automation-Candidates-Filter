# Thiết kế Rubric Chấm Điểm CV (AI Screening)

Tài liệu này định nghĩa cấu trúc Rubric, các quy tắc chấm điểm (Scoring Rules), ngưỡng ra quyết định (Decision Thresholds) và ví dụ mẫu theo yêu cầu.

## 1. Rubric Table (Bảng Tiêu Chí)

Hệ thống đánh giá ứng viên dựa trên 3 nhóm điểm chính (Thang điểm 0–10 cho mỗi nhóm). Điểm tổng là trung bình cộng có trọng số hoặc tổng điểm tùy cấu hình, mặc định tổng điểm tối đa là 30.

| Nhóm Điểm | Trọng số (Tham khảo) | Mô tả & Giải thích | Yêu cầu đạt điểm cao (8-10) |
| :--- | :---: | :--- | :--- |
| **1. Job Fit** (Độ khớp công việc) | 50% | Đánh giá năng lực cốt lõi: Kỹ năng chuyên môn, công cụ, số năm kinh nghiệm, và thành tựu trực tiếp liên quan đến JD. | Có toàn bộ kỹ năng cốt lõi. Kinh nghiệm >= yêu cầu. Có thành tựu rõ ràng, số liệu chứng minh. |
| **2. Potential** (Tiềm năng) | 30% | Đánh giá khả năng phát triển: Trình độ học vấn, các dự án cá nhân, portfolio, lộ trình thăng tiến (career path), khả năng học hỏi công nghệ mới. | Portfolio xuất sắc. Thăng tiến nhanh (VD: Junior lên Mid trong 1.5 năm). Có dự án side-project chất lượng. |
| **3. Cultural Fit** (Độ phù hợp văn hóa) | 20% | Đánh giá thái độ, tính ổn định và sự chuyên nghiệp: Cách trình bày CV, mục tiêu nghề nghiệp (Career Objective), mức độ gắn bó (job hopping). | Trình bày CV chỉn chu, logic. Mục tiêu rõ ràng, khớp với định hướng công ty. Không có dấu hiệu nhảy việc liên tục. |

### Tiêu chí chi tiết (0-10)

- **0-3:** Yếu/Không đáp ứng (Trái ngành, không có kỹ năng, CV cẩu thả).
- **4-6:** Trung bình/Cơ bản đáp ứng (Có một vài kỹ năng nhưng thiếu chuyên sâu, kinh nghiệm dưới yêu cầu, trình bày trung bình).
- **7-8:** Tốt/Đáp ứng (Khớp với JD, kinh nghiệm đủ, CV rõ ràng, không nhảy việc).
- **9-10:** Xuất sắc (Vượt mức mong đợi, portfolio ấn tượng, có thành tựu nổi bật).

## 2. Scoring Rules (Quy tắc xử lý tình huống)

AI Candidate Scoring module BẮT BUỘC tuân thủ các quy tắc logic sau:

1. **Ưu tiên Job Fit:** `Job Fit` được đánh giá chủ yếu dựa trên kỹ năng, công cụ, và kinh nghiệm liên quan.
2. **Kỹ năng không liên quan:** Nếu ứng viên liệt kê nhiều kỹ năng nhưng không liên quan đến JD, `Job Fit` phải bị giảm mạnh (điểm <= 4).
3. **Trái ngành hoàn toàn:** Nếu ứng viên trái ngành và không có kỹ năng liên quan trong JD, điểm `Job Fit` KHÔNG được vượt quá **3**.
4. **Thiếu kinh nghiệm (< 1 năm):** Nếu yêu cầu kinh nghiệm cao nhưng ứng viên có dưới 1 năm, điểm `Potential` cần bị giảm, TRỪ KHI ứng viên có portfolio (GitHub/Dribbble/etc) rất mạnh thì giữ nguyên hoặc tăng.
5. **Thiếu Self Introduction:** KHÔNG auto reject. Đánh giá `Cultural Fit` dựa trên văn phong CV, formatting, và các hoạt động ngoại khóa/tình nguyện (nếu có).
6. **Thiếu Career Path:** Suy luận `Potential` và `Cultural Fit` dựa trên timeline làm việc. Sự thăng tiến từ Intern -> Junior -> Mid-level là minh chứng tốt.
7. **Thiếu Skills/Tools rõ ràng:** AI phải tự đọc hiểu các mô tả công việc (bullet points) trong kinh nghiệm để trích xuất ngầm định (VD: "Xây dựng API với Nodejs" -> Kỹ năng Nodejs).
8. **Thiếu cả CV và Form:** Nếu dữ liệu đầu vào quá trống trải (không CV, form sơ sài), `confidence_level` phải đặt là `Low` và set `missing_information = true`.
9. **Portfolio mạnh:** Nếu có link portfolio/dự án cá nhân chất lượng, CỘNG ĐIỂM vào `Job Fit` (như một sự bù đắp kinh nghiệm) và `Potential`, NHƯNG phải trích xuất bằng chứng (link hoặc mô tả dự án).
10. **Job Hopping rõ ràng:** Nếu làm việc tại 3+ công ty nhưng mỗi công ty < 6 tháng (không tính Intern/Freelance), GIẢM điểm `Cultural Fit` (<= 4) và liệt kê rõ vào `hiring_risks`.
11. **Trình bày CV kém:** Nếu formatting cẩu thả, sai lỗi chính tả nhiều, GIẢM điểm `Cultural Fit`.
12. **Evidence-based:** Không được bịa thông tin. Mọi nhận định đều phải có trích dẫn từ văn bản gốc, hoặc ghi `"insufficient evidence"`.

## 3. Decision Thresholds (Ngưỡng ra quyết định)

Hệ thống tính `total_score` theo công thức: 
`total_score = (Job Fit * 0.5) + (Potential * 0.3) + (Cultural Fit * 0.2)` (Thang 10)

Dựa trên `total_score`, hệ thống đề xuất `final_decision`:
- **>= 8.5**: `STRONG HIRE` (Mời phỏng vấn ngay, ưu tiên cao).
- **7.0 - 8.4**: `HIRE` (Đạt yêu cầu, mời phỏng vấn).
- **5.5 - 6.9**: `CONSIDER` (Cân nhắc kỹ, có thể gọi điện pre-screen, HR cần đọc kĩ CV).
- **< 5.5**: `REJECT` (Không đáp ứng yêu cầu).

*(Ghi chú: Nếu `missing_information` là true và `confidence_level` là Low, trạng thái nên được xem xét thủ công bất kể điểm số).*

## 4. Ví dụ 3 Ứng Viên Mẫu (Vị trí: Mid-level React Native Developer)

**JD Yêu cầu:** 2 năm kinh nghiệm React Native, biết Redux, làm việc nhóm tốt, có sản phẩm trên Store là điểm cộng.

### Ứng viên 1: The Perfect Match (Strong Hire)
- **Profile:** 3 năm kinh nghiệm React Native. CV liệt kê 2 app đã lên Store (kèm link). Thăng tiến rõ ràng từ Junior -> Mid tại công ty cũ (làm việc 2.5 năm).
- **Job Fit:** 9/10 (Đủ skill, dư năm kinh nghiệm, có app thật).
- **Potential:** 9/10 (Có sản phẩm thực tế, thăng tiến tốt).
- **Cultural Fit:** 9/10 (Gắn bó 2.5 năm, CV gọn gàng).
- **Total Score:** 9.0 -> `STRONG HIRE`.

### Ứng viên 2: The Job Hopper with Good Skills (Consider)
- **Profile:** 2 năm kinh nghiệm React Native nhưng qua 4 công ty (mỗi nơi 5-6 tháng). Biết Redux, TypeScript. Kỹ năng cứng tốt.
- **Job Fit:** 7.5/10 (Đủ skill theo JD).
- **Potential:** 6/10 (Năng lực có thể tốt nhưng rủi ro không sâu sắc do nhảy dự án nhanh).
- **Cultural Fit:** 3/10 (Dấu hiệu Job hopping rất rõ ràng).
- **Total Score:** 6.15 -> `CONSIDER` (Hiring Risks: Job hopping, cần hỏi kỹ lý do nghỉ việc ở vòng phỏng vấn).

### Ứng viên 3: Trái ngành/Thiếu kinh nghiệm (Reject / Consider for Junior)
- **Profile:** Backend Java Developer 2 năm. Muốn chuyển sang React Native. Tự học React Native 3 tháng, có 1 app to-do nhỏ trên GitHub.
- **Job Fit:** 3/10 (Trái ngành, thiếu kinh nghiệm thực tế chuyên môn).
- **Potential:** 7/10 (Có tinh thần tự học, có portfolio nhỏ chứng minh).
- **Cultural Fit:** 7/10 (Có mục tiêu chuyển ngành rõ, trình bày ổn).
- **Total Score:** 5.0 -> `REJECT` (cho Mid-level) nhưng AI có thể Recommend: "Consider cho vị trí Junior/Fresher".
