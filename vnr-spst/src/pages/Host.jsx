import { useState, useCallback, useRef, useEffect } from "react";
import "./Host.css";
import MemeDrop, { useMemeDrop } from "../components/MemeDrop.jsx";

function broadcastDiceEvent(data) {
  try {
    const channel = new BroadcastChannel('vnr_dice_sync');
    channel.postMessage(data);
    channel.close();
  } catch (e) {}
  try {
    localStorage.setItem('vnr_dice_event', JSON.stringify({ ...data, _ts: Date.now() }));
  } catch (e) {}
}

function broadcastGameEvent(data) {
  const payload = { ...data, _ts: Date.now() };
  try {
    const channel = new BroadcastChannel('vnr_game_sync');
    channel.postMessage(payload);
    channel.close();
  } catch (e) {}
  try {
    localStorage.setItem('vnr_game_event', JSON.stringify(payload));
  } catch (e) {}
}

/* ─── Dice Modal Styles (injected once) ─── */
const DICE_STYLE = `
  .dice-overlay {
    position: fixed; inset: 0; z-index: 70;
    display: flex; align-items: center; justify-content: center;
    background: rgba(20,16,10,0.6);
    padding: 20px;
  }
  .dice-overlay.hidden { display: none; }
  .dice-modal {
    background: #fdfbf7;
    border: 3px double #141b2c;
    border-radius: 4px;
    padding: 2.5rem;
    max-width: 420px; width: 100%;
    display: flex; flex-direction: column; align-items: center;
    position: relative;
    box-shadow: 0 10px 30px rgba(0,0,0,0.3);
    transform: rotate(-0.4deg);
  }
  .dice-modal-title {
    font-family: 'Noto Serif', serif;
    font-size: 13px; font-weight: 700;
    letter-spacing: 0.1em; text-transform: uppercase;
    color: #554243;
    margin-bottom: 2rem;
    border-bottom: 0.5px solid #887272;
    padding-bottom: 0.5rem;
    width: 100%; text-align: center;
  }
  .dice-close-btn {
    position: absolute; top: 1rem; right: 1rem;
    background: none; border: none; cursor: pointer;
    color: #887272; font-size: 20px; line-height: 1;
    transition: color 0.15s;
  }
  .dice-close-btn:hover { color: #5c0c1c; }
  .dice-scene {
    perspective: 1000px;
    width: 96px; height: 96px;
    margin-bottom: 3rem;
    position: relative;
  }
  .dice-wrapper {
    width: 100%; height: 100%; position: absolute;
  }
  .dice-cube {
    width: 100%; height: 100%; position: absolute;
    transform-style: preserve-3d;
    transition: transform 1500ms ease-out;
  }
  .dice-face {
    position: absolute;
    width: 96px; height: 96px;
    background-color: #faf8ff;
    border: 2px solid #141b2c;
    border-radius: 12px;
    display: flex; align-items: center; justify-content: center;
    font-family: 'Courier New', monospace;
    font-size: 48px; font-weight: bold;
    color: #141b2c;
    text-shadow: 1px 1px 0 rgba(0,0,0,0.4), -0.5px -0.5px 0 rgba(0,0,0,0.2);
    box-shadow: inset 0 0 15px rgba(0,0,0,0.05);
  }
  .dice-face.front  { transform: rotateY(  0deg) translateZ(48px); }
  .dice-face.back   { transform: rotateY(180deg) translateZ(48px); }
  .dice-face.right  { transform: rotateY( 90deg) translateZ(48px); }
  .dice-face.left   { transform: rotateY(-90deg) translateZ(48px); }
  .dice-face.top    { transform: rotateX( 90deg) translateZ(48px); }
  .dice-face.bottom { transform: rotateX(-90deg) translateZ(48px); }
  .dice-shadow {
    position: absolute; bottom: -1.5rem; left: 50%;
    transform: translateX(-50%);
    width: 80px; height: 16px;
    background: rgba(0,0,0,0.2);
    border-radius: 50%;
    filter: blur(4px);
  }
  @keyframes dice-bounce {
    0%   { transform: translate(-120px,-80px) scale(0.6); }
    20%  { transform: translate(100px,60px) scale(1.1); }
    45%  { transform: translate(-60px,-40px) scale(0.85); }
    70%  { transform: translate(40px,30px) scale(1.05); }
    85%  { transform: translate(-15px,-15px) scale(0.95); }
    100% { transform: translate(0,0) scale(1); }
  }
  @keyframes shadow-pulse {
    0%   { transform: translateX(-50%) scale(0.6); opacity: 0.1; }
    20%  { transform: translateX(-50%) scale(1.1); opacity: 0.05; }
    45%  { transform: translateX(-50%) scale(0.85); opacity: 0.15; }
    70%  { transform: translateX(-50%) scale(1.05); opacity: 0.08; }
    85%  { transform: translateX(-50%) scale(0.95); opacity: 0.12; }
    100% { transform: translateX(-50%) scale(1); opacity: 0.1; }
  }
  .dice-bouncing { animation: dice-bounce 1.5s cubic-bezier(0.25,1,0.5,1) forwards; }
  .shadow-rolling { animation: shadow-pulse 1.5s cubic-bezier(0.25,1,0.5,1) forwards; }
  .dice-roll-btn {
    background: #7a2430; color: #fff;
    font-family: 'Noto Serif', serif;
    font-size: 13px; font-weight: 700;
    letter-spacing: 0.1em; text-transform: uppercase;
    padding: 0.75rem 2.5rem;
    border: none; border-radius: 0; cursor: pointer;
    transition: transform 0.15s, box-shadow 0.15s;
    z-index: 10; position: relative;
  }
  .dice-roll-btn:hover { transform: translateY(2px); box-shadow: 0 0 0 2px #141b2c; }
  .dice-roll-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; box-shadow: none; }
  .dice-result {
    margin-top: 1.5rem; height: 2rem;
    display: flex; align-items: center; justify-content: center;
    gap: 0.5rem; z-index: 10;
    transition: opacity 0.3s;
    font-family: 'Noto Serif', serif;
  }
  .dice-result.hidden-result { opacity: 0; }
  .dice-result-num {
    font-size: 32px; font-weight: 700; color: #7a2430; line-height: 1;
  }
  .dice-result-text { font-size: 18px; font-weight: 600; color: #141b2c; }
  .dice-confirm-btn {
    margin-top: 1rem;
    background: transparent; color: #141b2c;
    font-family: 'Noto Serif', serif;
    font-size: 13px; font-weight: 700;
    letter-spacing: 0.1em; text-transform: uppercase;
    padding: 0.5rem 2rem;
    border: 1px solid #887272; border-radius: 0; cursor: pointer;
    transition: background 0.15s;
  }
  .dice-confirm-btn:hover { background: #f1e7cf; }
`;

