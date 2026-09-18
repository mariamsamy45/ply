import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export interface AuthedRequest extends Request {
  userId?: string;
}

const SECRET = process.env.JWT_SECRET || "dev-secret-change-me";

export function signToken(userId: string) {
  return jwt.sign({ sub: userId }, SECRET, { expiresIn: "30d" });
}

export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7) : req.cookies?.ply_token;

  if (!token) {
    return res.status(401).json({ error: "Sign in to continue." });
  }

  try {
    const payload = jwt.verify(token, SECRET) as { sub: string };
    req.userId = payload.sub;
    next();
  } catch {
    return res.status(401).json({ error: "Your session has expired. Sign in again." });
  }
}

// Attaches userId if a valid token is present, but never blocks the request.
export function optionalAuth(req: AuthedRequest, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7) : undefined;
  if (token) {
    try {
      const payload = jwt.verify(token, SECRET) as { sub: string };
      req.userId = payload.sub;
    } catch {
      // ignore invalid token for optional routes
    }
  }
  next();
}
