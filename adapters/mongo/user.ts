import { UserData, UserDB, UserStoreParams } from "../../utilities/user";
import UserModel from "../../database/models/user";

export default class MongoUser implements UserDB {
  async store(input: UserStoreParams): Promise<UserData> {
    const doc = await UserModel.create(input);
    return doc.toUser();
  }
}
