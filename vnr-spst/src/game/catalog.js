// 35 câu hỏi chủ đề "Gia đình Việt Nam trong thời kỳ quá độ lên chủ nghĩa xã hội".
// Một nhóm duy nhất (không còn chia L / S / V) và KHÔNG có phần giải thích: bộ
// câu hỏi gốc chỉ có câu hỏi + 4 đáp án + đáp án đúng. Thứ tự phương án A–D
// được giữ nguyên như bản gốc nên `correct` khớp đúng ký hiệu đáp án (A=0 … D=3).
export const QUESTIONS = [
  {
    q: "Trong thời kỳ quá độ lên chủ nghĩa xã hội, gia đình Việt Nam được xem là hình thái gia đình nào trong bước chuyển biến xã hội?",
    options: [
      "Gia đình truyền thống mở rộng",
      'Gia đình "quá độ" từ xã hội nông nghiệp cổ truyền sang xã hội công nghiệp hiện đại',
      "Gia đình phụ quyền tuyệt đối",
      "Gia đình hiện đại phương Tây",
    ],
    correct: 1,
  },
  {
    q: "Kiểu loại hình gia đình nào hiện đang trở nên rất phổ biến ở cả đô thị và nông thôn Việt Nam hiện nay?",
    options: [
      "Gia đình lớn ba, bốn thế hệ",
      "Gia đình mẫu hệ tập trung",
      "Gia đình đơn (gia đình hạt nhân)",
      "Gia đình phức hợp đa thế hệ",
    ],
    correct: 2,
  },
  {
    q: "Đặc điểm nổi bật nhất về quy mô của gia đình Việt Nam hiện đại so với gia đình truyền thống xưa là gì?",
    options: [
      "Quy mô ngày càng mở rộng, số thế hệ cùng chung sống tăng lên",
      "Giữ nguyên mô hình ba đến bốn thế hệ sống chung dưới một mái nhà",
      "Có xu hướng thu nhỏ hơn, phổ biến nhất chỉ có hai thế hệ (cha mẹ – con cái) cùng chung sống",
      "Số lượng con cái trong mỗi gia đình gia tăng đáng kể",
    ],
    correct: 2,
  },
  {
    q: "Theo giáo trình, việc quy mô gia đình ngày càng thu nhỏ lại đem đến tác động tích cực nào sau đây?",
    options: [
      "Giúp gia tăng số lượng lao động sản xuất nông nghiệp trong hộ gia đình",
      "Đề cao sự bình đẳng nam - nữ, tôn trọng đời sống riêng tư và tránh được những mâu thuẫn của gia đình truyền thống",
      "Tăng cường tuyệt đối quyền lực quyết định của người đàn ông trụ cột",
      "Loại bỏ hoàn toàn khoảng cách thế hệ và áp lực việc làm hiện đại",
    ],
    correct: 1,
  },
  {
    q: "Quá trình biến đổi của gia đình hiện nay gây ra phản chức năng (mặt trái) nào đối với tình cảm giữa các thành viên?",
    options: [
      "Khiến các thành viên phụ thuộc hoàn toàn vào nhau về mặt tài chính",
      "Làm mất đi hoàn toàn vai trò giáo dục của nhà trường đối với con cái",
      "Tạo ra sự ngăn cách không gian, các thành viên ít quan tâm, giao tiếp khiến mối quan hệ trở nên rời rạc, lỏng lẻo",
      "Buộc các gia đình phải quay lại lối sống tự cung tự cấp của xã hội cổ truyền",
    ],
    correct: 2,
  },
  {
    q: "Yếu tố nào sau đây không được nhắc đến là nguyên nhân trực tiếp tác động làm biến đổi hôn nhân và gia đình Việt Nam?",
    options: [
      "Cơ chế thị trường",
      "Khoa học công nghệ hiện đại",
      "Toàn cầu hóa",
      "Khủng hoảng môi trường tự nhiên",
    ],
    correct: 3,
  },
  {
    q: "Dưới tác động của đời sống hiện đại, mối quan hệ vợ chồng - gia đình đang có biểu hiện tiêu cực nào?",
    options: [
      "Gắn kết chặt chẽ hơn trước",
      "Trở nên lỏng lẻo",
      "Hoàn toàn phụ thuộc vào gia tộc lớn",
      "Mất đi hoàn toàn chức năng sinh sản",
    ],
    correct: 1,
  },
  {
    q: "Hiện tượng nào sau đây phản ánh mặt trái trong quan hệ hôn nhân hiện nay?",
    options: [
      "Tỷ lệ kết hôn đúng độ tuổi tăng cao",
      "Tỷ lệ ly hôn, ly thân và ngoại tình gia tăng",
      "Mô hình gia đình nhiều thế hệ trở nên phổ biến",
      "Vai trò làm chủ gia đình chỉ do người vợ đảm nhiệm",
    ],
    correct: 1,
  },
  {
    q: "Xu hướng nào sau đây xuất hiện trong đời sống gia đình hiện đại được nêu trong sách?",
    options: [
      "Cấm đoán hoàn toàn việc sống chung trước hôn nhân",
      "Quan hệ tình dục trước hôn nhân, ngoài hôn nhân và chung sống không kết hôn",
      "Chỉ tồn tại duy nhất mô hình gia đình truyền thống",
      "Bắt buộc kết hôn theo sự sắp đặt của cha mẹ",
    ],
    correct: 1,
  },
  {
    q: "Vấn đề xã hội tiêu cực nào đối với người cao tuổi xuất hiện trong bối cảnh gia đình hiện nay?",
    options: [
      "Người già nắm toàn bộ quyền lực gia đình",
      "Người già sống cô đơn",
      "Người già bị ép buộc tham gia thị trường lao động",
      "Người già trở thành chủ thể kinh tế duy nhất",
    ],
    correct: 1,
  },
  {
    q: "Biểu hiện tiêu cực nào ở trẻ em được nhắc đến do tác động của những biến đổi gia đình?",
    options: [
      "Trẻ em sống ích kỷ",
      "Trẻ em độc lập tài chính quá sớm",
      "Trẻ em không tham gia học tập",
      "Trẻ em chỉ gắn bó với gia đình lớn",
    ],
    correct: 0,
  },
  {
    q: "Hệ lụy của những biến đổi tiêu cực đối với gia đình truyền thống là gì?",
    options: [
      "Giá trị truyền thống trong gia đình bị coi nhẹ, gia đình truyền thống bị phá vỡ, lung lay",
      "Gia đình truyền thống được củng cố vững chắc hơn",
      "Các phong tục cổ truyền được khôi phục nguyên vẹn",
      "Tỷ lệ gia đình đa thế hệ tăng nhanh chóng",
    ],
    correct: 0,
  },
  {
    q: "Mô hình hộ gia đình nào sau đây có xu hướng gia tăng trong xã hội Việt Nam hiện nay?",
    options: [
      "Hộ gia đình phong kiến",
      "Hộ gia đình đơn thân, độc thân",
      "Hộ gia đình mẫu hệ cổ truyền",
      "Hộ gia đình bộ tộc",
    ],
    correct: 1,
  },
  {
    q: "Hiện tượng hôn nhân mới nào được ghi nhận gia tăng trong xã hội hiện đại?",
    options: [
      "Tảo hôn theo tập tục cũ",
      "Kết hôn đồng tính",
      "Đa thê hợp pháp",
      "Hôn nhân sắp đặt dòng họ",
    ],
    correct: 1,
  },
  {
    q: "Sức ép nào từ cuộc sống hiện đại khiến hôn nhân trở nên khó khăn với nhiều người?",
    options: [
      "Công việc căng thẳng, không ổn định, di chuyển nhiều",
      "Thiếu các phương tiện khoa học công nghệ",
      "Nền kinh tế khép kín tự cung tự cấp",
      "Sự can thiệp quá mức của cộng đồng làng xã",
    ],
    correct: 0,
  },
  {
    q: "Trong gia đình truyền thống, vị trí và quyền lực của người chồng được thể hiện như thế nào?",
    options: [
      "Bình đẳng tuyệt đối và chia sẻ mọi quyền lực với người vợ",
      "Là trụ cột, nắm giữ mọi quyền lực và quyết định các việc quan trọng",
      "Người chồng chỉ quản lý chi tiêu nội trợ",
      "Người chồng không có quyền sở hữu tài sản",
    ],
    correct: 1,
  },
  {
    q: "Hiện nay, bên cạnh mô hình người chồng làm chủ, gia đình Việt Nam còn tồn tại ít nhất những mô hình nào khác?",
    options: [
      "Mô hình cha mẹ vợ làm chủ và anh em làm chủ",
      "Mô hình người vợ làm chủ và mô hình cả hai vợ chồng cùng làm chủ",
      "Mô hình con cái làm chủ và người giúp việc làm chủ",
      "Mô hình dòng họ làm chủ tập thể",
    ],
    correct: 1,
  },
  {
    q: "Theo quan niệm hiện nay, người chủ gia đình là người có những đặc điểm nào?",
    options: [
      "Là người lớn tuổi nhất trong dòng họ",
      "Người có phẩm chất, năng lực và đóng góp vượt trội, được các thành viên coi trọng",
      "Mặc định luôn là người đàn ông lớn tuổi nhất nhà",
      "Người sở hữu đất đai tổ tiên để lại",
    ],
    correct: 1,
  },
  {
    q: "Trong bối cảnh kinh tế thị trường và hội nhập kinh tế, yếu tố nào đã trở thành đòi hỏi mới về phẩm chất của người lãnh đạo gia đình?",
    options: [
      "Khả năng làm việc nông nghiệp giỏi",
      "Là người kiếm ra nhiều tiền",
      "Khả năng duy trì các nghi lễ truyền thống",
      "Nắm giữ chức vụ hành chính xã hội cao",
    ],
    correct: 1,
  },
  {
    q: "Tác động của vòng xoáy đồng tiền và vị thế xã hội trong thời kỳ mới đối với gia đình là gì?",
    options: [
      "Làm gắn kết các thế hệ sâu sắc hơn trước",
      "Vô tình đánh mất đi tình cảm gia đình, các thành viên ít quan tâm và ít giao tiếp với nhau",
      "Xóa bỏ hoàn toàn tình trạng bạo lực gia đình",
      "Giúp các thành viên dành nhiều thời gian cho nhau hơn",
    ],
    correct: 1,
  },
  {
    q: "Hiện tượng nào sau đây liên quan đến con cái được nhắc đến như một biểu hiện của sự biến đổi gia đình hiện nay?",
    options: [
      "Sinh nhiều con để nối dõi tông đường",
      "Sinh con ngoài giá thú",
      "Con cái không được phép rời khỏi nhà cha mẹ",
      "Con cái bắt buộc phải kết hôn sớm",
    ],
    correct: 1,
  },
  {
    q: "Những mặt trái và bi kịch gia đình xuất hiện trong xã hội hiện nay gồm có hiện tượng nào sau đây?",
    options: [
      "Tình trạng bạo hành trong gia đình, xâm hại tình dục",
      "Sự gia tăng các nghi lễ gia tộc truyền thống",
      "Sự can thiệp quá mức của hàng xóm láng giềng",
      "Trẻ em phải gánh vác kinh tế thay cha mẹ",
    ],
    correct: 0,
  },
  {
    q: "Trong gia đình truyền thống, ai là người đóng vai trò chủ sở hữu tài sản của gia đình?",
    options: [
      "Người vợ",
      "Người con trưởng trong nhà",
      "Người chồng (người đàn ông)",
      "Cả hai vợ chồng cùng đứng tên",
    ],
    correct: 2,
  },
  {
    q: "Yếu tố nào sau đây quyết định vị trí người chủ gia đình trong xã hội truyền thống trước đây?",
    options: [
      "Năng lực chuyên môn và trình độ học vấn",
      "Giới tính nam và quyền lực gia trưởng của người đàn ông",
      "Đóng góp kinh tế vượt trội của mỗi cá nhân",
      "Sự đồng thuận và biểu quyết bình đẳng giữa các thành viên",
    ],
    correct: 1,
  },
  {
    q: "Điều gì chứng minh cho việc tiêu chuẩn người chủ gia đình hiện nay có tính dân chủ và cởi mở hơn so với trước kia?",
    options: [
      "Người chủ gia đình là người có phẩm chất, năng lực và đóng góp vượt trội được cả nhà coi trọng",
      "Người chủ gia đình mặc định là người nhiều tuổi nhất",
      "Người chủ gia đình bắt buộc phải là nam giới",
      "Người chủ gia đình do chính quyền địa phương chỉ định",
    ],
    correct: 0,
  },
  {
    q: "Hiện tượng nào sau đây phản ánh xu hướng quan hệ hôn nhân mới mẻ nhưng đi kèm nhiều hệ lụy xã hội được nêu trong mục 3?",
    options: [
      "Kết hôn có sự bảo lãnh của dòng tộc",
      "Chung sống không kết hôn và gia tăng số hộ đơn thân, độc thân",
      "Bắt buộc tam đại đồng đường cùng sinh sống",
      "Cha mẹ giữ toàn quyền định đoạt hôn nhân của con cái",
    ],
    correct: 1,
  },
  {
    q: "Sự xuất hiện của mô hình cả hai vợ chồng cùng làm chủ gia đình thể hiện sự biến đổi theo hướng nào?",
    options: [
      "Phá vỡ hoàn toàn mọi trật tự gia đình",
      "Đề cao sự bình đẳng, tiến bộ và chia sẻ trách nhiệm giữa nam và nữ",
      "Làm giảm đi trách nhiệm của cha mẹ đối với con cái",
      "Xóa bỏ hoàn toàn mô hình người đàn ông làm chủ gia đình",
    ],
    correct: 1,
  },
  {
    q: "Nội dung nào sau đây là phương hướng cơ bản thứ nhất trong xây dựng và phát triển gia đình Việt Nam thời kỳ quá độ?",
    options: [
      "Tăng cường sự lãnh đạo của Đảng, nâng cao nhận thức của xã hội về xây dựng và phát triển gia đình Việt Nam",
      "Đẩy mạnh công nghiệp hóa toàn bộ hoạt động kinh tế gia đình",
      "Thay thế hoàn toàn nếp sống truyền thống bằng lối sống hiện đại",
      "Triệt để xóa bỏ mô hình kinh tế hộ gia đình",
    ],
    correct: 0,
  },
  {
    q: "Cấp ủy và chính quyền các cấp cần đưa nội dung, mục tiêu của công tác xây dựng và phát triển gia đình vào đâu?",
    options: [
      "Kế hoạch tài chính dài hạn của các ngân hàng thương mại",
      "Chiến lược phát triển kinh tế - xã hội và chương trình kế hoạch công tác hằng năm của các bộ, ngành, địa phương",
      "Các quy ước riêng của từng dòng họ",
      "Điều lệ của các hội doanh nghiệp tư nhân",
    ],
    correct: 1,
  },
  {
    q: "Đối tượng gia đình nào sau đây được ưu tiên hỗ trợ chính sách phát triển kinh tế gia đình?",
    options: [
      "Gia đình doanh nhân thành đạt ở thành thị",
      "Gia đình liệt sĩ, thương binh, bệnh binh, gia đình các dân tộc ít người, gia đình nghèo, vùng sâu, vùng xa, vùng khó khăn",
      "Gia đình sở hữu nhiều trang trại quy mô lớn",
      "Gia đình chỉ có một thế hệ sinh sống",
    ],
    correct: 1,
  },
  {
    q: "Một trong những biện pháp cụ thể nhằm đẩy mạnh phát triển kinh tế hộ gia đình là gì?",
    options: [
      "Cấm các hộ gia đình tự do tham gia xuất khẩu",
      "Tạo điều kiện thuận lợi cho các hộ gia đình vay vốn ngắn hạn và dài hạn nhằm xóa đói giảm nghèo, chuyển dịch cơ cấu sản xuất",
      "Thu hồi vốn vay đối với các mô hình kinh tế trang trại",
      "Hạn chế sử dụng nguyên liệu sẵn có tại chỗ",
    ],
    correct: 1,
  },
  {
    q: "Phương hướng thứ ba trong xây dựng gia đình Việt Nam hiện nay đặt ra yêu cầu gì đối với các giá trị gia đình?",
    options: [
      "Phủ nhận hoàn toàn các yếu tố của gia đình truyền thống",
      "Kế thừa những giá trị của gia đình truyền thống, đồng thời tiếp thu những tiến bộ của nhân loại về gia đình",
      "Giữ nguyên toàn bộ các phong tục, hủ tục cổ truyền không thay đổi",
      "Sao chép nguyên mẫu mô hình gia đình phương Tây hiện đại",
    ],
    correct: 1,
  },
  {
    q: "Phong trào xây dựng gia đình văn hóa bắt đầu được hình thành từ thời gian và địa phương nào?",
    options: [
      "Những năm 50 của thế kỷ XX tại Hà Nội",
      "Những năm 60 của thế kỷ XX tại một địa phương của tỉnh Hưng Yên",
      "Những năm 80 của thế kỷ XX tại Hải Phòng",
      "Sau năm 1975 tại Thành phố Hồ Chí Minh",
    ],
    correct: 1,
  },
  {
    q: "Tiêu chuẩn cơ bản mà mô hình gia đình văn hóa hướng đến bao gồm những nội dung nào?",
    options: [
      "Gia đình giàu có về tài sản, không tham gia nghĩa vụ công dân",
      "Gia đình ấm no, hòa thuận, tiến bộ, khỏe mạnh và hạnh phúc; thực hiện tốt nghĩa vụ công dân và kế hoạch hóa gia đình; đoàn kết tương trợ trong cộng đồng",
      "Gia đình sở hữu cơ sở sản xuất kinh doanh lớn và sống khép kín",
      "Gia đình chỉ cần duy trì nề nếp gia phong truyền thống mà không cần tiếp thu cái mới",
    ],
    correct: 1,
  },
  {
    q: "Để nâng cao chất lượng phong trào xây dựng gia đình văn hóa, cần kiên quyết tránh xu hướng tiêu cực nào?",
    options: [
      "Công khai hóa các tiêu chí bình xét",
      "Chạy theo thành tích, phản ánh không thực chất phong trào và chất lượng gia đình văn hóa",
      "Áp dụng nguyên tắc dân chủ, công bằng trong bình xét",
      "Lắng nghe tâm tư, nguyện vọng của quần chúng nhân dân",
    ],
    correct: 1,
  },
];

