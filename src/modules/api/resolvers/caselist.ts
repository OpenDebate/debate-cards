import 'reflect-metadata';
import { Caselist, School, Team, Round, Cite } from '../models';
import { createGetResolver } from '.';
import { Args, Info, Query, Resolver } from 'type-graphql';
import { selectFields } from 'app/lib/graphql';
import { db } from 'app/lib/db';
import { GraphQLResolveInfo } from 'graphql';
import { CaselistInput, SchoolInput, TeamInput } from '../inputs';

@Resolver(Caselist)
class CaselistResolver extends createGetResolver('caselist', Caselist) {
  @Query((returns) => Caselist, { nullable: true })
  async caselistByName(
    @Args() { caselist }: CaselistInput,
    @Info() info: GraphQLResolveInfo,
  ): Promise<Partial<Caselist>> {
    return db.caselist.findUnique({ where: { name: caselist }, select: selectFields(info) });
  }
}

@Resolver(School)
class SchoolResolver extends createGetResolver('school', School) {
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
class TeamResolver extends createGetResolver('team', Team) {
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
class RoundResolver extends createGetResolver('round', Round) {}

@Resolver(Cite)
class CiteResolver extends createGetResolver('cite', Cite) {}

export const caselistResolvers = [CaselistResolver, SchoolResolver, TeamResolver, RoundResolver, CiteResolver];
