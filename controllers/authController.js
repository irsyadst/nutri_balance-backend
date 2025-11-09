const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/userModel");
const TempUser = require("../models/tempUserModel");
const { sendOtpEmail } = require("../utils/emailService");

const generateOtp = () =>
  Math.floor(100000 + Math.random() * 900000).toString();

exports.register = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ message: "Semua field wajib diisi." });

    if (
      (await User.findOne({ email: email.toLowerCase() })) ||
      (await TempUser.findOne({ email: email.toLowerCase() }))
    ) {
      return res
        .status(400)
        .json({
          message: "Email sudah terdaftar. Silakan verifikasi atau login.",
        });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const otp = generateOtp();

    const newTempUser = new TempUser({
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      otp,
    });

    const emailSent = await sendOtpEmail(newTempUser.email, otp);

    if (!emailSent) {
      return res
        .status(500)
        .json({
          message: "Gagal mengirim email verifikasi, silakan coba lagi.",
        });
    }

    await newTempUser.save();

    res
      .status(201)
      .json({
        message: "Registrasi berhasil, silakan cek email untuk kode OTP.",
      });
  } catch (error) {
    console.error("Register Error:", error);
    res.status(500).json({ message: "Terjadi kesalahan pada server" });
  }
};

exports.verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp)
      return res.status(400).json({ message: "Email dan OTP wajib diisi." });

    const tempUser = await TempUser.findOne({ email: email.toLowerCase() });
    if (!tempUser)
      return res
        .status(400)
        .json({
          message: "Pengguna tidak ditemukan atau OTP telah kedaluwarsa.",
        });
    if (tempUser.otp !== otp)
      return res.status(400).json({ message: "Kode OTP salah." });

    const newUser = new User({
      name: tempUser.name,
      email: tempUser.email,
      password: tempUser.password,
      role: "user",
    });
    await newUser.save();

    await TempUser.deleteOne({ email: email.toLowerCase() });

    const token = jwt.sign(
      { userId: newUser._id, name: newUser.name },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );
    res
      .status(201)
      .json({ message: "Verifikasi berhasil! Akun telah dibuat.", token });
  } catch (error) {
    console.error("Verify OTP Error:", error);
    res.status(500).json({ message: "Terjadi kesalahan pada server" });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res
        .status(400)
        .json({ message: "Email dan password wajib diisi." });
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user)
      return res.status(401).json({ message: "Email atau password salah" });
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid)
      return res.status(401).json({ message: "Email atau password salah" });
    const token = jwt.sign(
      { userId: user._id, name: user.name },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );
    res.json({ message: "Login berhasil", token });
  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({ message: "Terjadi kesalahan pada server" });
  }
};
exports.googleLogin = async (req, res) => {
  try {
    const { token } = req.body;
    if (!token)
      return res.status(400).json({ message: "Token Google tidak ditemukan." });

    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: [
        process.env.GOOGLE_CLIENT_ID_WEB,
        process.env.GOOGLE_CLIENT_ID_ANDROID,
      ],
    });

    const { name, email, sub: googleId } = ticket.getPayload();

    let user = await User.findOne({ googleId });

    if (!user) {
      user = new User({
        name,
        email,
        googleId,
        role: "user",
      });
      await user.save();
    }

    const appToken = jwt.sign(
      { userId: user._id, name: user.name },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.json({ message: "Login Google berhasil", token: appToken });
  } catch (error) {
    console.error("Google Login Error:", error);
    res.status(500).json({ message: "Autentikasi Google gagal." });
  }
};