// Bộ câu hỏi giờ chỉ có MỘT nhóm duy nhất (chủ đề gia đình trong thời kỳ quá độ)
// nên tên/màu nhóm rút về một entry: Host hiển thị đúng 1 chip và mọi lá bài
// dùng chung màu nhận diện này. QUESTION_CAT là giá trị gán cho card.cat.
export const QUESTION_CAT = "G";
export const CAT_NAME = { G: "Gia đình thời kỳ quá độ" };
export const CAT_COLOR = { G: "#7A2430" };
// Số lá = số câu: mỗi câu xuất hiện đúng MỘT lần trong ván (xem createShuffledCardDeck).
export const TOTAL_CARDS = QUESTIONS.length;

// Nguồn metadata đội duy nhất của phía JS: /pick-team dùng icon/desc/rotate,
// /pin dùng preview tên đội, DEFAULT_TEAMS (dưới) dùng tên/màu cho hàng teams
// khởi tạo. Thứ tự 0..6 là "N đội ĐẦU TIÊN" khi tạo phòng — PHẢI khớp thứ tự
// key/name/color của JSONB trong create_game (supabase/schema.sql), vì DB chỉ
// giữ bản sao thứ hai của danh sách này; lệch một bên là lệch màu giữa DB và UI.
export const TEAM_CATALOG = [
  {
    id: "red",
    name: "Đội Đỏ",
    color: "#7A2430",
    icon: "star",
    desc: "Lực lượng nòng cốt, tiên phong trong mọi thử thách.",
    rotate: "-0.2deg",
  },
  {
    id: "blue",
    name: "Đội Xanh",
    color: "#1F4E66",
    icon: "menu_book",
    desc: "Trí tuệ chiến lược, nền tảng của tri thức.",
    rotate: "0.4deg",
  },
  {
    id: "yellow",
    name: "Đội Vàng",
    color: "#B8860B",
    icon: "grass",
    desc: "Gắn kết bền bỉ, mang lại sự phồn vinh.",
    rotate: "-0.5deg",
  },
  {
    id: "purple",
    name: "Đội Tím",
    color: "#4A3A6B",
    icon: "local_fire_department",
    desc: "Ngọn đuốc sáng tạo, dẫn lối tương lai.",
    rotate: "0.1deg",
  },
  {
    id: "orange",
    name: "Đội Cam",
    color: "#D97706",
    icon: "flag",
    desc: "Xung kích, đi đầu trong mọi phong trào đổi mới.",
    rotate: "0.3deg",
  },
  {
    id: "pink",
    name: "Đội Hồng",
    color: "#DB2777",
    icon: "favorite",
    desc: "Gắn kết cộng đồng, lan tỏa giá trị nhân văn.",
    rotate: "-0.3deg",
  },
  {
    id: "lam",
    name: "Đội Lam",
    color: "#2563EB",
    icon: "verified_user",
    desc: "Bảo vệ thành quả, giữ vững kỷ cương hệ thống.",
    rotate: "0.2deg",
  },
];

