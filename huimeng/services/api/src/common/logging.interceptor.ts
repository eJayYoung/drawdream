import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, body } = request;
    const now = Date.now();

    this.logger.log(`→ ${method} ${url}`);
    if (body && Object.keys(body).length > 0) {
      this.logger.log(`  Body: ${JSON.stringify(body)}`);
    }

    return next.handle().pipe(
      tap({
        next: (data) => {
          const duration = Date.now() - now;
          this.logger.log(`← ${method} ${url} ${duration}ms`);
          if (data && typeof data === 'object') {
            const resultStr = JSON.stringify(data);
            this.logger.log(`  Response: ${resultStr.slice(0, 500)}${resultStr.length > 500 ? '...' : ''}`);
          }
        },
        error: (error) => {
          const duration = Date.now() - now;
          this.logger.error(`✗ ${method} ${url} ${duration}ms - ${error.message}`);
        },
      }),
    );
  }
}
