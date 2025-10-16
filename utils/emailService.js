const { Resend } = require('resend');

// Inisialisasi Resend dengan API key dari .env
const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Mengirim email verifikasi OTP menggunakan Resend
 * @param {string} to - Alamat email penerima
 * @param {string} otp - Kode OTP yang akan dikirim
 */
const sendOtpEmail = async (to, otp) => {
    try {
        const { data, error } = await resend.emails.send({
            // Gunakan 'onboarding@resend.dev' untuk development jika domain belum terverifikasi
            from: 'NutriBalance <onboarding@resend.dev>',
            to: [to],
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
        });

        if (error) {
            console.error(`Gagal mengirim email ke ${to}:`, error);
            return false;
        }

        console.log(`Email OTP berhasil dikirim ke ${to}. ID: ${data.id}`);
        return true;
    } catch (error) {
        console.error(`Gagal mengirim email ke ${to}:`, error);
        return false;
    }
};

module.exports = { sendOtpEmail };