
import * as jwt from 'jsonwebtoken';

export class JwtProvider {

    public constructor(private readonly _token: string) {}

    public get token(): string {
        return this._token;
    }

    public get decoded(): jwt.Jwt | null {
        return jwt.decode(this._token, { complete: true });
    }

    public get tid(): string | null {
        const payload = this.decoded?.payload as jwt.JwtPayload;
        if (payload && payload.tid) {
            return payload.tid;
        }
        return null;
    }

    public validate(): boolean {
        const decoded = this.decoded;
        if (!decoded) {
            return false;
        }
        const payload = decoded.payload as jwt.JwtPayload;
        if (!payload || !payload.tid) {
            return false;
        }
        if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
            return false;
        }
        return true;
    }

    public static fromAuthHeader(authHeader: string | null): JwtProvider | undefined {
        if (!authHeader) {
            return;
        }
        const [bearer, token] = authHeader.split(' ');
        if (!token) {
            return;
        }
        return new JwtProvider(token);
    }

}