// Public API cũ giữ nguyên — giờ suy ra từ TEAM_CATALOG thay vì literal trùng lặp.
// (Hiện chưa nơi nào import nó; giữ lại để không phá API nếu có code bên ngoài dùng.)
export const DEFAULT_TEAMS = TEAM_CATALOG.map((t) => ({
  id: t.id,
  name: t.name,
  color: t.color,
  score: 0,
}));

// Số đội hợp lệ: 2–7. Giới hạn trên = 7 vì chỉ có 7 bộ metadata (tên/màu/
// icon) trong TEAM_CATALOG; vượt 7 đòi hỏi thiết kế đội mới.
export const MIN_TEAM_COUNT = 2;
export const MAX_TEAM_COUNT = 7;

// Clamp 2–7 + Math.floor + fallback 7 khi NaN — dùng chung cho mọi nơi đọc
// localStorage['vnr_team_count'] (gameRepository, /pin, /host) để không lặp
// logic clamp ở từng call site. Chú ý: raw === null (chưa có key) phải rơi
// về mặc định 7, nhưng Number(null) === 0 nên phải chặn trước khi Number().
export function normalizeTeamCount(raw) {
  if (raw === null || raw === undefined || raw === "") return MAX_TEAM_COUNT;
  const n = Math.floor(Number(raw));
  if (Number.isNaN(n)) return MAX_TEAM_COUNT;
  return Math.max(MIN_TEAM_COUNT, Math.min(MAX_TEAM_COUNT, n));
}

