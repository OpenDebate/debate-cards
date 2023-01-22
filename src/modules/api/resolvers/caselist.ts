import 'reflect-metadata';
import { Caselist, School, Team, Round, Cite } from '../models';
import { createGetResolver } from '.';
import { Args, Info, Query, Resolver } from 'type-graphql';
import { selectFields } from 'app/lib/graphql';
import { db } from 'app/lib/db';
import { GraphQLResolveInfo } from 'graphql';
import { CaselistInput, CiteSearchInput, SchoolInput, TeamInput } from '../inputs';
import { elastic } from 'app/lib/elastic';
import { flatMap } from 'lodash';

@Resolver(Caselist)
class CaselistResolver extends createGetResolver('caselist', Caselist, [
  { name: 'schools', paginate: true, defaultLength: 50 },
]) {
  @Query((returns) => Caselist, { nullable: true })
  async caselistByName(
    @Args() { caselist }: CaselistInput,
    @Info() info: GraphQLResolveInfo,
  ): Promise<Partial<Caselist>> {
    return db.caselist.findUnique({ where: { name: caselist }, select: selectFields(info) });
  }
}

@Resolver(School)
class SchoolResolver extends createGetResolver('school', School, [
  { name: 'teams', paginate: true, defaultLength: 10 },
  { name: 'caselist' },
]) {
  @Query((returns) => School, { nullable: true })
  async schoolByName(
    @Args() { caselist, school }: SchoolInput,
    @Info() info: GraphQLResolveInfo,
  ): Promise<Partial<School>> {
    return db.school.findFirst({
      where: { name: school, caselist: { name: caselist } },
      select: selectFields(info),
    });
  }
}

@Resolver(Team)
class TeamResolver extends createGetResolver('team', Team, [
  { name: 'rounds', paginate: true, defaultLength: 20 },
  { name: 'school' },
]) {
  @Query((returns) => Team, { nullable: true })
  async teamByName(
    @Args() { caselist, school, team }: TeamInput,
    @Info() info: GraphQLResolveInfo,
  ): Promise<Partial<Team>> {
    return db.team.findFirst({
      where: { name: team, school: { name: school, caselist: { name: caselist } } },
      select: selectFields(info),
    });
  }
}

@Resolver(Round)
class RoundResolver extends createGetResolver('round', Round, [
  { name: 'cites', paginate: true, defaultLength: 3 },
  { name: 'team' },
  { name: 'opensource' },
]) {}

@Resolver(Cite)
class CiteResolver extends createGetResolver('cite', Cite, [{ name: 'round' }]) {
  @Query((returns) => [Cite], { complexity: ({ args, childComplexity }) => 1000 + args.take * childComplexity })
  async searchCites(@Args() { query, skip, take }: CiteSearchInput, @Info() info: GraphQLResolveInfo) {
    const results = await elastic.search({
      index: 'cites',
      size: take,
      from: skip,
      query: {
        query_string: {
          query,
          fields: ['cites'],
        },
      },
      _source: false,
      docvalue_fields: ['id'],
    });
    console.log(results.hits.hits);
    const ids: number[] = flatMap(results.hits.hits, 'fields.id');
    const cites = await db.cite.findMany({ where: { id: { in: ids } }, select: selectFields(info) });
    // Resort results based on ranking
    return cites.sort((a: { id: number }, b: { id: number }) => ids.indexOf(a.id) - ids.indexOf(b.id));
  }
}

export const caselistResolvers = [CaselistResolver, SchoolResolver, TeamResolver, RoundResolver, CiteResolver];
