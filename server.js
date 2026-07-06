const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const axios = require('axios');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// =======================================================
// 🚀 CẤU HÌNH ĐÃ ĐỒNG BỘ THÔNG TIN THẬT 100% CỦA SẾP 🚀
// =======================================================
const TELEGRAM_TOKEN = "8899021077:AAExBxaUDO7iXXAr6Rh9cDTpkLPAG3Rd4Ks"; 
const TELEGRAM_CHAT_ID = "6661039756";
const MK_ADMIN_MUON_DAT = "cfquyy123"; 

// Hàm gửi tin nhắn tự động về Telegram nhóm/chat của mày
async function sendToTelegram(message) {
    try {
        const url = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`;
        await axios.post(url, { chat_id: TELEGRAM_CHAT_ID, text: message });
    } catch (error) {
        console.error("Lỗi gửi Telegram:", error.message);
    }
}

// Database lưu tài khoản tạm thời trong bộ nhớ
const users = {
    "ADMIN": { password: MK_ADMIN_MUON_DAT, balance: 99999999, email: "admin@likechat.site" }
};

// API ĐĂNG KÝ THÀNH VIÊN
app.post('/api/register', async (req, res) => {
    const { username, password, email } = req.body;
    const u = username.toUpperCase().trim();
    if (users[u]) return res.json({ success: false, message: "Tài khoản đã tồn tại!" });
    
    users[u] = { password, balance: 0, email };
    await sendToTelegram(`🔔 CÓ THÀNH VIÊN MỚI!\n👤 Tài khoản: ${u}\n📧 Email: ${email}`);
    return res.json({ success: true, message: "Đăng ký thành công!" });
});

// API ĐĂNG NHẬP HỆ THỐNG
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    const u = username.toUpperCase().trim();
    if (!users[u] || users[u].password !== password) {
        return res.json({ success: false, message: "Sai tài khoản hoặc mật khẩu!" });
    }
    return res.json({ success: true, username: u, balance: users[u].balance });
});

// API ĐẶT ĐƠN TĂNG LIKE/FOLLOW (ĐÃ FIX CHẶN KHI TÀI KHOẢN 0 ĐỒNG)
app.post('/api/order-mxh', async (req, res) => {
    const { username, platform, service, link, quantity, total } = req.body;
    const u = username.toUpperCase().trim();
    
    // Chuyển chuỗi định dạng tiền "25,000 đ" thành số số học thuần 25000 để tính toán
    const cost = parseInt(total.replace(/[^0-9]/g, ''));
    
    if (!users[u]) return res.json({ success: false, message: "Tài khoản không tồn tại!" });
    
    // 🚨 KIỂM TRA SỐ DƯ nghiêm ngặt: Đéo đủ tiền là cook luôn không cho tạo đơn
    if (users[u].balance < cost) {
        return res.json({ success: false, message: `Số dư không đủ! Mày cần thêm ${(cost - users[u].balance).toLocaleString('vi-VN')} đ để hoàn thành đơn.` });
    }
    
    // Khấu trừ tiền trực tiếp vào ví hệ thống
    users[u].balance -= cost;
    
    const msg = `🛒 ĐƠN HÀNG MXH MỚI TỪ: ${u}\n` +
                `🌐 Nền tảng: ${platform.toUpperCase()}\n` +
                `🛠️ Dịch vụ: ${service}\n` +
                `🔗 Link mục tiêu: ${link}\n` +
                `📦 Số lượng: ${quantity}\n` +
                `💰 Tổng tiền trừ: ${total}\n` +
                `💳 Số dư còn lại: ${users[u].balance.toLocaleString('vi-VN')} đ`;
                
    await sendToTelegram(msg);
    return res.json({ success: true, message: "Đơn hàng đã được gửi lên hệ thống!" });
});

// API THÔNG BÁO YÊU CẦU NẠP TIỀN
app.post('/api/deposit-alert', async (req, res) => {
    const { username, amount } = req.body;
    const u = username.toUpperCase().trim();
    await sendToTelegram(`💰 KHÁCH BÁO CHUYỂN KHOẢN!\n👤 Khách: ${u}\n💵 Số tiền: ${parseInt(amount).toLocaleString('vi-VN')} đ\n👉 Vui lòng check ngân hàng để duyệt cho khách!`);
    return res.json({ success: true });
});

// API TRẢ VỀ DỮ LIỆU ĐỂ HIỂN THỊ LÊN TRANG ADMIN WEB (ADMIN PANEL)
app.get('/api/admin/data', (req, res) => {
    const userList = Object.keys(users).map(key => ({
        username: key,
        password: users[key].password,
        balance: users[key].balance,
        email: users[key].email
    }));
    return res.json({ success: true, users: userList, deposits: [], orders: [] });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server chạy mượt mà tại port ${PORT}`));
