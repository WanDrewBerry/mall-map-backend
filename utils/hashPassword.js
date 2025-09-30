const bcrypt = require("bcrypt");

const newPassword = "admin123*"; // ✅ Choose a strong password
bcrypt.hash(newPassword, 10, (err, hashedPassword) => {
  if (err) {
    console.error("❌ Error hashing password:", err);
  } else {
    console.log("🔑 Hashed Password:", hashedPassword);
  }
});