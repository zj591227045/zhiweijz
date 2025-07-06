export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;

  constructor(message: string, statusCode: number = 500, isOperational: boolean = true) {
    super(message);

    this.statusCode = statusCode;
    this.isOperational = isOperational;

    // 确保原型链正确
    Object.setPrototypeOf(this, AppError.prototype);

    // 捕获堆栈跟踪
    Error.captureStackTrace(this, this.constructor);
  }
}
