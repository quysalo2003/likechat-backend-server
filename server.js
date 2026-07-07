const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const axios = require('axios');
const mongoose = require('mongoose');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// =======================================================
// 🚀 CẤU HÌNH HỆ THỐNG CỦA SẾP 🚀
// =======================================================
const TELEGRAM_TOKEN = "8899021077:AAExBxaUDO7iXXAr6Rh9cDTpkLPAG3Rd4Ks"; 
const TELEGRAM_CHAT_ID = "6661039756";
const MK_ADMIN_MUON_DAT = "cfquyy123"; 

const MONGO_URI = "mongodb+srv://admin:quy12345678@cluster0.l1cwyvm.mongodb.net/likechat?retryWrites=true&w=majority&appName=Cluster0";

mongoose.connect(MONGO_URI)
  .then(() => console.log("🔥 Đã kết nối Database MongoDB Atlas vĩnh viễn!"))
  .catch(err => console.error("🚨 Lỗi kết nối database rồi sếp ơi:", err.message));

// =======================================================
// 🗄️ ĐỊNH NGHĨA CÁC BẢNG LƯU TRỮ (DATABASE SCHEMAS)
// =======================================================
const UserSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    email: { type: String },
    balance: { type: Number, default: 0 }
});
const User = mongoose.model('User', UserSchema);

const OrderSchema = new mongoose.Schema({
    orderId: String,
    username: String,
    type: String,
    service: String,
    link: String,
    quantity: Number,
    total: String,
    status: { type: String, default: 'Chờ duyệt' },
    time: { type: String, default: () => new Date().toLocaleString('vi-VN') }
});
const Order = mongoose.model('Order', OrderSchema);

const DepositSchema = new mongoose.Schema({
    depositId: String,
    username: String,
    amount: Number,
    status: { type: String, default: 'Chờ duyệt' },
    time: { type: String, default: () => new Date().toLocaleString('vi-VN') }
});
const Deposit = mongoose.model('Deposit', DepositSchema);

// ✨ BẢNG MỚI: Lưu trữ danh sách dịch vụ và giá tiền
const ServiceSchema = new mongoose.Schema({
    serviceKey: { type: String, required: true, unique: true }, // Mã dịch vụ (Ví dụ: fb_like, tt_follow)
    name: { type: String, required: true },                      // Tên hiển thị (Ví dụ: Tăng Like Facebook)
    category: { type: String, default: 'MXH' },                  // Phân loại: MXH hoặc PREMIUM
    price: { type: Number, required: true }                      // Giá tiền (đơn vị: VNĐ)
});
const Service = mongoose.model('Service', ServiceSchema);

// Khởi tạo Admin và một số dịch vụ mẫu nếu database trống
async function initSystem() {
    try {
        const adminExist = await User.findOne({ username: "ADMIN" });
        if (!adminExist) {
            await User.create({ username: "ADMIN", password: MK_ADMIN_MUON_DAT, balance: 99999999, email: "admin@likechat.site" });
            console.log("👑 Đã thiết lập tài khoản ADMIN mặc định!");
        }
        
        // Tạo vài dịch vụ mẫu nếu chưa có gì
        const serviceCount = await Service.countDocuments();
        if (serviceCount === 0) {
            await Service.create([
                { serviceKey: "fb_like", name: "Like Bài Viết Facebook", category: "MXH", price: 50 },
                { serviceKey: "tt_follow", name: "Follow TikTok", category: "MXH", price: 80 },
                { serviceKey: "app_netflix", name: "Tài khoản Netflix 1 Tháng", category: "PREMIUM", price: 79000 }
            ]);
            console.log("📦 Đã khởi tạo bảng giá dịch vụ mẫu!");
        }
    } catch (err) {
        console.error("Lỗi khởi tạo hệ thống:", err.message);
    }
}
initSystem();

