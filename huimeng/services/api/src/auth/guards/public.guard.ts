import { Injectable } from '@nestjs/common';

@Injectable()
export class PublicGuard {
  canActivate() {
    return true;
  }
}