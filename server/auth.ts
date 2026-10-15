import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';
import { RuleError } from './game.js';

export function authentication(password: string, secret: string, production: boolean) {
  if (password.length < 10) throw new Error('HOST_PASSWORD must be at least 10 characters.');
  if (secret.length < 32) throw new Error('SESSION_SECRET must be at least 32 characters.');
  const salt = randomBytes(16);
  const passwordHash = scryptSync(password, salt, 32);
  const sign = (value: string) => createHmac('sha256', secret).update(value).digest('hex');
  const cookieOptions = {
    httpOnly: true,
    secure: production,
    sameSite: 'strict' as const,
    path: '/',
    maxAge: 12 * 60 * 60 * 1000,
  };
  function valid(value: unknown): boolean {
    if (typeof value !== 'string' || value.length > 300) return false;
    const [expires, nonce, signature] = value.split('.');
    if (!expires || !nonce || !signature || !/^[a-f0-9]{64}$/.test(signature)) return false;
    const expected = sign(`${expires}.${nonce}`);
    return (
      Number(expires) > Date.now() && timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
    );
  }
  return {
    valid,
    checkPassword(value: string) {
      return timingSafeEqual(passwordHash, scryptSync(value, salt, 32));
    },
    login(res: Response) {
      const value = `${Date.now() + cookieOptions.maxAge}.${randomBytes(16).toString('hex')}`;
      res.cookie('quiz_host', `${value}.${sign(value)}`, cookieOptions);
    },
    logout(res: Response) {
      res.clearCookie('quiz_host', cookieOptions);
    },
    requireHost(req: Request, _res: Response, next: NextFunction) {
      if (!valid(req.cookies?.quiz_host)) return next(new RuleError('Host login required.', 401));
      next();
    },
  };
}
export function parseCookies(header: string | undefined): Record<string, string> {
  const entries = (header ?? '').split(';').flatMap((part) => {
    const index = part.indexOf('=');
    if (index < 0) return [];
    try {
      return [[part.slice(0, index).trim(), decodeURIComponent(part.slice(index + 1))]];
    } catch {
      return [];
    }
  });
  return Object.fromEntries(entries);
}