async function sendToTelegram(message) {
    try {
        const url = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`;
        await axios.post(url, { chat_id: TELEGRAM_CHAT_ID, text: message });
    } catch (error) { console.error("Lỗi Telegram:", error.message); }
}

// =======================================================
// 🌐 CÁC API QUẢN LÝ DỊCH VỤ & BẢNG GIÁ (MỚI THÊM)
// =======================================================

// 1. API Lấy toàn bộ bảng giá dịch vụ (Cả khách và admin đều dùng)
app.get('/api/services', async (req, res) => {
    try {
        const services = await Service.find({});
        return res.json({ success: true, data: services });
    } catch (err) { return res.json({ success: false, data: [] }); }
});

// 2. API Cập nhật hoặc Thêm mới dịch vụ từ trang Admin
app.post('/api/admin/update-service', async (req, res) => {
    try {
        const { serviceKey, name, category, price } = req.body;
        if (!serviceKey || !name || price === undefined) {
            return res.json({ success: false, message: "Thiếu thông tin dịch vụ!" });
        }
        
        // Dùng upsert: Nếu tìm thấy serviceKey thì update giá/tên, nếu chưa có thì tự thêm mới
        await Service.findOneAndUpdate(
            { serviceKey: serviceKey.trim() },
            { name, category, price: parseInt(price) || 0 },
            { upsert: true, new: true }
        );
        
        return res.json({ success: true, message: "Cập nhật bảng giá thành công!" });
    } catch (err) { return res.json({ success: false, message: "Lỗi cập nhật dịch vụ!" }); }
});

// 3. API Xóa dịch vụ khỏi hệ thống
app.post('/api/admin/delete-service', async (req, res) => {
    try {
        const { serviceKey } = req.body;
        await Service.deleteOne({ serviceKey });
        return res.json({ success: true, message: "Đã xóa dịch vụ!" });
    } catch (err) { return res.json({ success: false, message: "Lỗi xóa dịch vụ!" }); }
});

// =======================================================
// 📑 CÁC API CŨ (GIỮ NGUYÊN HOÀN TOÀN LOGIC CỦA BỐ)
// =======================================================
app.get('/api/user/:username', async (req, res) => {
    try {
        const u = req.params.username.toUpperCase().trim();
        const user = await User.findOne({ username: u });
        if (user) return res.json({ success: true, balance: user.balance });
        return res.json({ success: false, message: "Không tìm thấy user" });
    } catch(e) { res.json({ success: false }); }
});

app.post('/api/register', async (req, res) => {
    try {
        const { username, password, email } = req.body;
        if (!username || !password) return res.json({ success: false, message: "Vui lòng điền đủ thông tin!" });
        const u = username.toUpperCase().trim();
        const userExist = await User.findOne({ username: u });
        if (userExist) return res.json({ success: false, message: "Tài khoản đã tồn tại!" });
        await User.create({ username: u, password, email, balance: 0 });
        await sendToTelegram(`🔔 CÓ THÀNH VIÊN MỚI!\n👤 Tài khoản: ${u}\n📧 Email: ${email}`);
        return res.json({ success: true, message: "Đăng ký thành công!" });
    } catch (err) { return res.json({ success: false, message: "Lỗi hệ thống đăng ký!" }); }
});

app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) return res.json({ success: false, message: "Vui lòng điền đủ thông tin!" });
        const u = username.toUpperCase().trim();
        const user = await User.findOne({ username: u });
        if (!user || user.password !== password) return res.json({ success: false, message: "Sai tài khoản hoặc mật khẩu!" });
        return res.json({ success: true, username: u, balance: user.balance });
    } catch (err) { return res.json({ success: false, message: "Lỗi hệ thống đăng nhập!" }); }
});

app.post('/api/order-mxh', async (req, res) => {
    try {
        const { username, platform, service, link, quantity, total } = req.body;
        const u = username.toUpperCase().trim();
        const totalStr = String(total || "0");
        const cost = parseInt(totalStr.replace(/[^0-9]/g, '')) || 0;
        const user = await User.findOne({ username: u });
        if (!user) return res.json({ success: false, message: "Tài khoản không tồn tại!" });
        if (user.balance < cost) return res.json({ success: false, message: `Số dư không đủ! Mày cần thêm ${(cost - user.balance).toLocaleString('vi-VN')} đ.` });
        user.balance -= cost;
        await user.save();
        const orderId = "MXH" + Math.floor(100000 + Math.random() * 900000);
        await Order.create({ orderId, username: u, type: platform.toUpperCase(), service, link, quantity, total: totalStr, status: 'Đang chạy' });
        const msg = `🛒 ĐƠN HÀNG MXH MỚI TỪ: ${u}\n🆔 Mã đơn: ${orderId}\n💰 Tổng tiền trừ: ${cost.toLocaleString('vi-VN')} đ\n💳 Số dư còn lại: ${user.balance.toLocaleString('vi-VN')} đ`;
        await sendToTelegram(msg);
        return res.json({ success: true, message: "Đơn hàng đã được gửi lên hệ thống!" });
    } catch (err) { return res.json({ success: false, message: "Lỗi hệ thống tạo đơn!" }); }
});

app.post('/api/order-premium', async (req, res) => {
    try {
        const { username, service, email, price } = req.body;
        const u = username.toUpperCase().trim();
        const cost = parseInt(price) || 0;
        const user = await User.findOne({ username: u });
        if (!user) return res.json({ success: false, message: "Tài khoản không tồn tại!" });
        if (user.balance < cost) return res.json({ success: false, message: `Số dư không đủ để mua tài khoản này!` });
        user.balance -= cost;
        await user.save();
        const orderId = "PRE" + Math.floor(100000 + Math.random() * 900000);
        await Order.create({ orderId, username: u, type: "PREMIUM", service, link: email, quantity: 1, total: cost.toLocaleString('vi-VN') + ' đ', status: 'Chờ duyệt' });
        const msg = `🔑 ĐƠN MUA APP PREMIUM!\n👤 Tài khoản mua: ${u}\n📦 Gói mua: ${service}\n📧 Email nhận acc: ${email}\n💰 Số tiền trừ: ${cost.toLocaleString('vi-VN')} đ`;
        await sendToTelegram(msg);
        return res.json({ success: true, message: "Đặt mua App Premium thành công!" });
    } catch(e) { return res.json({ success: false, message: "Lỗi mua tài khoản Premium!" }); }
});

app.post('/api/deposit-alert', async (req, res) => {
    try {
        const { username, amount } = req.body;
        const u = username.toUpperCase().trim();
        const depId = "NAP" + Math.floor(100000 + Math.random() * 900000);
        await Deposit.create({ depositId: depId, username: u, amount: parseInt(amount) || 0, status: 'Chờ duyệt' });
        await sendToTelegram(`💰 KHÁCH BÁO CHUYỂN KHOẢN!\n🆔 Mã nạp: ${depId}\n👤 Khách: ${u}\n💵 Số tiền: ${parseInt(amount).toLocaleString('vi-VN')} đ\n👉 Vui lòng check ngân hàng và duyệt trên bảng Admin!`);
        return res.json({ success: true });
    } catch(err) { return res.json({ success: false }); }
});

app.get('/api/admin/data', async (req, res) => {
    try {
        const dbUsers = await User.find({});
        const dbOrders = await Order.find({});
        const dbDeposits = await Deposit.find({});
        const userList = dbUsers.map(u => ({ username: u.username, password: u.password, balance: u.balance, email: u.email }));
        return res.json({ success: true, users: userList, deposits: dbDeposits, orders: dbOrders });
    } catch (err) { return res.json({ success: false, users: [], deposits: [], orders: [] }); }
});

app.post('/api/admin/approve-deposit', async (req, res) => {
    try {
        const { depositId } = req.body;
        const dep = await Deposit.findOne({ depositId });
        if (!dep || dep.status !== 'Chờ duyệt') return res.json({ success: false });
        const user = await User.findOne({ username: dep.username });
        if (user) {
            user.balance += dep.amount;
            await user.save();
            dep.status = 'Đã duyệt';
            await dep.save();
            await sendToTelegram(`✅ ĐÃ DUYỆT NẠP TIỀN!\n👤 Khách: ${dep.username}\n💰 Số tiền cộng: ${dep.amount.toLocaleString('vi-VN')} đ\n💳 Số dư mới: ${user.balance.toLocaleString('vi-VN')} đ`);
            return res.json({ success: true });
        }
        return res.json({ success: false });
    } catch(e) { res.json({ success: false }); }
});

app.post('/api/admin/update-order', async (req, res) => {
    try {
        const { orderId, status } = req.body;
        const order = await Order.findOne({ orderId });
        if (order) {
            order.status = status;
            await order.save();
            return res.json({ success: true });
        }
        return res.json({ success: false });
    } catch(e) { res.json({ success: false }); }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Hệ thống Backend chạy mượt mà trên Cloud tại port ${PORT}`));
