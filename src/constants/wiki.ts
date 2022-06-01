import { z } from 'zod';

// Regex to get year from wiki name like hspolicy21
export const WIKI_NAME_REGEX = /^(?<type>[a-z]+)(?<year>\d+)?$/;
export const WIKITYPES = {
  hspolicy: 'High School Policy',
  hsld: 'High School LD',
  hspf: 'High School PF',
  opencaselist: 'College Policy',
  openev: 'Open Evidence',
  nfald: 'College LD',
} as const;

/*
  Types for wiki api
  Base Xwiki schema defined here https://github.com/xwiki/xwiki-platform/blob/master/xwiki-platform-core/xwiki-platform-rest/xwiki-platform-rest-model/src/main/resources/xwiki.rest.model.xsd
*/
const links = z.array(
  z.object({
    href: z.string().url(),
    rel: z.string(),
    type: z.string().nullable(),
    hrefLang: z.null().nullable(),
  }),
);
const summary = {
  links,
  id: z.string(),
  guid: z.string(),
  pageId: z.string(),
  pageVersion: z.string(),
  wiki: z.string(),
  space: z.string(),
  pageName: z.string(),
  pageAuthor: z.string(),
  pageAuthorName: z.string().nullable(),
  className: z.string(),
  number: z.number(),
  headline: z.string().nullable(),
};

export const OBJECT_SUMMARIES = z.object({
  links,
  objectSummaries: z.array(z.object(summary)),
});

export const SPACES = z.object({
  links,
  spaces: z.array(
    z.object({
      links,
      id: z.string(),
      wiki: z.string(),
      name: z.string(),
      home: z.string(),
      xwikiRelativeUrl: z.string(),
      xwikiAbsoluteUrl: z.string().url(),
    }),
  ),
});

export const WIKIS = z.object({
  links,
  wikis: z.array(
    z.object({
      links,
      id: z.string(),
      name: z.string(),
      description: z.string().nullable(),
      owner: z.string().nullable(),
    }),
  ),
});

export const ATTACHMENTS = z.object({
  links,
  attachments: z.array(
    z.object({
      links,
      id: z.string(),
      name: z.string(),
      size: z.number(),
      longSize: z.number(),
      version: z.string(),
      pageId: z.string(),
      pageVersion: z.string(),
      mimeType: z.string(),
      author: z.string(),
      authorName: z.string().nullable(),
      date: z.number(),
      xwikiRelativeUrl: z.string(),
      xwikiAbsoluteUrl: z.string().url(),
      hierarchy: z.object({
        items: z.array(z.object({ label: z.string(), name: z.string(), type: z.string(), url: z.string().url() })),
      }),
    }),
  ),
});

const property = <T extends string>(name: T) =>
  z.object({
    links,
    name: z.literal(name),
    value: z.string(),
    type: z.string(),
  });

// Info about specific objects found by querying https://openev.debatecoaches.org/rest/wikis/hspolicy21/classes/classname
export const ROUND = z.object({
  ...summary,
  // Using .map messes up types
  properties: z.tuple([
    property('Cites'),
    property('EntryDate'),
    property('Judge'),
    property('OpenSource'),
    property('Opponent'),
    property('Round'),
    property('RoundID'),
    property('RoundReport'),
    property('Tags'),
    property('Tournament'),
    property('Video'),
  ]),
});
export const CITE = property('Cites');