const QUESTIONS = {
  L: [
    {
      q: "Đại hội đại biểu toàn quốc lần thứ VI của Đảng — khởi xướng đường lối Đổi mới — diễn ra vào tháng, năm nào?",
      options: ["Tháng 12/1986", "Tháng 6/1996", "Tháng 4/2001", "Tháng 12/1991"],
      correct: 0,
      explain:
        "Tháng 12/1986. Đây là đại hội mở đầu công cuộc đổi mới toàn diện đất nước, chuyển từ cơ chế kế hoạch hóa tập trung sang nền kinh tế nhiều thành phần vận hành theo cơ chế thị trường.",
    },
    {
      q: "Đại hội VIII (6/1996) đưa ra nhận định quan trọng nào về chặng đường 10 năm đổi mới (1986–1996)?",
      options: [
        "Nước ta đã cơ bản trở thành nước công nghiệp theo hướng hiện đại",
        "Nền kinh tế đã hội nhập hoàn toàn vào WTO",
        "Nước ta đã ra khỏi khủng hoảng kinh tế – xã hội, tạo tiền đề chuyển sang đẩy mạnh công nghiệp hóa, hiện đại hóa",
        "Đất nước đã hoàn thành công nghiệp hóa, hiện đại hóa",
      ],
      correct: 2,
      explain:
        "Nước ta đã ra khỏi khủng hoảng kinh tế – xã hội, các mục tiêu chủ yếu của chặng đường đầu thời kỳ quá độ đã cơ bản hoàn thành, tạo tiền đề chuyển sang thời kỳ đẩy mạnh công nghiệp hóa, hiện đại hóa.",
    },
    {
      q: "Đại hội VIII xác định nhiệm vụ trung tâm của thời kỳ phát triển mới của đất nước là gì?",
      options: [
        "Phát triển kinh tế thị trường định hướng xã hội chủ nghĩa",
        "Đẩy mạnh công nghiệp hóa, hiện đại hóa đất nước",
        "Hội nhập kinh tế quốc tế toàn diện",
        "Xây dựng nền kinh tế tri thức",
      ],
      correct: 1,
      explain: "Đẩy mạnh công nghiệp hóa, hiện đại hóa đất nước là nhiệm vụ trung tâm được Đại hội VIII xác định.",
    },
    {
      q: "Đại hội VIII đặt mục tiêu phấn đấu đến khoảng năm nào đưa nước ta cơ bản trở thành một nước công nghiệp?",
      options: ["Năm 2000", "Năm 2010", "Năm 2020", "Năm 2030"],
      correct: 2,
      explain: "Năm 2020 — mục tiêu này được Đại hội VIII (1996) đặt ra.",
    },
    {
      q: "Đại hội đại biểu toàn quốc lần thứ IX của Đảng diễn ra vào tháng, năm nào?",
      options: ["Tháng 12/1996", "Tháng 4/2001", "Tháng 4/2006", "Tháng 1/2011"],
      correct: 1,
      explain: "Tháng 4/2001.",
    },
    {
      q: "Đại hội IX chính thức đưa ra khái niệm gì để gọi tên mô hình kinh tế tổng quát của Việt Nam trong thời kỳ quá độ lên chủ nghĩa xã hội?",
      options: [
        "Kinh tế hàng hóa nhiều thành phần",
        "Kinh tế kế hoạch hóa tập trung",
        "Kinh tế thị trường tự do hoàn toàn",
        "Kinh tế thị trường định hướng xã hội chủ nghĩa",
      ],
      correct: 3,
      explain: "Kinh tế thị trường định hướng xã hội chủ nghĩa — khái niệm chính thức được Đại hội IX đưa ra.",
    },
    {
      q: 'Theo Đại hội IX, "định hướng xã hội chủ nghĩa" của nền kinh tế thị trường Việt Nam thể hiện chủ yếu ở điều gì?',
      options: [
        "Ở việc xóa bỏ hoàn toàn kinh tế tư nhân",
        "Ở mục tiêu phát triển (dân giàu, nước mạnh, công bằng, dân chủ, văn minh) và vai trò quản lý, điều tiết của Nhà nước",
        "Ở việc nhà nước trực tiếp định giá toàn bộ hàng hóa",
        "Ở việc chỉ phát triển kinh tế quốc doanh",
      ],
      correct: 1,
      explain:
        "Thể hiện ở mục tiêu phát triển (dân giàu, nước mạnh, xã hội công bằng, dân chủ, văn minh) và vai trò quản lý, điều tiết của Nhà nước theo định hướng đó — chứ không phải là xóa bỏ cơ chế thị trường.",
    },
    {
      q: 'So với cách gọi trước Đại hội IX ("kinh tế hàng hóa nhiều thành phần vận hành theo cơ chế thị trường, có sự quản lý của Nhà nước, theo định hướng xã hội chủ nghĩa"), Đại hội IX đã làm gì với nhận thức lý luận này?',
      options: [
        "Giữ nguyên cách gọi cũ, không thay đổi",
        "Bác bỏ hoàn toàn khái niệm kinh tế thị trường",
        'Khái quát, rút gọn thành khái niệm chính thức, ngắn gọn hơn: "kinh tế thị trường định hướng xã hội chủ nghĩa"',
        "Chuyển sang gọi là kinh tế kế hoạch hóa có điều tiết",
      ],
      correct: 2,
      explain:
        'Đại hội IX đã khái quát, rút gọn thành một khái niệm chính thức, ngắn gọn hơn — đánh dấu bước phát triển quan trọng trong tư duy lý luận của Đảng.',
    },
  ],
  S: [
    {
      q: "Tốc độ tăng trưởng GDP bình quân của Việt Nam giai đoạn 1996–2000 là bao nhiêu %/năm?",
      options: ["5%/năm", "7%/năm", "9%/năm", "4,4%/năm"],
      correct: 1,
      explain: "Khoảng 7%/năm (Tổng cục Thống kê).",
    },
    {
      q: "Tốc độ tăng trưởng GDP bình quân giai đoạn 2001–2005 — thời kỳ thực hiện Nghị quyết Đại hội IX — là bao nhiêu?",
      options: ["6%/năm", "7,5%/năm (riêng 2005 đạt khoảng 8,4%)", "9%/năm", "4,4%/năm"],
      correct: 1,
      explain: "Khoảng 7,5%/năm; riêng năm 2005 đạt khoảng 8,4%.",
    },
    {
      q: "So với giai đoạn đầu đổi mới 1986–1990 (GDP bình quân tăng 4,4%/năm), tốc độ tăng trưởng giai đoạn 1996–2000 cao hơn khoảng bao nhiêu lần?",
      options: ["1,2 lần", "1,6 lần", "2,5 lần", "3 lần"],
      correct: 1,
      explain: "Khoảng 1,6 lần.",
    },
    {
      q: "Quy mô GDP của Việt Nam vào năm 1986 (khi bắt đầu Đổi mới) vào khoảng bao nhiêu?",
      options: ["8 tỷ USD", "26 tỷ USD", "50 tỷ USD", "100 tỷ USD"],
      correct: 0,
      explain: "Khoảng 8 tỷ USD.",
    },
    {
      q: "Cơ quan nào công bố số liệu thống kê chính thức (GDP, cơ cấu kinh tế, tỷ lệ hộ nghèo...) mà nhóm cần trích dẫn khi làm bài thuyết trình?",
      options: ["Ngân hàng Nhà nước Việt Nam", "Bộ Kế hoạch và Đầu tư", "Tổng cục Thống kê (GSO)", "Ủy ban Kinh tế của Quốc hội"],
      correct: 2,
      explain: "Tổng cục Thống kê (GSO — gso.gov.vn).",
    },
    {
      q: "Giai đoạn 2001–2005 diễn ra trong bối cảnh Việt Nam vẫn chịu dư âm của một sự kiện khu vực nào cuối những năm 1990?",
      options: ["Khủng hoảng tài chính châu Á (1997–1998)", "Khủng hoảng dầu mỏ thế giới", "Chiến tranh vùng Vịnh", "Khủng hoảng tài chính toàn cầu 2008"],
      correct: 0,
      explain: "Cuộc khủng hoảng tài chính – kinh tế khu vực châu Á (1997–1998).",
    },
    {
      q: "Ngay sau giai đoạn thực hiện Nghị quyết Đại hội IX (tức khoảng 2006–2010), Việt Nam chuyển từ nhóm nước thu nhập như thế nào sang nhóm nào?",
      options: ["Từ trung bình sang cao", "Từ thấp sang trung bình (thấp)", "Từ nghèo sang thu nhập cao", "Không có sự thay đổi"],
      correct: 1,
      explain: "Từ nhóm nước thu nhập thấp sang nhóm nước có thu nhập trung bình (thấp).",
    },
    {
      q: "Khi trình bày số liệu thống kê trong bài thuyết trình học thuật, nhóm cần lưu ý điều gì?",
      options: [
        "Chỉ cần nêu con số, không cần nêu nguồn",
        "Trích nguồn rõ ràng: tên cơ quan, năm công bố, tài liệu gốc",
        "Lấy số liệu từ mạng xã hội cho nhanh",
        "Làm tròn số liệu tùy ý cho dễ nhớ",
      ],
      correct: 1,
      explain: "Trích nguồn rõ ràng: tên cơ quan, năm công bố, đường dẫn/tài liệu gốc — tránh lấy số liệu từ nguồn không chính thống.",
    },
  ],
  V: [
    {
      q: "Nghị quyết số 57-NQ/TW của Bộ Chính trị (2024) đặt trọng tâm vào lĩnh vực nào?",
      options: [
        "Cải cách hành chính công",
        "Khoa học, công nghệ, đổi mới sáng tạo và chuyển đổi số quốc gia",
        "Phát triển nông nghiệp công nghệ cao",
        "Hội nhập văn hóa quốc tế",
      ],
      correct: 1,
      explain:
        "Nghị quyết 57 tập trung vào đột phá phát triển khoa học, công nghệ, đổi mới sáng tạo và chuyển đổi số quốc gia. Nhóm nên tự tra cứu thêm chỉ tiêu định lượng cập nhật (ví dụ tỷ trọng kinh tế số trong GDP) và nêu được nguồn.",
    },
    {
      q: "Nghị quyết số 68-NQ/TW (2025) đặt mục tiêu gì cho khu vực kinh tế tư nhân?",
      options: [
        "Hạn chế vai trò của kinh tế tư nhân",
        "Kinh tế tư nhân là một động lực quan trọng nhất của nền kinh tế quốc gia",
        "Chuyển kinh tế tư nhân thành kinh tế quốc doanh",
        "Chỉ khuyến khích phát triển doanh nghiệp nhà nước",
      ],
      correct: 1,
      explain:
        "Xác định kinh tế tư nhân là một động lực quan trọng nhất của nền kinh tế quốc gia. Nhóm nên tự đối chiếu số liệu/chỉ tiêu cụ thể (số lượng doanh nghiệp, tỷ trọng đóng góp GDP...) trong văn bản gốc.",
    },
    {
      q: "Điểm giống nhau rõ nhất giữa cách đặt chỉ tiêu kinh tế – xã hội của Đại hội VIII, IX và cách đặt chỉ tiêu chuyển đổi số/kinh tế tư nhân hiện nay là gì?",
      options: [
        "Đều không có chỉ tiêu định lượng cụ thể",
        "Đều có chỉ tiêu định lượng rõ ràng, gắn với mốc thời gian cụ thể",
        "Đều chỉ tập trung vào lĩnh vực quốc phòng",
        "Đều do một tổ chức quốc tế đặt ra",
      ],
      correct: 1,
      explain:
        "Cả hai đều có chỉ tiêu định lượng rõ ràng, chia theo mốc thời gian, gắn với bối cảnh phát triển đất nước; điểm khác có thể nằm ở lĩnh vực trọng tâm, tốc độ thực hiện, mức độ hội nhập quốc tế.",
    },
    {
      q: "Theo tinh thần đặt mục tiêu của Đại hội VIII, IX, một mục tiêu (cá nhân hoặc tổ chức) tốt cần có đặc điểm gì?",
      options: [
        "Chung chung, không cần thời hạn",
        "Cụ thể, đo lường được, có mốc thời gian rõ ràng",
        "Chỉ cần có ý tưởng, không cần hành động cụ thể",
        "Đặt càng nhiều mục tiêu càng tốt, không cần chọn lọc",
      ],
      correct: 1,
      explain:
        'Một mục tiêu tốt cần cụ thể, đo lường được và chia thành các "chặng" thực hiện có mốc thời gian — đúng tinh thần đặt mục tiêu của Đại hội VIII, IX.',
    },
    {
      q: 'Vì sao "đặt mục tiêu có thể đo lường và kiên trì thực hiện theo từng chặng" lại là một bài học có giá trị, không chỉ với quốc gia mà cả với cá nhân?',
      options: [
        "Vì giúp đánh giá được tiến độ, điều chỉnh kịp thời và tạo động lực hoàn thành",
        "Vì làm cho mục tiêu trở nên phức tạp, khó thực hiện hơn",
        "Vì không cần theo dõi kết quả trong quá trình thực hiện",
        "Vì bài học này chỉ có giá trị với tổ chức, không áp dụng được cho cá nhân",
      ],
      correct: 0,
      explain:
        "Đặt mục tiêu đo lường được và chia chặng giúp đánh giá tiến độ, điều chỉnh kịp thời và tạo động lực hoàn thành — áp dụng được cả ở cấp quốc gia lẫn cá nhân.",
    },
    {
      q: "Nếu là người soạn thảo văn kiện Đại hội (giả định năm nay), chỉ tiêu nào sau đây phù hợp nhất với tinh thần công nghiệp hóa, hiện đại hóa gắn với chuyển đổi số?",
      options: [
        "Phát triển kinh tế số nhưng không cần đặt chỉ tiêu cụ thể",
        "Tăng tỷ trọng kinh tế số trong GDP lên một mức cụ thể trong 5 năm tới",
        "Giữ nguyên hiện trạng, không đặt thêm mục tiêu mới",
        "Chỉ tập trung chỉ tiêu vào xuất khẩu nông sản",
      ],
      correct: 1,
      explain:
        "Một chỉ tiêu định lượng cụ thể, có mốc thời gian (ví dụ tỷ trọng kinh tế số trong GDP) mới đúng tinh thần đặt mục tiêu của các kỳ Đại hội. Khuyến khích nhóm đề xuất con số và giải thích tính khả thi.",
    },
  ],
};

