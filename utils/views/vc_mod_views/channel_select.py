import discord


class VCChannelSelect(
        discord.ui.ChannelSelect, ):

    def __init__(
        self,
        callback_func,
    ):
        super().__init__(
            placeholder="Select a voice channel...",
            min_values=1,
            max_values=1,
            channel_types=[
                discord.ChannelType.voice,
            ],
        )
        self.callback_func = callback_func

    async def callback(
        self,
        interaction: discord.Interaction,
    ):
        channel = self.values[0]
        await self.callback_func(
            interaction,
            channel,
        )
