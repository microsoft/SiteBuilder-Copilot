// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

class ErrorHandler {
    static logError(error: any) {
        // Log error details (e.g., send to a monitoring service)
        console.error('Error logged:', error);
    }

    static translateError(error: any): string {
        // Handle specific errors
        if (error instanceof ResponseError) {
            switch (error.status) {
                case 404:
                    return 'The requested resource was not found. Please check the URL or try again later.';
                case 500:
                    return 'There was a server error. Please try again later.';
                default:
                    return `An error occurred: ${error.statusText}`;
            }
        } else if (error instanceof TypeError) {
            return 'There was a problem with your request. Please check your input and try again.';
        } else if (error instanceof NetworkError) {
            return 'Network error: Please check your internet connection.';
        } else {
            return 'An unexpected error occurred. Please try again later.';
        }
    }

    static handleError(error: any, customMessage?: string) {
        this.logError(error);
        const err = this.translateError(error);
        alert(customMessage ? `${customMessage} ${err}` : err);
    }
}

// Custom error classes
class NetworkError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'NetworkError';
    }
}

class ResponseError extends Error {
    public status: number;
    public statusText: string;

    constructor(status: number, statusText: string) {
        super(`HTTP Error: ${status} - ${statusText}`);
        this.name = 'ResponseError';
        this.status = status;
        this.statusText = statusText;
    }
}

export { ErrorHandler, NetworkError, ResponseError };
