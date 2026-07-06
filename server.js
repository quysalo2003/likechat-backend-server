const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const axios = require('axios'); // Dùng để gọi sang Telegram

const app = express();
app.use(cors());
app.use(bodyParser.json());

// === CẤU HÌNH TELEGRAM BOT CỦA MÀY ===
const TELEGRAM_TOKEN = "MÃ_TOKEN_BOT_TELEGRAM_CỦA_MÀY"; 
const TELEGRAM_CHAT_ID = "ID_CHAT_HOẶC_ID_GROUP_CỦA_MÀY";

// Hàm gửi tin nhắn về Telegram
async function sendToTelegram(message) {
    try {
        const url = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`;
        await axios.post(url, { chat_id: TELEGRAM_CHAT_ID, text: message });
    } catch (error) {
        console.error("Lỗi gửi Telegram:", error.message);
    }
}

// Giả lập Database lưu tài khoản tạm thời trong bộ nhớ
const users = {
    "ADMIN": { password: "123", balance: 500000, email: "admin@gmail.com" }
};

// API ĐĂNG KÝ
app.post('/api/register', async (req, res) => {
    const { username, password, email } = req.body;
    const u = username.toUpperCase();
    if (users[u]) return res.json({ success: false, message: "Tài khoản đã tồn tại!" });
    
    users[u] = { password, balance: 0, email };
    await sendToTelegram(`🔔 CÓ THÀNH VIÊN MỚI!\nTài khoản: ${u}\nEmail: ${email}`);
    return res.json({ success: true, message: "Đăng ký thành công!" });
});

// API ĐĂNG NHẬP
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    const u = username.toUpperCase();
    if (!users[u] || users[u].password !== password) {
        return res.json({ success: false, message: "Sai tài khoản hoặc mật khẩu!" });
    }
    return res.json({ success: true, username: u, balance: users[u].balance });
});

// API ĐẶT ĐƠN TĂNG LIKE/FOLLOW (GỬI VỀ TELEGRAM)
app.post('/api/order-mxh', async (req, res) => {
    const { username, platform, service, link, quantity, total } = req.body;
    
    const msg = `🛒 ĐƠN HÀNG MỚI TỪ: ${username}\n` +
                `🌐 Nền tảng: ${platform.toUpperCase()}\n` +
                `🛠️ Dịch vụ: ${service}\n` +
                `🔗 Link mục tiêu: ${link}\n` +
                `📦 Số lượng: ${quantity}\n` +
                `💰 Tổng tiền: ${total}`;
                
    await sendToTelegram(msg);
    return res.json({ success: true, message: "Đơn hàng đã được gửi lên hệ thống!" });
});

// API BÁO NẠP TIỀN
app.post('/api/deposit-alert', async (req, res) => {
    const { username, amount } = req.body;
    await sendToTelegram(`💰 KHÁCH BÁO CHUYỂN KHOẢN!\n👤 Khách: ${username}\n💵 Số tiền: ${parseInt(amount).toLocaleString('vi-VN')} đ\n👉 Vui lòng check ngân hàng để duyệt!`);
    return res.json({ success: true });
});

// Chạy server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server đang chạy ở port ${PORT}`));