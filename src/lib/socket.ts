export const ipcRequest = <T>({
  socket,
  message,
  timeout,
}: {
  socket: any;
  message: any[];
  timeout?: number;
}): Promise<T> =>
  new Promise((resolve, reject) => {
    let resolved = false;
    socket.send(...message, (data) => {
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
