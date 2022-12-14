import { Server, Socket } from 'socket.io';

import { ClientToServerEvents as C, ServerToClientEvents as S } from '../config/socketTypes';
import Channel from '../models/channelModel';

export default function channelController(io: Server<C, S>, socket: Socket) {
  async function getChannel(channelCode: string = '/', channelPassword: string = '') {
    channelCode = channelCode.trim() || '/';
    channelPassword = channelPassword.trim();

    const channel = await Channel.findOne({ code: channelCode });
    if (!channel) {
      const newChannel = await Channel.create({
        code: channelCode,
        password: channelPassword,
        headline: `Welcome to :${channelCode}!`,
      });

      socket.emit('channel', newChannel);
      socket.join(channelCode);
      return;
    }

    if (channel.password !== channelPassword) {
      socket.emit('error', {
        type: 'password',
        message: 'Incorrect password',
      });
      return;
    }

    socket.emit('channel', channel);
    socket.join(channelCode);
  }

  async function updateChannel(channelCode: string = '/', newHeadline: string = '') {
    channelCode = channelCode.trim() || '/';
    newHeadline = newHeadline.trim();

    const channel = await Channel.findOneAndUpdate(
      { code: channelCode },
      {
        headline: newHeadline,
        $inc: { taps: 1 },
      },
      { new: true },
    );
    if (!channel) {
      socket.emit('error', {
        type: 'channel',
        message: 'Channel not found',
      });
      return;
    }

    io.to(channel.code).emit('channel', channel);
  }

  socket.on('channel/get', getChannel);

  socket.on('channel/update', updateChannel);
}
