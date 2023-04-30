import { UserTypes } from "../constants/user";

export default class User {}

export interface UserData extends PublicUserData {
  password?: string;
}

export interface PublicUserData {
  id: string;
  firstname: string;
  lastname: string;
  fullName: string;
  email: string;
  type: UserTypes;
  verifiedAt?: Date;
  lastLoginAt?: Date;
}

export interface UserStoreParams {
  firstname: string;
  lastname: string;
  email: string;
  password: string;
  type: UserTypes;
  verifiedAt?: Date;
  lastLoginAt?: Date;
}

export interface UserDB {
  store(input: UserStoreParams): Promise<UserData>;
}
