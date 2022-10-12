import type { QueueDataTypes, QueueName, QueueRequestData } from '.';

const ipcRequest = (socket: any, message: any, timeout?: number) =>
  new Promise<any>((resolve, reject) => {
    let resolved = false;
    socket.send(message, (data) => {
      resolved = true;
      if (data.err) reject(new Error(data.err));
      else resolve(data);
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

export const queueRequest = <Q extends QueueName>(
  socket: any,
  message: QueueRequestData<Q>,
): Promise<QueueDataTypes[Q][]> => {
  return ipcRequest(socket, message, 5000);
};
