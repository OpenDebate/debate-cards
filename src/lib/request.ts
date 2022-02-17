import axios, { AxiosResponse } from 'axios';
import { mkdir, writeFile } from 'fs/promises';
import { Agent } from 'https';
import { dirname } from 'path';
import { Queue } from 'typescript-collections';

// Minimum wait between requests in ms
const minWait = 0;

// Only allow 1 request per domain
const requester = axios.create({
  httpsAgent: new Agent({ maxSockets: 1 }),
});

export interface Request {
  url: string;
  filePath?: string; // For downloads
  status: 'PENDING' | 'PROCESSING' | 'PROCESSED' | 'ERROR';
  callback: (data: any) => void;
}

export const requestQueue = new Queue<Request>();
export interface RequestError {
  message?: string;
  retry: boolean;
  status?: number;
}

const sendRequest = async (
  request: Request,
): Promise<{ err: RequestError | null; request: Request; response: AxiosResponse | null }> => {
  let err = null,
    response = null;
  try {
    // If download or normal request
    if (request.filePath) {
      const res = await requester.get(request.url, { responseType: 'arraybuffer' });
      if (!res.data.length) throw { message: `${request.url} gave empty response`, retry: false };

      response = res;
    } else {
      response = await requester.get(request.url, { params: { media: 'json' } });
    }
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

export const wikiRequest = (url: string): Promise<any> =>
  new Promise((resolve) => requestQueue.enqueue({ url, status: 'PENDING', callback: resolve }));

export const wikiDowload = async (url: string, filePath: string): Promise<Uint8Array | { err: RequestError }> => {
  if (!url.includes('.docx')) return { err: { message: 'Not docx', retry: false } };
  let data = await new Promise((resolve: (value: Uint8Array | { err: RequestError }) => void) =>
    requestQueue.enqueue({ url, filePath, status: 'PENDING', callback: resolve }),
  );
  if (!data.hasOwnProperty('err')) {
    await mkdir(dirname(filePath), { recursive: true });
    await writeFile(filePath, data as Uint8Array);
  }
  return data;
};

const drain = async () => {
  if (requestQueue.size()) {
    const r = requestQueue.dequeue();
    r.status = 'PROCESSING';
    sendRequest(r).then(({ err, request, response }) => {
      if (err) {
        request.status = err.retry ? 'ERROR' : 'PROCESSED';
        return err.retry ? requestQueue.enqueue(request) : request.callback({ err });
      }
      request.status = 'PROCESSED';
      request.callback(request.filePath ? new Uint8Array(response.data) : response.data);
    });
    setTimeout(drain, minWait);
  } else setTimeout(drain, 1000);
};
drain();
