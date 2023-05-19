import { UserData, UserDB, UserStoreParams } from "../../utilities/user";
import UserModel from "../../database/models/user";
import { ERROR_NOT_FOUND } from "../../constants/errors";

export default class MongoUser implements UserDB {
  async find(id: string, provider?: string): Promise<UserData> {
    let filter: Record<string, any> = {$or: [{_id: id}, {email: id}]};
    if (provider) {
      filter = {[provider+"AccountId"]: id}
    }

    const doc = await UserModel.findOne(filter)
    if (!doc) throw ERROR_NOT_FOUND
    return doc.toUser();
  }
  async store(input: UserStoreParams): Promise<UserData> {
    const doc = await UserModel.create(input);
    return doc.toUser();
  }
}
