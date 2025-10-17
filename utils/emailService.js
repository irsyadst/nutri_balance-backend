const Brevo = require('@getbrevo/brevo');

// Konfigurasi API client Brevo
const apiInstance = new Brevo.TransactionalEmailsApi();
apiInstance.authentications['api-key'].apiKey = process.env.BREVO_API_KEY;

/**
 * Mengirim email verifikasi OTP menggunakan Brevo
 * @param {string} to - Alamat email penerima
 * @param {string} otp - Kode OTP yang akan dikirim
 */
const sendOtpEmail = async (to, otp) => {
    const sendSmtpEmail = new Brevo.SendSmtpEmail();

    sendSmtpEmail.subject = 'Kode Verifikasi Pendaftaran NutriBalance Anda';
    sendSmtpEmail.htmlContent = `
        <html>
        <body>
            <div style="font-family: Arial, sans-serif; text-align: center; color: #333;">
                <h2>Verifikasi Akun NutriBalance Anda</h2>
                <p>Terima kasih telah mendaftar. Gunakan kode di bawah ini untuk menyelesaikan pendaftaran Anda:</p>
                <div style="font-size: 24px; font-weight: bold; margin: 20px 0; letter-spacing: 5px; background-color: #f2f2f2; padding: 15px; border-radius: 8px; display: inline-block;">
                    ${otp}
                </div>
                <p>Kode ini akan kedaluwarsa dalam 10 menit.</p>
                <p style="color: #888;">Jika Anda tidak merasa mendaftar, abaikan email ini.</p>
            </div>
        </body>
        </html>`;
    sendSmtpEmail.sender = { 
        name: 'NutriBalance', 
        email: 'noreply@nutribalance.app' // Alamat ini bisa apa saja, Brevo akan menggantinya dengan email akun Anda
    }; 
    sendSmtpEmail.to = [{ email: to }];

    try {
        await apiInstance.sendTransacEmail(sendSmtpEmail);
        console.log(`Email OTP Brevo berhasil dikirim ke ${to}`);
        return true;
    } catch (error) {
        console.error(`Gagal mengirim email Brevo ke ${to}:`, error);
        return false;
    }
};

module.exports = { sendOtpEmail };