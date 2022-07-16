import 'reflect-metadata';
import { Caselist, School, Team, Round, Cite } from '../models';
import { createGetResolver } from '.';
import { Resolver } from 'type-graphql';

const CaselistGetResolver = createGetResolver('caselist', Caselist);
@Resolver()
class CaselistResolver extends CaselistGetResolver {}

const SchoolGetResolver = createGetResolver('school', School);
@Resolver()
class SchoolResolver extends SchoolGetResolver {}

const TeamGetResolver = createGetResolver('team', Team);
@Resolver()
class TeamResolver extends TeamGetResolver {}

const RoundGetResolver = createGetResolver('round', Round);
@Resolver()
class RoundResolver extends RoundGetResolver {}

const CiteGetResolver = createGetResolver('cite', Cite);
@Resolver()
class CiteResolver extends CiteGetResolver {}

export const caselistResolvers = [CaselistResolver, SchoolResolver, TeamResolver, RoundResolver, CiteResolver];
