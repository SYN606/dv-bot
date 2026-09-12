from __future__ import annotations

import asyncio
import logging
from datetime import date, datetime, timezone
from typing import Dict, Tuple

import discord
from tortoise.expressions import F

from db.db_helpers.analytics import ensure_guild_and_user
from db.models import (
    ChannelActivity,
    DailyActivitySnapshot,
    HourlyActivity,
    MemberAnalytics,
)

logger = logging.getLogger(__name__)


class AnalyticsBatcher:
    """In-memory aggregator for high-frequency message analytics.
    
    Buffers message activity across users, channels, daily snapshots, and hourly
    activity, then periodically flushes updates to Tortoise ORM in atomic operations.
    """

    def __init__(self, flush_interval: float = 30.0, max_buffer_size: int = 500) -> None:
        self.flush_interval = flush_interval
        self.max_buffer_size = max_buffer_size

        self._user_buffer: Dict[Tuple[int, int], Tuple[int, datetime]] = {}
        self._channel_buffer: Dict[Tuple[int, int, date], int] = {}
        self._snapshot_buffer: Dict[Tuple[int, date], int] = {}
        self._hourly_buffer: Dict[Tuple[int, int, int], int] = {}

        self._lock = asyncio.Lock()
        self._flush_lock = asyncio.Lock()
        self._stop_event = asyncio.Event()
        self._size_flush_task: asyncio.Task | None = None
        self._flush_task: asyncio.Task | None = None
        self._running: bool = False

    def start(self) -> None:
        """Starts the periodic background flush task if not already running."""
        if not self._running:
            self._running = True
            self._stop_event.clear()
            self._flush_task = asyncio.create_task(self._flush_loop(), name="analytics_batcher_flush")

    async def stop(self) -> None:
        """Stops the periodic loop and executes a final flush."""
        self._running = False
        self._stop_event.set()
        # Let in-flight database writes complete before closing the connection.
        if self._flush_task:
            await self._flush_task
        if self._size_flush_task:
            await self._size_flush_task
        await self.flush()

    async def add_message(
        self,
        guild_id: int,
        user_id: int,
        channel_id: int,
        created_at: datetime | None = None,
    ) -> None:
        """Enqueues message activity into the in-memory buffer."""
        now = created_at or datetime.now(timezone.utc)
        today = now.date()
        dow = now.weekday()
        hod = now.hour

        async with self._lock:
            # 1. User Buffer
            user_key = (guild_id, user_id)
            current_count, last_active = self._user_buffer.get(user_key, (0, now))
            self._user_buffer[user_key] = (current_count + 1, max(last_active, now))

            # 2. Channel Buffer
            channel_key = (guild_id, channel_id, today)
            self._channel_buffer[channel_key] = self._channel_buffer.get(channel_key, 0) + 1

            # 3. Snapshot Buffer
            snapshot_key = (guild_id, today)
            self._snapshot_buffer[snapshot_key] = self._snapshot_buffer.get(snapshot_key, 0) + 1

            # 4. Hourly Buffer
            hourly_key = (guild_id, dow, hod)
            self._hourly_buffer[hourly_key] = self._hourly_buffer.get(hourly_key, 0) + 1

            total_buffered = (
                len(self._user_buffer)
                + len(self._channel_buffer)
                + len(self._snapshot_buffer)
                + len(self._hourly_buffer)
            )

        if total_buffered >= self.max_buffer_size and (
            self._size_flush_task is None or self._size_flush_task.done()
        ):
            self._size_flush_task = asyncio.create_task(self.flush())

    async def flush(self) -> None:
        async with self._flush_lock:
            await self._flush_pending()

    async def _flush_pending(self) -> None:
        """Drains buffered metrics and commits them to the database."""
        async with self._lock:
            if not self._user_buffer and not self._channel_buffer and not self._snapshot_buffer and not self._hourly_buffer:
                return

            user_items = self._user_buffer
            channel_items = self._channel_buffer
            snapshot_items = self._snapshot_buffer
            hourly_items = self._hourly_buffer

            self._user_buffer = {}
            self._channel_buffer = {}
            self._snapshot_buffer = {}
            self._hourly_buffer = {}

        try:
            # 1. Flush User / MemberAnalytics
            for (guild_id, user_id), (count, last_active_at) in user_items.items():
                try:
                    await ensure_guild_and_user(guild_id, user_id)
                    record, created = await MemberAnalytics.get_or_create(
                        guild_id=guild_id,
                        user_id=user_id,
                        defaults={
                            "joined_at": last_active_at,
                            "total_messages": count,
                            "weekly_messages": count,
                            "last_active_at": last_active_at,
                        },
                    )
                    if not created:
                        await MemberAnalytics.filter(id=record.id).update(
                            total_messages=F("total_messages") + count,
                            weekly_messages=F("weekly_messages") + count,
                            last_active_at=last_active_at,
                        )
                except Exception as e:
                    key = (guild_id, user_id)
                    buffered_count, buffered_at = self._user_buffer.get(key, (0, last_active_at))
                    self._user_buffer[key] = (buffered_count + count, max(buffered_at, last_active_at))
                    logger.exception("Failed to flush member analytics for guild=%s user=%s: %s", guild_id, user_id, e)

            # 2. Flush DailyActivitySnapshot
            for (guild_id, s_date), count in snapshot_items.items():
                try:
                    snapshot, created = await DailyActivitySnapshot.get_or_create(
                        guild_id=guild_id,
                        date=s_date,
                        defaults={"total_messages": count},
                    )
                    if not created:
                        await DailyActivitySnapshot.filter(id=snapshot.id).update(
                            total_messages=F("total_messages") + count,
                        )
                except Exception as e:
                    key = (guild_id, s_date)
                    self._snapshot_buffer[key] = self._snapshot_buffer.get(key, 0) + count
                    logger.exception("Failed to flush daily snapshot for guild=%s date=%s: %s", guild_id, s_date, e)

            # 3. Flush ChannelActivity
            for (guild_id, channel_id, c_date), count in channel_items.items():
                try:
                    ch_activity, created = await ChannelActivity.get_or_create(
                        guild_id=guild_id,
                        channel_id=channel_id,
                        date=c_date,
                        defaults={"message_count": count},
                    )
                    if not created:
                        await ChannelActivity.filter(id=ch_activity.id).update(
                            message_count=F("message_count") + count,
                        )
                except Exception as e:
                    key = (guild_id, channel_id, c_date)
                    self._channel_buffer[key] = self._channel_buffer.get(key, 0) + count
                    logger.exception("Failed to flush channel activity for channel=%s: %s", channel_id, e)

            # 4. Flush HourlyActivity
            for (guild_id, dow, hod), count in hourly_items.items():
                try:
                    hourly, created = await HourlyActivity.get_or_create(
                        guild_id=guild_id,
                        day_of_week=dow,
                        hour_of_day=hod,
                        defaults={"message_count": count},
                    )
                    if not created:
                        await HourlyActivity.filter(id=hourly.id).update(
                            message_count=F("message_count") + count,
                        )
                except Exception as e:
                    key = (guild_id, dow, hod)
                    self._hourly_buffer[key] = self._hourly_buffer.get(key, 0) + count
                    logger.exception("Failed to flush hourly activity for guild=%s dow=%s hod=%s: %s", guild_id, dow, hod, e)

        except Exception as e:
            logger.exception("Unexpected error during analytics batch flush: %s", e)

    async def _flush_loop(self) -> None:
        while self._running:
            try:
                try:
                    await asyncio.wait_for(self._stop_event.wait(), timeout=self.flush_interval)
                except TimeoutError:
                    await self.flush()
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.exception("Error in analytics batcher loop: %s", e)


ANALYTICS_BATCHER = AnalyticsBatcher()
