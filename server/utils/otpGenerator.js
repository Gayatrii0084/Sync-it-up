/**
 * Generates a 6-digit numeric OTP
 * @returns {string} 6-digit OTP string
 */
function generateOTP() {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  return otp;
}

/**
 * Returns expiry time 5 minutes from now (as MySQL DATETIME string)
 * @returns {string} datetime string
 */
function getExpiryTime() {
  const now = new Date();
  now.setMinutes(now.getMinutes() + 5);
  // Format for MySQL DATETIME
  const pad = (n) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
}

module.exports = { generateOTP, getExpiryTime };
