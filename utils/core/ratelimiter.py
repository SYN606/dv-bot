import asyncio
import time


class RateLimiter:

    def __init__(self, delay: float = 0.3, max_entries: int = 5000):
        self.delay = delay
        self.max_entries = max_entries
        self._last_call: dict[int, float] = {}

    def _prune(self, now: float) -> None:
        """Evict stale entries older than 2x delay window to keep memory bounded."""
        if len(self._last_call) > self.max_entries:
            cutoff = now - (self.delay * 2)
            keys_to_remove = [k for k, v in self._last_call.items() if v < cutoff]
            for k in keys_to_remove:
                self._last_call.pop(k, None)

    async def wait(self, key: int):
        now = time.monotonic()
        # Reserve before yielding so concurrent waiters get separate slots.
        scheduled = max(now, self._last_call.get(key, now - self.delay) + self.delay)
        self._last_call[key] = scheduled
        self._prune(now)
        if scheduled > now:
            await asyncio.sleep(scheduled - now)
