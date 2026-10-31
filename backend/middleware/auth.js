
import jwt from "jsonwebtoken";

export default function auth(req, res, next) {
  const header = req.headers.authorization;

  // Check whether the token exists
  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({
      message: "Please log in first.",
    });
  }

  try {
    const token = header.split(" ")[1];

    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Support the user ID field used when generating your JWT
    const userId = decoded.userId || decoded.id;

    if (!userId) {
      return res.status(401).json({
        message: "Invalid token: user ID is missing.",
      });
    }

    // Set both properties for compatibility with existing code
    req.userId = userId;
    req.user = { id: userId };

    next();
  } catch (error) {
    console.error("JWT authentication error:", error.message);

    return res.status(401).json({
      message: "Invalid or expired token. Please log in again.",
    });
  }
}
