import 'reflect-metadata';
import { Field, ObjectType } from 'type-graphql';
import type caselistModule from 'app/modules/caselist';
import { QueueDataType } from 'app/lib';
import { CaselistBase, SchoolBase, TeamBase } from '../caselist';

@ObjectType()
export class OpenevTask implements QueueDataType<typeof caselistModule['openevQueue']> {
  @Field()
  name: string;

  @Field()
  path: string;

  @Field()
  year: number;

  @Field()
  camp: string;

  @Field()
  lab: string;

  @Field()
  tags: string;
}

@ObjectType()
export class CaselistTask extends CaselistBase implements QueueDataType<typeof caselistModule['caselistQueue']> {
  @Field()
  archived: boolean;
}

@ObjectType()
class TaskSchoolInfo extends SchoolBase {
  @Field()
  caselistId: number;

  @Field()
  archived: true;
}

@ObjectType()
export class SchoolTask implements QueueDataType<typeof caselistModule['schoolQueue']> {
  @Field((type) => CaselistTask)
  caselist: CaselistTask;

  @Field((type) => TaskSchoolInfo)
  school: TaskSchoolInfo;
}

@ObjectType()
class TaskTeamInfo extends TeamBase {
  @Field()
  schoolId: number;

  @Field()
  archived: true;
}

@ObjectType()
export class TeamTask extends SchoolTask implements QueueDataType<typeof caselistModule['teamQueue']> {
  @Field((type) => TaskTeamInfo)
  team: TaskTeamInfo;
}

@ObjectType()
class TagArgs {
  @Field()
  name: string;

  @Field()
  label: string;
}

@ObjectType()
export class OpensourceTask implements QueueDataType<typeof caselistModule['opensourceQueue']> {
  @Field()
  id: number;

  @Field()
  filePath: string;

  @Field((type) => [TagArgs])
  tags: TagArgs[];
}

@ObjectType()
export class UpdateTask extends CaselistTask implements QueueDataType<typeof caselistModule['updateQueue']> {}
