import type { ActionResponses, QueueName, QueueRequestData } from '.';

const ipcRequest = (socket: any, message: any, timeout?: number) =>
  new Promise<any>((resolve, reject) => {
    let resolved = false;
    socket.send(message, (reply) => {
      resolved = true;
      if (reply?.err) reject(new Error(reply.err));
      else resolve(reply);
    });
    // socket.send adds id field to callback
    const resolveCallback = resolve as typeof resolve & { id: string };

    if (timeout) {
      setTimeout(() => {
        if (resolved) return;
        reject(new Error('Unable to connect to task runner'));
        delete socket.callbacks[resolveCallback.id];
      }, timeout);
    }
  });

export const queueRequest = <N extends QueueName, A extends keyof ActionResponses<N>>(
  socket: any,
  message: QueueRequestData<N, A>,
  timeout: number = 5000,
): Promise<ActionResponses<N>[A]> => {
  return ipcRequest(socket, message, timeout);
};
