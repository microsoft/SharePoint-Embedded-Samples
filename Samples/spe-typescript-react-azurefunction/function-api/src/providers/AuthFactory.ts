import { IAuthProvider } from './AuthProvider';
import { DelegatedAuthProvider } from './DelegatedAuthProvider';
import { OboAuthProvider } from './OboAuthProvider';
import { JwtProvider } from './JwtProvider';

export function hasConfidentialClient(): boolean {
    return !!process.env.AZURE_CLIENT_SECRET ||
        !!(process.env.AZURE_CLIENT_CERT_THUMBPRINT && process.env.AZURE_CLIENT_CERT_PRIVATE_KEY);
}

export function createUserAuthProvider(jwt: JwtProvider, oboScopes?: string[]): IAuthProvider {
    if (hasConfidentialClient()) {
        return oboScopes ? new OboAuthProvider(jwt, oboScopes) : new OboAuthProvider(jwt);
    }
    return new DelegatedAuthProvider(jwt.token);
}
