export const WIKI_NAME_REGEX = /^(?<type>[a-z]+)(?<year>\d+)?$/;
export const WIKITYPES = {
  hspolicy: 'High School Policy',
  hsld: 'High School LD',
  hspf: 'High School PF',
  opencaselist: 'College Policy',
  openev: 'Open Evidence',
  nfald: 'College LD',
} as const;
