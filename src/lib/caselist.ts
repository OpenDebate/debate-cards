import { Queue } from 'typescript-collections';
import { DefaultApi, DefaultApiApiKeys } from 'app/constants/caselist/api';
import { REQUEST_WAIT } from 'app/constants';
import { omit } from 'lodash';

export const caselistApi = new DefaultApi('https://api.opencaselist.com/v1');
caselistApi.setApiKey(DefaultApiApiKeys.cookie, process.env.CASELIST_TOKEN);

// Every REQUEST_WAIT milliseconds, allow a request through
const requestQueue = new Queue<{ resolve: () => void }>();
setInterval(() => requestQueue.dequeue()?.resolve(), REQUEST_WAIT);
caselistApi.addInterceptor(() => new Promise((resolve) => requestQueue.enqueue({ resolve })));

// This is pretty overcomplicated so types work, but repeating the same code over and over bothered me

// Removes Id at the end of string literal type
type RemoveId<T extends string | symbol> = T extends `${infer U}Id` ? U : T;
// Takes data that includes id of parent and transform it to prisma style connect field
type Connected<T extends Record<string, any>, K extends keyof T & `${string}Id`> = Omit<T, K> & {
  [_ in RemoveId<K>]: { connect: { [_ in K]: T[K] } };
};
const idFieldToConnect = <T extends Record<string, any>, K extends keyof T & `${string}Id`>(data: T, idKey: K) => {
  const key = idKey.slice(0, -2) as RemoveId<K>;
  const connectData = { [key]: { connect: { [idKey]: data[idKey] } } };
  return {
    ...omit(data, idKey),
    ...connectData,
  } as Connected<T, K>;
};
// Convert 0/1 returned by api into false/true
const fixBoolean = <T extends Record<string, any>, K extends string>(data: T, field: K) => ({
  ...data,
  [field]: Boolean(data[field]),
});

// Overloads for version with and without parent
type UpsertData<T extends Record<string, any>, P extends keyof T> = { where: { [_ in P]: T[P] }; create: T; update: T };
export function caselistToPrisma<
  T extends Record<string, any>,
  P extends Exclude<keyof T, S>,
  S extends keyof T & `${string}Id`,
>(data: T, primaryId: P, parentId: S): UpsertData<Connected<T, S>, P>;
export function caselistToPrisma<T extends Record<string, any>, P extends keyof T>(data: T, id: P): UpsertData<T, P>;
export function caselistToPrisma<T extends Record<string, any>, P extends keyof T, S extends keyof T & `${string}Id`>(
  data: T,
  primaryId: P,
  parentId?: S,
): { where: { [_ in P]: T[P] }; create: Connected<T, S>; update: Connected<T, S> } {
  let fixed = parentId ? idFieldToConnect(data, parentId) : data;
  if ('archived' in fixed) fixed = fixBoolean(fixed, 'archived');
  return {
    where: { [primaryId]: data[primaryId] } as { [_ in P]: T[P] },
    create: { ...fixed },
    update: { ...fixed },
  };
}
