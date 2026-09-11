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
            if len(self._last_call) > self.max_entries:
                self._last_call.clear()

    async def wait(self, key: int):
        now = time.monotonic()
        last = self._last_call.get(key, 0)

        diff = now - last
        if diff < self.delay:
            await asyncio.sleep(self.delay - diff)

        self._last_call[key] = time.monotonic()
        self._prune(now)
