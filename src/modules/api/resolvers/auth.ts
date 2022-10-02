import 'reflect-metadata';
import { Field, ID, Mutation, ObjectType, Resolver } from 'type-graphql';
import * as jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';

@ObjectType()
class AuthInfo {
  @Field((type) => ID)
  token: string;
}

@Resolver()
export class AuthResolver {
  @Mutation((returns) => AuthInfo)
  async login(): Promise<AuthInfo> {
    return { token: jwt.sign({ uid: randomUUID() }, process.env.JWT_SECRET) };
  }
}