const CAT_NAME = { L: "Lý luận", S: "Số liệu thống kê", V: "Vận dụng hiện nay" };
const CAT_COLOR = { L: "#7A2430", S: "#1F4E66", V: "#3F5D45" };
const TOTAL_CARDS = 35;

const DEFAULT_TEAMS = [
  { id: "red", name: "Đội Đỏ", color: "#7A2430", score: 0 },
  { id: "blue", name: "Đội Xanh", color: "#1F4E66", score: 0 },
  { id: "yellow", name: "Đội Vàng", color: "#B8860B", score: 0 },
  { id: "purple", name: "Đội Tím", color: "#4A3A6B", score: 0 },
  { id: "orange", name: "Đội Cam", color: "#D97706", score: 0 },
  { id: "pink", name: "Đội Hồng", color: "#DB2777", score: 0 },
  { id: "lam", name: "Đội Lam", color: "#2563EB", score: 0 },
];

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildCardPool() {
  let pool = [];
  ["L", "S", "V"].forEach((cat) => {
    QUESTIONS[cat].forEach((item) =>
      pool.push({ cat, q: item.q, options: item.options, correct: item.correct, explain: item.explain })
    );
  });
  const combined = shuffle(pool).concat(shuffle(pool));
  return combined.slice(0, TOTAL_CARDS).map((item, i) => ({
    num: i + 1,
    cat: item.cat,
    q: item.q,
    options: item.options,
    correct: item.correct,
    explain: item.explain,
    used: false,
  }));
}

