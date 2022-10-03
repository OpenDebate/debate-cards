import 'reflect-metadata';
import { Ctx, Field, ID, Mutation, ObjectType, Query, Resolver } from 'type-graphql';
import * as jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';

@ObjectType()
class AuthInfo {
  @Field((type) => ID)
  token: string;
}

@ObjectType()
class UserInfo {
  @Field((type) => ID)
  uid: string;
}

@Resolver()
export class AuthResolver {
  @Mutation((returns) => AuthInfo)
  async login(): Promise<AuthInfo> {
    const info: UserInfo = { uid: randomUUID() };
    return { token: jwt.sign(info, process.env.JWT_SECRET) };
  }

  @Query((returns) => UserInfo, { nullable: true })
  async userInfo(@Ctx() context: any): Promise<UserInfo> {
    return context.auth;
  }
}
