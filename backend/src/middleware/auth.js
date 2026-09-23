import jwt from "jsonwebtoken";
export const safeUser = ({ password: _password, ...user }) => user;
export const cookieOptions = {
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  maxAge: 7 * 86400000,
};
export function signIn(res, user, secret) {
  res.cookie(
    "onona",
    jwt.sign({ id: user.id }, secret, { expiresIn: "7d" }),
    cookieOptions,
  );
  return safeUser(user);
}
export function authenticate(db, secret) {
  return async (req, res, next) => {
    try {
      const { id } = jwt.verify(req.cookies.onona, secret);
      req.user = await db.get("users", id);
      if (!req.user) throw Error();
      next();
    } catch {
      res.status(401).json({ error: "Please sign in to continue." });
    }
  };
}
