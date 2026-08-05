import { ITimeProvider } from '../../application/ports/ITimeProvider';

export class SystemTimeProvider implements ITimeProvider {
  getCurrentTime(): Date {
    return new Date();
  }
}
