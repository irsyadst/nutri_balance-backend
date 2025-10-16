const nodemailer = require('nodemailer');

// Konfigurasi transporter untuk Nodemailer menggunakan kredensial dari .env
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

/**
 * Mengirim email verifikasi OTP
 * @param {string} to - Alamat email penerima
 * @param {string} otp - Kode OTP yang akan dikirim
 */
const sendOtpEmail = async (to, otp) => {
    const mailOptions = {
        from: `"NutriBalance" <${process.env.EMAIL_USER}>`,
        to: to,
        subject: 'Kode Verifikasi Pendaftaran NutriBalance Anda',
        html: `
            <div style="font-family: Arial, sans-serif; text-align: center; color: #333;">
                <h2>Verifikasi Akun NutriBalance Anda</h2>
                <p>Terima kasih telah mendaftar. Gunakan kode di bawah ini untuk menyelesaikan pendaftaran Anda:</p>
                <div style="font-size: 24px; font-weight: bold; margin: 20px 0; letter-spacing: 5px; background-color: #f2f2f2; padding: 15px; border-radius: 8px; display: inline-block;">
                    ${otp}
                </div>
                <p>Kode ini akan kedaluwarsa dalam 10 menit.</p>
                <p style="color: #888;">Jika Anda tidak merasa mendaftar, abaikan email ini.</p>
            </div>
        `,
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`Email OTP berhasil dikirim ke ${to}`);
        return true;
    } catch (error) {
        console.error(`Gagal mengirim email ke ${to}:`, error);
        return false;
    }
};

module.exports = { sendOtpEmail };