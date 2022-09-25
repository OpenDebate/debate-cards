import 'reflect-metadata';
import { Caselist, School, Team, Round, Cite } from '../models';
import { createGetResolver } from '.';
import { Args, Info, Query, Resolver } from 'type-graphql';
import { selectFields } from 'app/lib/graphql';
import { db } from 'app/lib/db';
import { GraphQLResolveInfo } from 'graphql';
import { CaselistInput, SchoolInput, TeamInput } from '../inputs';

const CaselistGetResolver = createGetResolver('caselist', Caselist);
@Resolver()
class CaselistResolver extends CaselistGetResolver {
  @Query((returns) => Caselist, { nullable: true })
  async caselistByName(
    @Args() { caselist }: CaselistInput,
    @Info() info: GraphQLResolveInfo,
  ): Promise<Partial<Caselist>> {
    return db.caselist.findUnique({ where: { name: caselist }, select: selectFields(info) });
  }
}

const SchoolGetResolver = createGetResolver('school', School);
@Resolver()
class SchoolResolver extends SchoolGetResolver {
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

const TeamGetResolver = createGetResolver('team', Team);
@Resolver()
class TeamResolver extends TeamGetResolver {
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

const RoundGetResolver = createGetResolver('round', Round);
@Resolver()
class RoundResolver extends RoundGetResolver {}

const CiteGetResolver = createGetResolver('cite', Cite);
@Resolver()
class CiteResolver extends CiteGetResolver {}

export const caselistResolvers = [CaselistResolver, SchoolResolver, TeamResolver, RoundResolver, CiteResolver];