function buildEffectDefs() {
  return [
    ...Array(12).fill(null).map(() => ({
      type: "points",
      icon: "🎲",
      label: "Rút Điểm May Mắn",
      desc: "Tung xúc xắc để nhận điểm từ 1 đến 5.",
    })),
    ...Array(4).fill(null).map(() => ({
      type: "dice_subtract",
      icon: "🎲",
      label: "Tung Xúc Xắc Trừ Điểm",
      desc: "Tung xúc xắc để trừ 1 đến 5 điểm.",
    })),
    ...Array(3).fill(null).map(() => ({
      type: "lose_all",
      icon: "💥",
      label: "Mất Hết Điểm",
      desc: "Toàn bộ điểm hiện có của đội trở về 0.",
    })),
    ...Array(3).fill(null).map(() => ({
      type: "reset",
      icon: "♻️",
      label: "Reset Điểm",
      desc: "Điểm số của TẤT CẢ các đội đều trở về 0.",
    })),
    ...Array(4).fill(null).map(() => ({
      type: "steal",
      icon: "🗡️",
      label: "Cướp Điểm",
      desc: "Chọn 1 đội khác để cướp 5 điểm (nếu đội đó có ít hơn 5 thì lấy hết).",
    })),
    ...Array(3).fill(null).map(() => ({
      type: "swap",
      icon: "🔄",
      label: "Đổi Điểm",
      desc: "Chọn 1 đội khác để hoán đổi toàn bộ điểm số.",
    })),
  ];
}

function drawEffectCard(effectOrder, setEffectOrder) {
  if (effectOrder.length === 0) {
    const defs = buildEffectDefs();
    const newOrder = shuffle(defs.map((_, i) => i));
    const idx = newOrder.pop();
    setEffectOrder(newOrder);
    return defs[idx];
  }
  const idx = effectOrder[effectOrder.length - 1];
  setEffectOrder(effectOrder.slice(0, -1));
  return buildEffectDefs()[idx];
}

