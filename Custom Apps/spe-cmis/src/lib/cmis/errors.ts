/**
 * CMIS Error Utilities
 * 
 * Provides helper functions for creating CMIS-compliant error responses.
 * Per CMIS 1.1 Browser Binding spec section 5.6.
 */

import { HttpResponseInit } from '@azure/functions';
import { CmisError, CmisExceptionType } from '../types';

/**
 * HTTP status codes for CMIS exceptions (per CMIS 1.1 spec)
 */
const CMIS_EXCEPTION_STATUS: Record<CmisExceptionType, number> = {
    'constraint': 409,
    'contentAlreadyExists': 409,
    'filterNotValid': 400,
    'invalidArgument': 400,
    'nameConstraintViolation': 409,
    'notSupported': 405,
    'objectNotFound': 404,
    'permissionDenied': 403,
    'runtime': 500,
    'storage': 500,
    'streamNotSupported': 403,
    'updateConflict': 409,
    'versioning': 409,
};

/**
 * Creates a CMIS error object
 */
export function createCmisError(exception: CmisExceptionType, message?: string): CmisError {
    return {
        exception,
        message,
    };
}

/**
 * Creates an HTTP response for a CMIS error.
 * Per CMIS 1.1 Browser Binding spec, errors should include the exception type
 * in a JSON response body.
 */
export function cmisErrorResponse(
    exception: CmisExceptionType,
    message?: string
): HttpResponseInit {
    const error = createCmisError(exception, message);
    const status = CMIS_EXCEPTION_STATUS[exception];

    return {
        status,
        headers: {
            'Content-Type': 'application/json',
        },
        jsonBody: error,
    };
}

/**
 * Creates a permission denied error response
 */
export function permissionDenied(message = 'Permission denied'): HttpResponseInit {
    return cmisErrorResponse('permissionDenied', message);
}

/**
 * Creates an object not found error response
 */
export function objectNotFound(message = 'Object not found'): HttpResponseInit {
    return cmisErrorResponse('objectNotFound', message);
}

/**
 * Creates an invalid argument error response
 */
export function invalidArgument(message = 'Invalid argument'): HttpResponseInit {
    return cmisErrorResponse('invalidArgument', message);
}

/**
 * Creates a not supported error response
 */
export function notSupported(message = 'Operation not supported'): HttpResponseInit {
    return cmisErrorResponse('notSupported', message);
}

/**
 * Creates a constraint violation error response
 */
export function constraintViolation(message = 'Constraint violation'): HttpResponseInit {
    return cmisErrorResponse('constraint', message);
}

/**
 * Creates a versioning error response (e.g. check-in attempted on an object
 * that isn't checked out)
 */
export function versioningError(message = 'Versioning error'): HttpResponseInit {
    return cmisErrorResponse('versioning', message);
}

/**
 * Creates a runtime error response
 */
export function runtimeError(message = 'Internal server error'): HttpResponseInit {
    return cmisErrorResponse('runtime', message);
}

/**
 * Creates an unauthorized response (401)
 * Note: CMIS spec uses permissionDenied for auth failures, but we send 401 for proper HTTP semantics
 */
export function unauthorized(message = 'Authentication required'): HttpResponseInit {
    return {
        status: 401,
        headers: {
            'Content-Type': 'application/json',
            'WWW-Authenticate': 'Basic realm="CMIS Repository"',
        },
        jsonBody: {
            exception: 'permissionDenied',
            message,
        },
    };
}
