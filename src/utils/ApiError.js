//created the way in which api errors will  be handled


class ApiError extends Error {
    constructor(
        statusCode,
        message = 'something went wrong',
        errors = [],
        stack = ''
    ) {
        super(message)
        this.data = null
        this.statusCode = statusCode
        this.message = message
        this.errors = errors
        this.success = false


        if (stack) {
            this.stack = stack
        } else {
            Error.captureStackTrace(this, constructor)
        }
    }
}

export {ApiError};