import jwt from "jsonwebtoken";
export const safeUser = ({ password: _password, ...user }) => user;
export const isProd = process.env.NODE_ENV === "production";
export const cookieOptions = {
  httpOnly: true,
  sameSite: isProd ? "none" : "lax",
  secure: isProd,
  maxAge: 7 * 86400000,
};
export function signIn(res, user, secret) {
  const token = jwt.sign({ id: user.id }, secret, { expiresIn: "7d" });
  res.cookie("onona", token, cookieOptions);
  return { ...safeUser(user), token };
}
export function authenticate(db, secret) {
  return async (req, res, next) => {
    try {
      let rawToken = req.cookies?.onona;
      if (!rawToken && req.headers?.authorization?.startsWith("Bearer ")) {
        rawToken = req.headers.authorization.slice(7).trim();
      }
      if (!rawToken && req.query?.token) {
        rawToken = String(req.query.token).trim();
      }
      if (!rawToken) throw Error("No token provided");
      const { id } = jwt.verify(rawToken, secret);
      req.user = await db.get("users", id);
      if (!req.user) throw Error("User not found");
      next();
    } catch {
      res.status(401).json({ error: "Please sign in to continue." });
    }
  };
}
