import 'reflect-metadata';
import { Arg, Ctx, Field, ID, Mutation, ObjectType, Query, Resolver } from 'type-graphql';
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

  @Field()
  admin: boolean;
}

@Resolver()
export class AuthResolver {
  @Mutation((returns) => AuthInfo)
  async login(@Arg('password', { nullable: true }) password?: string): Promise<AuthInfo> {
    const info: UserInfo = {
      uid: randomUUID(),
      admin: !!process.env.ADMIN_PASSWORD && process.env.ADMIN_PASSWORD === password,
    };
    return { token: jwt.sign(info, process.env.JWT_SECRET) };
  }

  @Query((returns) => UserInfo, { nullable: true })
  async userInfo(@Ctx() context: any): Promise<UserInfo> {
    return context.auth;
  }
}
