
import { IAuthProvider, AuthHandler } from "./AuthProvider";

export class DelegatedAuthProvider implements IAuthProvider {
    constructor(private _token: string) {}

    public async getToken(): Promise<string> {
        return this._token;
    }

    public getAuthHandler(): AuthHandler {
        return (done) => {
            done(null, this._token);
        };
    }
}
