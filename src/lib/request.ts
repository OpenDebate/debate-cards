import axios from 'axios';
import { mkdir, writeFile } from 'fs/promises';
import { Agent } from 'https';
import { dirname } from 'path';
import { PriorityQueue } from 'typescript-collections';
import { z } from 'zod';

// Minimum wait between requests in ms
const minWait = 0;

// Only allow 1 request per domain
const requester = axios.create({
  httpsAgent: new Agent({ maxSockets: 1 }),
});

export interface Request<T extends z.ZodTypeAny> {
  url: string;
  filePath?: string; // For downloads
  schema: T;
  status: 'PENDING' | 'PROCESSING' | 'PROCESSED' | 'ERROR';
  callback: (data: z.infer<T> | { err: RequestError }) => void;
}
// Proritize downloads, gets casted to 1 if has filePath, 0 if dosent
export const requestQueue = new PriorityQueue<Request<z.ZodTypeAny>>((a, b) => +('filePath' in a) - +('filePath' in b));
export interface RequestError {
  retry: boolean;
  message?: string;
  status?: number;
}

const sendRequest = async <T extends z.ZodTypeAny>(
  request: Request<T>,
): Promise<{ request: Request<T>; err: RequestError | null; response: z.infer<T> | null }> => {
  let err = null,
    response = null;
  try {
    response = await requester.get(
      request.url,
      // If download or normal request
      request.filePath ? { responseType: 'arraybuffer' } : { params: { media: 'json' } },
    );
    response = request.schema.parse(response.data);
  } catch (e) {
    if (e.isAxiosError) {
      const status = e.response?.status;
      if (!e.response) err = { message: `Could not connect to ${request.url}`, retry: true };
      else if (status === 401) err = { message: `Request to ${request.url} unauthorized`, retry: true };
      else if (status === 404) err = { retry: false };
      else if (status === 429) err = { message: `Request to ${request.url} rate limited`, retry: true };
      else if (status === 500) err = { message: `Server error on ${request.url}`, retry: false };
      else if (status === 503) err = { message: `${request.url} unavailable`, retry: true };
      else err = { message: `${request.url} ${e.toString()}`, retry: true };
      if (status) err.status = status;
    } else err = e;
  }
  return { err, request, response };
};

export const wikiRequest = <T extends z.ZodTypeAny>(
  url: string,
  schema: T = z.any() as any,
): Promise<z.infer<T> | { err: RequestError }> =>
  new Promise((resolve) => requestQueue.enqueue({ url, schema, status: 'PENDING', callback: resolve }));

export const wikiDownload = async (url: string, filePath: string): Promise<Uint8Array | { err: RequestError }> => {
  if (!url.includes('.docx')) return { err: { message: 'Not docx', retry: false } };
  const data = await new Promise((resolve: (value: Uint8Array | { err: RequestError }) => void) =>
    requestQueue.enqueue({ url, filePath, schema: z.any(), status: 'PENDING', callback: resolve }),
  );
  if (!('err' in data)) {
    await mkdir(dirname(filePath), { recursive: true });
    await writeFile(filePath, data);
  }
  return data;
};

const drain = async () => {
  if (!requestQueue.size()) return setTimeout(drain, 1000);
  try {
    const r = requestQueue.dequeue();
    r.status = 'PROCESSING';
    const { err, request, response } = await sendRequest(r);
    if (err) {
      request.status = err.retry ? 'ERROR' : 'PROCESSED';
      return err.retry ? requestQueue.enqueue(request) : request.callback({ err });
    }
    request.status = 'PROCESSED';
    request.callback(request.filePath ? new Uint8Array(response) : response);
  } catch (e) {
    console.error(e);
  } finally {
    setTimeout(drain, minWait);
  }
};
// Requests limted to one at a time, so concurency not that important
drain();
drain();