export function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Bộ bài = đúng 35 lá, mỗi câu xuất hiện đúng MỘT lần. Trước đây pool được nhân
// đôi rồi cắt còn 35 lá nên cùng một câu có thể lặp trong một ván; giờ số câu
// (QUESTIONS.length) đã bằng số lá nên chỉ cần xáo một lần.
export function createShuffledCardDeck() {
  return shuffle(QUESTIONS).map((item, index) => ({
    num: index + 1,
    id: `G-${index + 1}`,
    cat: QUESTION_CAT,
    q: item.q,
    options: item.options,
    correct: item.correct,
    used: false,
  }));
}

function buildEffectDefs() {
  const copiesByType = {
    points: 12,
    dice_subtract: 4,
    lose_all: 3,
    reset: 3,
    steal: 4,
    swap: 3,
  };
  return EFFECT_DEFINITIONS.flatMap((effect) =>
    Array.from(
      { length: copiesByType[effect.type] },
      () => ({ ...effect })
    )
  );
}

export const EFFECT_DEFINITIONS = [
  {
    type: "points",
    icon: "🎲",
    label: "Rút Điểm May Mắn",
    desc: "Tung xúc xắc để nhận điểm từ 100 đến 600.",
  },
  {
    type: "dice_subtract",
    icon: "💸",
    label: "Tung Xúc Xắc Trừ Điểm",
    desc: "Tung xúc xắc để trừ từ 100 đến 600 điểm.",
  },
  {
    type: "lose_all",
    icon: "💥",
    label: "Mất Hết Điểm",
    desc: "Toàn bộ điểm hiện có của đội trở về 0.",
  },
  {
    type: "reset",
    icon: "♻️",
    label: "Reset Điểm",
    desc: "Điểm số của TẤT CẢ các đội đều trở về 0.",
  },
  {
    type: "steal",
    icon: "🗡️",
    label: "Cướp Điểm",
    desc: "Chọn 1 đội khác rồi tung xúc xắc — số điểm cướp đúng bằng điểm xúc xắc (nếu đội đó có ít hơn thì lấy hết).",
  },
  {
    type: "swap",
    icon: "🔄",
    label: "Đổi Điểm",
    desc: "Chọn 1 đội khác để hoán đổi toàn bộ điểm số.",
  },
];

export const EFFECT_CARD_DEFINITIONS = buildEffectDefs();

// Màu nhận diện từng loại hiệu ứng — dùng chung cho chú giải Host, banner
// trên lá bài lật và mọi nơi cần phân biệt nhanh 6 loại hiệu ứng.
export const EFFECT_COLORS = {
  points: "#3F5D45",
  dice_subtract: "#9B2335",
  lose_all: "#B4B2A9",
  reset: "#22293A",
  steal: "#8A4B08",
  swap: "#4A3A6B",
  // Không phải 1 trong 6 lá phép — dùng cho luồng thưởng 2 tầng của Host
  // (points_base: xúc xắc Tầng 1 bắt buộc; bonus_choice: màn hình chọn Cơ
  // Hội May Mắn; flat_bonus: thưởng cố định +200đ khi chọn "nhận chắc").
  points_base: "#3F5D45",
  bonus_choice: "#c9a227",
  flat_bonus: "#c9a227",
};

export function createShuffledEffectDeck() {
  return shuffle(EFFECT_CARD_DEFINITIONS);
}

export function getCardByNumber(cardDeck, cardNum) {
  return cardDeck.find((card) => card.num === cardNum) ?? null;
}
