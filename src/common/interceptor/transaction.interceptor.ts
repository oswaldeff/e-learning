import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  HttpException,
  InternalServerErrorException,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { DataSource } from 'typeorm';

@Injectable()
export class TransactionInterceptor implements NestInterceptor {
  constructor(private readonly dataSource: DataSource) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler<any>,
  ): Promise<Observable<any>> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    const req = context.switchToHttp().getRequest();
    req.queryRunnerManager = queryRunner.manager;

    return next.handle().pipe(
      catchError(async (e) => {
        await queryRunner.rollbackTransaction();
        await queryRunner.release();

        if (e instanceof HttpException) {
          throw new HttpException(e.getResponse(), e.getStatus());
        }
        throw new InternalServerErrorException();
      }),
      tap(async () => {
        await queryRunner.commitTransaction();
        await queryRunner.release();
      }),
    );
  }
}