export default function Host() {
  const [teams, setTeams] = useState(() => DEFAULT_TEAMS.map((t) => ({ ...t })));
  const [currentTeam, setCurrentTeam] = useState(0);
  const [cards, setCards] = useState(() => buildCardPool());
  const [effectOrder, setEffectOrder] = useState([]);

  const [showOverlay, setShowOverlay] = useState(false);
  const [pendingCard, setPendingCard] = useState(null);
  const [attemptOrder, setAttemptOrder] = useState([]);
  const [attemptIdx, setAttemptIdx] = useState(0);
  const [answeringTeam, setAnsweringTeam] = useState(null);
  const [optionStates, setOptionStates] = useState([]);
  const [showExplain, setShowExplain] = useState(false);
  const [effectLaunched, setEffectLaunched] = useState(false);
  const [closeNoEffect, setCloseNoEffect] = useState(false);
  const [attemptLabel, setAttemptLabel] = useState("");

  const [showEffectOverlay, setShowEffectOverlay] = useState(false);
  const [effectDef, setEffectDef] = useState(null);
  const [effectTeam, setEffectTeam] = useState(null);
  const [effectResult, setEffectResult] = useState(null);
  const [showEffContinue, setShowEffContinue] = useState(false);
  const [effBodyButtons, setEffBodyButtons] = useState(null);

  // ── Dice Modal state ──
  const [showDiceModal, setShowDiceModal] = useState(false);
  const [diceRolling, setDiceRolling] = useState(false);
  const [diceValue, setDiceValue] = useState(null);
  const [diceResultVisible, setDiceResultVisible] = useState(false);
  const [diceSubtract, setDiceSubtract] = useState(false);
  const cubeRef = useRef(null);
  const wrapperRef = useRef(null);
  const shadowRef = useRef(null);

  // ── Meme Drop state ──
  const { activeMemes, addMeme } = useMemeDrop();

  // ── Listen for meme drops from Play pages ──
  useEffect(() => {
    const handleMemeSync = (data) => {
      if (data?.type === 'MEME_DROP') {
        addMeme({
          teamId: data.teamId,
          teamName: data.teamName,
          teamColor: data.teamColor,
          memeId: data.memeId,
          x: data.x,
        });
      }
    };

    let channel;
    try {
      channel = new BroadcastChannel('vnr_meme_sync');
      channel.onmessage = (e) => { if (e.data) handleMemeSync(e.data); };
    } catch (e) {}

    const handleStorage = (e) => {
      if (e.key === 'vnr_meme_event' && e.newValue) {
        try { handleMemeSync(JSON.parse(e.newValue)); } catch (err) {}
      }
    };
    window.addEventListener('storage', handleStorage);

    return () => {
      if (channel) channel.close();
      window.removeEventListener('storage', handleStorage);
    };
  }, [addMeme]);

  const [showWinner, setShowWinner] = useState(false);
  const [winnerName, setWinnerName] = useState("");
  const [rankList, setRankList] = useState([]);

  const nextTurn = useCallback(() => {
    setCurrentTeam((prev) => {
      const next = (prev + 1) % teams.length;
      setAttemptLabel(teams[next].name);
      return next;
    });
  }, [teams]);

  const finishOrNext = useCallback((winnerTeamIdx) => {
    if (cards.every((c) => c.used)) {
      const ranked = [...teams].sort((a, b) => b.score - a.score);
      setWinnerName(ranked[0].name);
      setRankList(ranked);
      setShowWinner(true);
      return;
    }
    if (typeof winnerTeamIdx === 'number') {
      setCurrentTeam(winnerTeamIdx);
      setAttemptLabel(teams[winnerTeamIdx].name);
    } else {
      nextTurn();
    }
  }, [cards, teams, nextTurn]);

  const updateTeamName = (idx, name) => {
    setTeams((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], name: name || "Đội " + (idx + 1) };
      return next;
    });
  };

  const openQuestionCard = (num) => {
    const card = cards.find((c) => c.num === num);
    if (!card || card.used) return;
    const order = teams.map((_, i) => (currentTeam + i) % teams.length);
    setPendingCard(card);
    setAttemptOrder(order);
    setAttemptIdx(0);
    setAnsweringTeam(order[0]);
    setOptionStates(card.options.map(() => ""));
    setShowExplain(false);
    setEffectLaunched(false);
    setCloseNoEffect(false);
    setAttemptLabel(teams[order[0]].name);
    setShowOverlay(true);

    // Broadcast câu hỏi cho Play.jsx
    broadcastGameEvent({
      type: 'QUESTION_OPEN',
      card: {
        q: card.q,
        options: card.options,
        correct: card.correct,
        num: card.num,
        cat: card.cat,
      },
      attemptOrder: order,
      currentTeamIdx: order[0],
      teamName: teams[order[0]].name,
      teams: teams.map(({ id, name, color, score }) => ({ id, name, color, score })),
    });
  };

  const handleOptionClick = (idx) => {
    if (optionStates[idx] !== "") return;
    const card = pendingCard;
    if (!card) return;

    if (idx === card.correct) {
      const newStates = [...optionStates];
      newStates[idx] = "correct";
      setOptionStates(newStates);
      setShowExplain(true);
      setEffectLaunched(true);
      // Broadcast kết quả đúng cho Play
      broadcastGameEvent({
        type: 'ANSWER_RESULT',
        isCorrect: true,
        optionIdx: idx,
        winnerTeamIdx: answeringTeam,
      });
    } else {
      const newStates = [...optionStates];
      newStates[idx] = "wrong";
      setOptionStates(newStates);
      const nextIdx = attemptIdx + 1;
      if (nextIdx < attemptOrder.length) {
        setAttemptIdx(nextIdx);
        setAnsweringTeam(attemptOrder[nextIdx]);
        setAttemptLabel(teams[attemptOrder[nextIdx]].name);
        // Báo Play.jsx chuyển lượt
        broadcastGameEvent({
          type: 'ANSWER_RESULT',
          isCorrect: false,
          optionIdx: idx,
          nextTeamIdx: attemptOrder[nextIdx],
        });
      } else {
        const finalStates = [...newStates];
        finalStates[card.correct] = "correct";
        setOptionStates(finalStates);
        setShowExplain(true);
        setAttemptLabel("Không đội nào trả lời đúng.");
        setCloseNoEffect(true);
        broadcastGameEvent({
          type: 'ANSWER_RESULT',
          isCorrect: false,
          optionIdx: idx,
          noWinner: true,
          correctIdx: card.correct,
        });
      }
    }
  };

  // Lắng nghe đáp án từ Play.jsx
  const pendingCardRef = useRef(null);
  const optionStatesRef = useRef([]);
  const attemptIdxRef = useRef(0);
  const attemptOrderRef = useRef([]);
  const answeringTeamRef = useRef(null);
  const finishOrNextRef = useRef(finishOrNext);

  useEffect(() => { pendingCardRef.current = pendingCard; }, [pendingCard]);
  useEffect(() => { optionStatesRef.current = optionStates; }, [optionStates]);
  useEffect(() => { attemptIdxRef.current = attemptIdx; }, [attemptIdx]);
  useEffect(() => { attemptOrderRef.current = attemptOrder; }, [attemptOrder]);
  useEffect(() => { answeringTeamRef.current = answeringTeam; }, [answeringTeam]);
  useEffect(() => { finishOrNextRef.current = finishOrNext; }, [finishOrNext]);

  useEffect(() => {
    let channel;
    const processPlayAnswer = (data) => {
      if (data?.type !== 'PLAY_ANSWER') return;
      // Chỉ xử lý nếu đang có câu hỏi mở
      if (!pendingCardRef.current) return;
      handleOptionClickRef.current(data.optionIdx);
    };
    try {
      channel = new BroadcastChannel('vnr_game_sync');
      channel.onmessage = (e) => { if (e.data) processPlayAnswer(e.data); };
    } catch (e) {}
    const handleStorage = (ev) => {
      if (ev.key === 'vnr_play_answer' && ev.newValue) {
        try { processPlayAnswer(JSON.parse(ev.newValue)); } catch (_) {}
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => {
      if (channel) channel.close();
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  // Ref để tránh stale closure trong listener
  const handleOptionClickRef = useRef(handleOptionClick);
  useEffect(() => { handleOptionClickRef.current = handleOptionClick; }, [handleOptionClick]);

  const handleDrawEffect = () => {
    setCards((prev) => prev.map((c) => (c.num === pendingCard.num ? { ...c, used: true } : c)));
    setShowOverlay(false);
    openEffectCard(answeringTeam);
  };

  const handleCloseNoEffect = () => {
    setCards((prev) => prev.map((c) => (c.num === pendingCard.num ? { ...c, used: true } : c)));
    setShowOverlay(false);
    finishOrNext();
  };

  const openEffectCard = (teamIdx) => {
    const def = drawEffectCard(effectOrder, setEffectOrder);
    setEffectDef(def);
    setEffectTeam(teamIdx);
    setEffectResult(null);
    setShowEffContinue(false);

    if (def.type === "points" || def.type === "dice_subtract") {
      setEffBodyButtons("dice");
    } else if (def.type === "lose_all") {
      setTeams((prev) => {
        const next = [...prev];
        next[teamIdx] = { ...next[teamIdx], score: 0 };
        return next;
      });
      setEffectResult(`${teams[teamIdx].name} mất hết điểm!`);
      setShowEffContinue(true);
      setEffBodyButtons(null);
    } else if (def.type === "reset") {
      setTeams((prev) => prev.map((t) => ({ ...t, score: 0 })));
      setEffectResult("Điểm của tất cả các đội đã reset về 0!");
      setShowEffContinue(true);
      setEffBodyButtons(null);
    } else if (def.type === "steal") {
      setEffBodyButtons("steal");
    } else if (def.type === "swap") {
      setEffBodyButtons("swap");
    }
    setShowEffectOverlay(true);
  };

  // Open the 3-D dice modal (called from effect card)
  const openDiceModal = () => {
    setDiceValue(null);
    setDiceResultVisible(false);
    setDiceRolling(false);
    setDiceSubtract(effectDef?.type === 'dice_subtract');
    if (cubeRef.current) cubeRef.current.style.transform = 'rotateX(0deg) rotateY(0deg)';
    setShowDiceModal(true);
  };

  // Synchronized dice roll handler from Play.jsx
  const handleSyncDice = useCallback((data) => {
    if (data?.type === 'DICE_ROLL_START') {
      const { score, rx, ry, teamIdx, teamName } = data;
      const targetTeamIdx = effectTeam !== null ? effectTeam : (teamIdx !== undefined ? teamIdx : currentTeam);

      // Hiện modal trước, chờ React render visible rồi mới animate
      setDiceValue(null);
      setDiceResultVisible(false);
      setDiceRolling(true);
      setShowDiceModal(true);

      // Đợi 1 frame để React render overlay visible
      requestAnimationFrame(() => {
        // Reset cube về 0 tức thì (tắt transition để không animate về 0)
        if (cubeRef.current) {
          cubeRef.current.style.transition = 'none';
          cubeRef.current.style.transform = 'rotateX(0deg) rotateY(0deg)';
          cubeRef.current.offsetHeight; // force reflow → apply instant
          cubeRef.current.style.transition = '';
        }
        // Bây giờ cube đã ở 0, thêm animation + set rotation mới
        if (wrapperRef.current) wrapperRef.current.classList.add('dice-bouncing');
        if (shadowRef.current) shadowRef.current.classList.add('shadow-rolling');
        if (cubeRef.current) cubeRef.current.style.transform = `rotateX(${rx}deg) rotateY(${ry}deg)`;
      });

      // Sau 1.5s hiện kết quả + trừ/cộng điểm
      setTimeout(() => {
        setDiceValue(score);
        setDiceResultVisible(true);
        setDiceRolling(false);
        if (wrapperRef.current) wrapperRef.current.classList.remove('dice-bouncing');
        if (shadowRef.current) shadowRef.current.classList.remove('shadow-rolling');

        const isSubtract = effectDef?.type === 'dice_subtract';
        const delta = isSubtract ? -score : score;

        setTeams((prev) => {
          const next = [...prev];
          if (next[targetTeamIdx]) {
            next[targetTeamIdx] = { ...next[targetTeamIdx], score: Math.max(0, next[targetTeamIdx].score + delta) };
          }
          return next;
        });

        const targetName = teamName || teams[targetTeamIdx]?.name || `Đội ${targetTeamIdx + 1}`;
        const sign = isSubtract ? '-' : '+';
        setEffectResult(`🎲 ${score} — ${targetName} ${sign}${score} điểm!`);
        setShowEffContinue(true);
        setEffBodyButtons(null);
      }, 1500);
    } else if (data?.type === 'DICE_CONFIRM') {
      setShowDiceModal(false);
      if (pendingCardRef.current && optionStatesRef.current.includes("correct")) {
        setCards((prev) => prev.map((c) => (c.num === pendingCardRef.current.num ? { ...c, used: true } : c)));
        setShowOverlay(false);
        // Đội trả lời đúng tiếp tục lượt (không chuyển đội)
      }
    }
  }, [effectTeam, currentTeam, teams]);

  useEffect(() => {
    let channel;
    try {
      channel = new BroadcastChannel('vnr_dice_sync');
      channel.onmessage = (e) => {
        if (e.data) handleSyncDice(e.data);
      };
    } catch (err) {}

    const handleStorage = (e) => {
      if (e.key === 'vnr_dice_event' && e.newValue) {
        try {
          const data = JSON.parse(e.newValue);
          handleSyncDice(data);
        } catch (err) {}
      }
    };
    window.addEventListener('storage', handleStorage);

    return () => {
      if (channel) channel.close();
      window.removeEventListener('storage', handleStorage);
    };
  }, [handleSyncDice]);

  // Roll animation + result (Host manual fallback)
  const handleRollDice = () => {
    if (diceRolling) return;
    setDiceRolling(true);
    setDiceResultVisible(false);

    const face = Math.floor(Math.random() * 6) + 1;
    // The actual score uses 1-5; face 6 → treated as 5
    const score = Math.min(face, 5);

    let rx = 1440, ry = 1440;
    switch (face) {
      case 1: break;
      case 6: ry += 180; break;
      case 3: ry -= 90;  break;
      case 4: ry += 90;  break;
      case 2: rx -= 90;  break;
      case 5: rx += 90;  break;
    }

    broadcastDiceEvent({
      type: 'DICE_ROLL_START',
      face,
      score,
      rx,
      ry,
      teamIdx: effectTeam !== null ? effectTeam : currentTeam,
      teamName: teams[effectTeam !== null ? effectTeam : currentTeam]?.name
    });

    // Reset cube về 0 trước để transition luôn chạy từ điểm đầu
    if (cubeRef.current) cubeRef.current.style.transform = 'rotateX(0deg) rotateY(0deg)';
    // Đợi 1 frame cho browser apply transform 0 rồi mới animate
    requestAnimationFrame(() => {
      if (wrapperRef.current) wrapperRef.current.classList.add('dice-bouncing');
      if (shadowRef.current) shadowRef.current.classList.add('shadow-rolling');
      if (cubeRef.current) cubeRef.current.style.transform = `rotateX(${rx}deg) rotateY(${ry}deg)`;
    });

    setTimeout(() => {
      setDiceValue(score);
      setDiceResultVisible(true);
      setDiceRolling(false);
      if (wrapperRef.current) wrapperRef.current.classList.remove('dice-bouncing');
      if (shadowRef.current) shadowRef.current.classList.remove('shadow-rolling');
    }, 1500);
  };

  // Confirm result: apply score and close modal
  const handleDiceConfirm = () => {
    setShowDiceModal(false);
    const targetIdx = effectTeam !== null ? effectTeam : currentTeam;
    const isSub = effectDef?.type === 'dice_subtract';
    const delta = isSub ? -diceValue : diceValue;
    setTeams((prev) => {
      const next = [...prev];
      if (next[targetIdx]) {
        next[targetIdx] = { ...next[targetIdx], score: Math.max(0, next[targetIdx].score + delta) };
      }
      return next;
    });
    const sign = isSub ? '-' : '+';
    setEffectResult(`🎲 ${diceValue} — ${teams[targetIdx]?.name} ${sign}${diceValue} điểm!`);
    setShowEffContinue(true);
    setEffBodyButtons(null);
    broadcastDiceEvent({
      type: 'DICE_CONFIRM',
      teamIdx: targetIdx,
      score: diceValue
    });
  };

  const handleSteal = (targetIdx) => {
    const target = teams[targetIdx];
    const amt = Math.min(5, target.score);
    setTeams((prev) => {
      const next = [...prev];
      next[effectTeam] = { ...next[effectTeam], score: next[effectTeam].score + amt };
      next[targetIdx] = { ...next[targetIdx], score: next[targetIdx].score - amt };
      return next;
    });
    setEffectResult(`${teams[effectTeam].name} cướp ${amt} điểm từ ${target.name}!`);
    setShowEffContinue(true);
    setEffBodyButtons(null);
  };

  const handleSwap = (targetIdx) => {
    const target = teams[targetIdx];
    setTeams((prev) => {
      const next = [...prev];
      const tmp = next[effectTeam].score;
      next[effectTeam] = { ...next[effectTeam], score: next[targetIdx].score };
      next[targetIdx] = { ...next[targetIdx], score: tmp };
      return next;
    });
    setEffectResult(`${teams[effectTeam].name} đã đổi điểm với ${target.name}!`);
    setShowEffContinue(true);
    setEffBodyButtons(null);
  };

  const handleEffContinue = () => {
    setShowEffectOverlay(false);
    // Đội trả lời đúng tiếp tục lượt — không chuyển đội
  };

  const handleFinish = () => {
    const ranked = [...teams].sort((a, b) => b.score - a.score);
    setWinnerName(ranked[0].name);
    setRankList(ranked);
    setShowWinner(true);
  };

  const handleReset = () => {
    // Xáo trộn ngẫu nhiên thứ tự đội
    const shuffled = shuffle(DEFAULT_TEAMS.map((t) => ({ ...t })));
    setTeams(shuffled);
    setCurrentTeam(0);
    setCards(buildCardPool());
    setEffectOrder([]);
    setShowOverlay(false);
    setShowEffectOverlay(false);
    setShowWinner(false);

    // Broadcast thứ tự mới cho Play.jsx
    const payload = {
      type: 'GAME_RESET',
      teams: shuffled.map(({ id, name, color, score }) => ({ id, name, color, score })),
      _ts: Date.now(),
    };
    try {
      const ch = new BroadcastChannel('vnr_dice_sync');
      ch.postMessage(payload);
      ch.close();
    } catch (e) {}
    try {
      localStorage.setItem('vnr_game_event', JSON.stringify(payload));
      localStorage.setItem('vnr_team_order', JSON.stringify(
        shuffled.map(({ id, name, color, score }) => ({ id, name, color, score }))
      ));
    } catch (e) {}
  };

  const openedCount = cards.filter((c) => c.used).length;

  return (
    <div className="host-wrap">
      <div className="masthead">
        <div>
          <div className="sub">Trò chơi thuyết trình lịch sử Đảng</div>
          <h1>Hành Trình Đổi Mới</h1>
          <div className="sub" style={{ marginTop: 6 }}>
            Đại hội VI (1986) → Đại hội VIII (1996) → Đại hội IX (2001) → 2006
          </div>
        </div>
        <div className="stamp">
          VĂN
          <br />
          KIỆN
          <br />
          ĐẢNG
        </div>
      </div>

      <div className="legend">
        <span style={{ background: CAT_COLOR.L }}>{CAT_NAME.L}</span>
        <span style={{ background: CAT_COLOR.S }}>{CAT_NAME.S}</span>
        <span style={{ background: CAT_COLOR.V }}>{CAT_NAME.V}</span>
      </div>

      <div className="legend effects">
        <span>
          <b style={{ background: "#3F5D45" }} />+1–5 điểm (tung xúc xắc)
        </span>
        <span>
          <b style={{ background: "#9B2335" }} />-1–5 điểm (tung xúc xắc trừ)
        </span>
        <span>
          <b style={{ background: "#B4B2A9" }} />Mất hết điểm
        </span>
        <span>
          <b style={{ background: "#22293A" }} />Reset điểm cả bàn
        </span>
        <span>
          <b style={{ background: "#8A4B08" }} />Cướp điểm
        </span>
        <span>
          <b style={{ background: "#4A3A6B" }} />Đổi điểm
        </span>
      </div>

      <div className="board">
        {cards.map((c) => (
          <div
            key={c.num}
            className={"ncard" + (c.used ? " used" : "")}
            style={{ "--cat-color": CAT_COLOR[c.cat] }}
            onClick={() => !c.used && openQuestionCard(c.num)}
          >
            {c.used ? (
              <>
                <div className="ncard-done">✓</div>
                <div className="ncard-cat">Đã mở</div>
              </>
            ) : (
              <>
                <div className="ncard-num">{c.num}</div>
                <div className="ncard-cat">{CAT_NAME[c.cat]}</div>
              </>
            )}
          </div>
        ))}
      </div>

      <div className="panel">
        <div className="teams">
          <h2>Bảng điểm</h2>
          {teams.map((t, i) => (
            <div key={i} className={"team-row" + (i === currentTeam ? " active" : "")}>
              <div className="team-color" style={{ background: t.color }} />
              <input
                type="text"
                value={t.name}
                onChange={(e) => updateTeamName(i, e.target.value)}
              />
              <span className="team-score">{t.score}</span>
            </div>
          ))}
        </div>

        <div className="controls">
          <h2>Điều khiển ván chơi</h2>
          <div className="turn-label">Lượt chọn lá bài</div>
          <div className="turn-name">{teams[currentTeam].name}</div>
          <div className="progress">
            {openedCount}/{TOTAL_CARDS} lá đã mở
          </div>
          <button className="host-btn ghost" onClick={handleFinish}>
            Kết thúc &amp; xếp hạng
          </button>
          <button className="host-btn ghost" onClick={handleReset}>
            Ván mới
          </button>
          <div className="hint">
            Đội tới lượt chọn 1 lá bài số (1–35), sau đó chọn 1 trong 4 đáp án. Trả lời đúng → bốc 1 lá bài may mắn.
            Trả lời sai → quyền trả lời chuyển sang đội tiếp theo, hiệu ứng chỉ hiện khi có đội trả lời đúng.
          </div>
        </div>
      </div>

      {/* Question Card Overlay */}
      <div className={"overlay" + (showOverlay ? " show" : "")}>
        {pendingCard && (
          <div className={"card cat-" + pendingCard.cat}>
            <div className="card-eyebrow">
              {CAT_NAME[pendingCard.cat]} · Lá số {pendingCard.num}
            </div>
            <div className="card-q">{pendingCard.q}</div>
            <div className="attempt-label">Lượt trả lời: {attemptLabel}</div>

            {/* Options: hiển thị read-only, đánh dấu đúng/sai theo Play */}
            <div className="options">
              {pendingCard.options.map((opt, i) => (
                <div
                  key={i}
                  className={"opt-btn" + (optionStates[i] ? " " + optionStates[i] : "")}
                  style={{ cursor: 'default', opacity: optionStates[i] ? 1 : 0.75 }}
                >
                  {opt}
                  {optionStates[i] === 'correct' && ' ✓'}
                  {optionStates[i] === 'wrong' && ' ✗'}
                </div>
              ))}
            </div>

            {/* Nút ghi đè thủ công nếu Play không kết nối */}
            {!showExplain && !closeNoEffect && (
              <details style={{ marginTop: 12, fontSize: 13, color: '#887272' }}>
                <summary style={{ cursor: 'pointer' }}>Nhập thủ công (khi Play không kết nối)</summary>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
                  {pendingCard.options.map((opt, i) => (
                    <button
                      key={i}
                      className={"opt-btn" + (optionStates[i] ? " " + optionStates[i] : "")}
                      disabled={optionStates[i] !== ""}
                      onClick={() => handleOptionClick(i)}
                      style={{ fontSize: 13 }}
                    >
                      {String.fromCharCode(65 + i)}: {opt.substring(0, 30)}...
                    </button>
                  ))}
                </div>
              </details>
            )}

            <div className={"card-a" + (showExplain ? " show" : "")}>{pendingCard.explain}</div>
            {effectLaunched && (
              <div className="card-actions">
                <div style={{ color: '#7a2430', fontSize: '15px', fontWeight: 'bold' }}>
                  🎲 Đang chờ người chơi tung xúc xắc lấy điểm...
                </div>
              </div>
            )}
            {closeNoEffect && (
              <div className="card-actions">
                <button className="host-btn ghost" onClick={handleCloseNoEffect}>
                  Đóng (không ai trả lời đúng)
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Effect Card Overlay */}
      <div className={"overlay" + (showEffectOverlay ? " show" : "")}>
        {effectDef && (
          <div className="effect-card">
            <div className="eff-target">{teams[effectTeam]?.name} bốc được:</div>
            <div className="eff-label">
              {effectDef.icon} {effectDef.label}
            </div>
            <div className="eff-desc">{effectDef.desc}</div>
            <div className="eff-body">
              {effBodyButtons === "dice" && !showEffContinue && (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px", alignItems: "center", width: "100%" }}>
                  <div style={{ fontSize: "14px", color: "var(--maroon-dark)", fontWeight: "600", padding: "8px 0", textAlign: "center" }}>
                    🎲 Đang chờ người chơi tung xúc xắc trên màn hình Play...
                  </div>
                  <button onClick={openDiceModal} className="host-btn ghost" style={{ fontSize: "12px", width: "auto", padding: "6px 14px" }}>
                    (Hoặc Host tự tung xúc xắc tại đây)
                  </button>
                </div>
              )}
              {effBodyButtons === "steal" &&
                !showEffContinue && (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: "8px", width: "100%" }}>
                    {teams.map(
                      (t, i) =>
                        i !== effectTeam && (
                          <button
                            key={i}
                            style={{ background: t.color, borderColor: t.color, padding: "8px 6px", fontSize: "13px" }}
                            onClick={() => handleSteal(i)}
                          >
                            Cướp từ {t.name} ({t.score}đ)
                          </button>
                        )
                    )}
                  </div>
                )}
              {effBodyButtons === "swap" &&
                !showEffContinue && (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: "8px", width: "100%" }}>
                    {teams.map(
                      (t, i) =>
                        i !== effectTeam && (
                          <button
                            key={i}
                            style={{ background: t.color, borderColor: t.color, padding: "8px 6px", fontSize: "13px" }}
                            onClick={() => handleSwap(i)}
                          >
                            Đổi với {t.name} ({t.score}đ)
                          </button>
                        )
                    )}
                  </div>
                )}
            </div>
            {showEffContinue && (
              <button
                className="host-btn"
                style={{ marginTop: 14 }}
                onClick={handleEffContinue}
              >
                Tiếp tục
              </button>
            )}
          </div>
        )}
      </div>

      {/* Winner Overlay */}
      <div className={"winner" + (showWinner ? " show" : "")}>
        <div className="winner-card">
          <h2>Kết thúc hành trình</h2>
          <div className="name">{winnerName}</div>
          <div>
            {rankList.map((t, i) => (
              <div key={i} className="rank">
                <span>
                  {i + 1}. {t.name}
                </span>
                <span>{t.score} điểm</span>
              </div>
            ))}
          </div>
          <button
            className="host-btn ghost"
            style={{ marginTop: 16 }}
            onClick={() => setShowWinner(false)}
          >
            Đóng
          </button>
        </div>
      </div>

      {/* ── Dice Modal ── */}
      <style>{DICE_STYLE}</style>
      <div className={"dice-overlay" + (showDiceModal ? "" : " hidden")}>
        <div className="dice-modal">
          <button className="dice-close-btn" onClick={() => !diceRolling && setShowDiceModal(false)}>✕</button>
          <div className="dice-modal-title">
            Gieo Xúc Xắc — {effectTeam !== null ? teams[effectTeam]?.name : (teams[currentTeam]?.name || "")}
          </div>

          {/* 3-D Dice */}
          <div className="dice-scene">
            <div className="dice-wrapper" ref={wrapperRef}>
              <div className="dice-cube" ref={cubeRef}>
                <div className="dice-face front">1</div>
                <div className="dice-face back">6</div>
                <div className="dice-face right">3</div>
                <div className="dice-face left">4</div>
                <div className="dice-face top">2</div>
                <div className="dice-face bottom">5</div>
              </div>
            </div>
            <div className="dice-shadow" ref={shadowRef} />
          </div>

          <div className={"dice-result" + (diceResultVisible ? "" : " hidden-result")}>
            <span className="dice-result-text">{diceSubtract ? 'Trừ' : 'Tiến lên'}</span>
            <span className="dice-result-num" style={diceSubtract ? {color:'#9B2335'} : {}}>{diceValue ?? ""}</span>
            <span className="dice-result-text">bước</span>
          </div>

          {diceResultVisible && (
            <button className="dice-confirm-btn" onClick={handleDiceConfirm}>
              Xác nhận {diceSubtract ? '-' : '+'} {diceValue} điểm
            </button>
          )}
        </div>
      </div>

      {/* Meme Drop Overlay */}
      <MemeDrop activeMemes={activeMemes} />
    </div>
  );
}
