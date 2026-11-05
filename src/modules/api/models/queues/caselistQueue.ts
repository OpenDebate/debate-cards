import 'reflect-metadata';
import { Field, ObjectType } from 'type-graphql';
import { CaselistBase, SchoolBase, TeamBase } from '../caselist';

@ObjectType()
export class OpenevTask {
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
export class CaselistTask extends CaselistBase {
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
export class SchoolTask {
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
export class TeamTask extends SchoolTask {
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
export class OpensourceTask {
  @Field()
  id: number;

  @Field()
  filePath: string;

  @Field((type) => [TagArgs])
  tags: TagArgs[];
}

@ObjectType()
export class UpdateTask extends CaselistTask {}
