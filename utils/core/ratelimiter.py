import asyncio
import time


class RateLimiter:

    def __init__(self, delay: float = 0.3):
        self.delay = delay
        self._last_call: dict[int, float] = {}

    async def wait(self, key: int):
        now = time.monotonic()
        last = self._last_call.get(key, 0)

        diff = now - last
        if diff < self.delay:
            await asyncio.sleep(self.delay - diff)

        self._last_call[key] = time.monotonic()
