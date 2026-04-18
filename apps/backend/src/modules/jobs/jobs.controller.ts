import { Controller, Inject, Param, Sse } from '@nestjs/common';
import Redis from 'ioredis';
import { Observable } from 'rxjs';

import { REDIS_CLIENT, jobProgressChannel } from '../redis/redis.module';

type SseMessage = { data: string };

@Controller('jobs')
export class JobsController {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  /**
   * SSE stream for generation progress.
   * Subscribes to Redis pub/sub for the given job ID, forwards events to the client.
   * Completes the stream when status is 'done' or 'failed'.
   */
  @Sse(':id/events')
  progressEvents(@Param('id') jobId: string): Observable<SseMessage> {
    return new Observable<SseMessage>((subscriber) => {
      // Each SSE subscription needs its own subscriber Redis client
      const sub = this.redis.duplicate();
      const channel = jobProgressChannel(jobId);

      sub.subscribe(channel).catch((err) => subscriber.error(err));

      sub.on('message', (_chan: string, message: string) => {
        subscriber.next({ data: message });

        try {
          const parsed = JSON.parse(message) as { status?: string };
          if (parsed.status === 'done' || parsed.status === 'failed') {
            subscriber.complete();
          }
        } catch {
          // Malformed message — keep stream open
        }
      });

      sub.on('error', (err) => subscriber.error(err));

      // Cleanup: unsubscribe and close the duplicated client on stream teardown
      return () => {
        sub.unsubscribe(channel).catch(() => undefined);
        sub.quit().catch(() => undefined);
      };
    });
  }
}
