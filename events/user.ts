import { PublicUserData, UserData } from "../utilities/user";

export type User = {
  email: string;
  firstname: string;
  lastname: string;
  fullName: string;
};

export class SendPin {
  constructor(user: User, pin: string) {
    this.user = user;
    this.pin = pin;
  }

  readonly user: User;
  readonly pin: string;
}

export class UserCreated {
  readonly user: PublicUserData;

  constructor(user: PublicUserData) {
    this.user = user;
  }
}
