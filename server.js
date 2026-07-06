const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const axios = require('axios');

const app = express();
app.use(cors());
app.use(bodyParser.json());

const TELEGRAM_TOKEN = "8899021077:AAExBxaUDO7iXXAr6Rh9cDTpkLPAG3Rd4Ks"; 
const TELEGRAM_CHAT_ID = "6661039756";
const MK_ADMIN_MUON_DAT = "cfquyy123"; 

async function sendToTelegram(message) {
    try {
        const url = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`;
        await axios.post(url, { chat_id: TELEGRAM_CHAT_ID, text: message });
    } catch (error) {
        console.error("Lỗi gửi Telegram:", error.message);
    }
}

// Bộ nhớ lưu trữ dữ liệu tạm thời (Database giả lập)
const users = {
    "ADMIN": { password: MK_ADMIN_MUON_DAT, balance: 99999999, email: "admin@likechat.site" }
};
const deposits = []; // Lưu lịch sử nạp tiền
const orders = [];   // Lưu lịch sử đơn hàng mxh + premium

// API ĐĂNG KÝ
app.post('/api/register', async (req, res) => {
    const { username, password, email } = req.body;
    const u = username.toUpperCase().trim();
    if (users[u]) return res.json({ success: false, message: "Tài khoản đã tồn tại!" });
    
    users[u] = { password, balance: 0, email };
    await sendToTelegram(`🔔 CÓ THÀNH VIÊN MỚI!\n👤 Tài khoản: ${u}\n📧 Email: ${email}`);
    return res.json({ success: true, message: "Đăng ký thành công!" });
});

// API ĐĂNG NHẬP
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    const u = username.toUpperCase().trim();
    if (!users[u] || users[u].password !== password) {
        return res.json({ success: false, message: "Sai tài khoản hoặc mật khẩu!" });
    }
    return res.json({ success: true, username: u, balance: users[u].balance });
});

// API LẤY SỐ DƯ REALTIME (ĐÃ FIX LỖI KHÔNG TRỪ TIỀN TRÊN MÀN HÌNH)
app.get('/api/user/:username', (req, res) => {
    const u = req.params.username.toUpperCase().trim();
    if (!users[u]) return res.json({ success: false, message: "Không tìm thấy user" });
    return res.json({ success: true, balance: users[u].balance });
});

// API ĐẶT ĐƠN MXH
app.post('/api/order-mxh', async (req, res) => {
    const { username, platform, service, link, quantity, total } = req.body;
    const u = username.toUpperCase().trim();
    const cost = parseInt(total.replace(/[^0-9]/g, ''));
    
    if (!users[u]) return res.json({ success: false, message: "Tài khoản không tồn tại!" });
    if (users[u].balance < cost) return res.json({ success: false, message: "Số dư không đủ!" });
    
    users[u].balance -= cost;
    
    // Lưu vào lịch sử hệ thống cho Admin nhìn thấy
    const orderId = "MXH" + Math.floor(Math.random() * 900000 + 100000);
    const timeNow = new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
    orders.push({ orderId, username: u, type: platform.toUpperCase(), service, link, quantity, total, status: "Chờ duyệt", time: timeNow });

    const msg = `🛒 ĐƠN HÀNG MXH MỚI: ${u}\n🆔 Mã đơn: ${orderId}\n🌐 Nền tảng: ${platform.toUpperCase()}\n🛠️ Dịch vụ: ${service}\n🔗 Link: ${link}\n📦 SL: ${quantity}\n💰 Tổng tiền: ${total}`;
    await sendToTelegram(msg);
    return res.json({ success: true });
});

// API ĐẶT MUA APP PREMIUM (ĐÃ FIX LỖI KHÔNG PHẢN ỨNG)
app.post('/api/order-premium', async (req, res) => {
    const { username, service, email, price } = req.body;
    const u = username.toUpperCase().trim();
    const cost = parseInt(price);

    if (!users[u]) return res.json({ success: false, message: "Tài khoản không tồn tại!" });
    if (users[u].balance < cost) return res.json({ success: false, message: `Số dư không đủ! Cần thêm ${(cost - users[u].balance).toLocaleString('vi-VN')} đ.` });

    users[u].balance -= cost;

    const orderId = "PRE" + Math.floor(Math.random() * 900000 + 100000);
    const timeNow = new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
    orders.push({ orderId, username: u, type: "PREMIUM", service, link: email, quantity: 1, total: cost.toLocaleString('vi-VN') + ' đ', status: "Chờ duyệt", time: timeNow });

    const msg = `🔑 ĐƠN MUA APP PREMIUM: ${u}\n🆔 Mã đơn: ${orderId}\n📦 Ứng dụng: ${service}\n📧 Email nhận: ${email}\n💰 Giá trừ: ${cost.toLocaleString('vi-VN')} đ`;
    await sendToTelegram(msg);
    return res.json({ success: true });
});

// API BÁO NẠP TIỀN
app.post('/api/deposit-alert', async (req, res) => {
    const { username, amount } = req.body;
    const u = username.toUpperCase().trim();
    const depositId = "NAP" + Math.floor(Math.random() * 900000 + 100000);
    const timeNow = new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
    
    deposits.push({ depositId, username: u, amount: parseInt(amount), status: "Chờ duyệt", time: timeNow });

    await sendToTelegram(`💰 KHÁCH BÁO NẠP TIỀN!\n🆔 Mã nạp: ${depositId}\n👤 Khách: ${u}\n💵 Số tiền: ${parseInt(amount).toLocaleString('vi-VN')} đ\n👉 Vào web duyệt nạp tiền nhanh Sếp ơi!`);
    return res.json({ success: true });
});

// API ĐỒNG BỘ DATA CHO TRANG ADMIN CHẠY THẬT
app.get('/api/admin/data', (req, res) => {
    const userList = Object.keys(users).map(key => ({
        username: key, password: users[key].password, balance: users[key].balance, email: users[key].email
    }));
    return res.json({ success: true, users: userList, deposits, orders });
});

// API ADMIN DUYỆT CỘNG TIỀN THẬT TRÊN WEB
app.post('/api/admin/approve-deposit', (req, res) => {
    const { depositId } = req.body;
    const dep = deposits.find(d => d.depositId === depositId);
    if (!dep || dep.status !== "Chờ duyệt") return res.json({ success: false, message: "Yêu cầu không hợp lệ" });
    
    if (users[dep.username]) {
        users[dep.username].balance += dep.amount;
        dep.status = "Đã duyệt";
        sendToTelegram(`✅ ADMIN ĐÃ DUYỆT NẠP TIỀN!\n👤 Khách: ${dep.username}\n💵 Số tiền cộng: +${dep.amount.toLocaleString('vi-VN')} đ\n💳 Số dư mới: ${users[dep.username].balance.toLocaleString('vi-VN')} đ`);
        return res.json({ success: true });
    }
    return res.json({ success: false, message: "User không tồn tại" });
});

// API ADMIN ĐỔI TRẠNG THÁI ĐƠN HÀNG THẬT TRÊN WEB
app.post('/api/admin/update-order', (req, res) => {
    const { orderId, status } = req.body;
    const ord = orders.find(o => o.orderId === orderId);
    if (!ord) return res.json({ success: false, message: "Không tìm thấy đơn hàng" });
    
    ord.status = status;
    sendToTelegram(`🚀 ĐƠN HÀNG ${orderId} CHUYỂN TRẠNG THÁI -> [${status.toUpperCase()}]`);
    return res.json({ success: true });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server admin realtime running on port ${PORT}`));
